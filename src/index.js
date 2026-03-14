const crypto = require("crypto");
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");

const { buildReply } = require("./bot");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3000);
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v22.0";
const APP_SECRET = process.env.APP_SECRET;
const PROCESSED_MESSAGE_TTL_MS = 15 * 60 * 1000;
const processedMessageIds = new Map();

app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = buffer;
  }
}));

function isSignatureValid(req) {
  if (!APP_SECRET) {
    return true;
  }

  const signature = req.get("x-hub-signature-256");
  if (!signature || !req.rawBody) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac("sha256", APP_SECRET).update(req.rawBody).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function sendWhatsAppMessage(to, reply) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to
  };

  if (reply.type === "interactive") {
    payload.type = "interactive";
    payload.interactive = reply.interactive;
  } else {
    payload.type = "text";
    payload.text = {
      body: reply.body,
      preview_url: true
    };
  }

  try {
    await axios.post(
      url,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        },
        timeout: 20000
      }
    );
  } catch (error) {
    if (reply.type === "interactive" && reply.fallbackBody) {
      await axios.post(
        url,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: {
            body: reply.fallbackBody,
            preview_url: true
          }
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          timeout: 20000
        }
      );
      return;
    }

    throw error;
  }
}

function getIncomingMessages(body) {
  return body.entry?.flatMap((entry) =>
    entry.changes?.flatMap((change) => change.value?.messages || []) || []
  ) || [];
}

function pruneProcessedMessageIds(now) {
  for (const [messageId, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > PROCESSED_MESSAGE_TTL_MS) {
      processedMessageIds.delete(messageId);
    }
  }
}

function isDuplicateMessage(messageId) {
  if (!messageId) {
    return false;
  }

  const now = Date.now();
  pruneProcessedMessageIds(now);

  return processedMessageIds.has(messageId);
}

function markMessageProcessed(messageId) {
  if (!messageId) {
    return;
  }

  pruneProcessedMessageIds(Date.now());
  processedMessageIds.set(messageId, Date.now());
}

function getMessageInput(message) {
  if (message.type === "text") {
    return message.text?.body || "";
  }

  if (message.type === "interactive") {
    return message.interactive?.list_reply?.id
      || message.interactive?.list_reply?.title
      || message.interactive?.button_reply?.id
      || message.interactive?.button_reply?.title
      || "";
  }

  return "";
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "webhook_chatbot",
    webhook: "/webhook"
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  if (!isSignatureValid(req)) {
    return res.status(403).json({ error: "Invalid signature" });
  }

  res.sendStatus(200);

  if (req.body.object !== "whatsapp_business_account") {
    return;
  }

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.error("Missing WhatsApp credentials in environment variables.");
    return;
  }

  const messages = getIncomingMessages(req.body);

  for (const message of messages) {
    if (isDuplicateMessage(message.id)) {
      console.log(`Skipping duplicate message ${message.id}`);
      continue;
    }

    if (!message.from) {
      continue;
    }

    const incomingInput = getMessageInput(message);

    if (!incomingInput) {
      try {
        await sendWhatsAppMessage(
          message.from,
          {
            type: "text",
            body: "Namaste from Buddha Ayurveda. Please send a text message or choose a menu option to continue."
          }
        );
        markMessageProcessed(message.id);
        console.log(`Sent non-text fallback to ${message.from}`);
      } catch (error) {
        const apiError = error.response?.data || error.message;
        console.error("Failed to send non-text fallback", apiError);
      }
      continue;
    }

    const reply = buildReply(incomingInput);

    try {
      await sendWhatsAppMessage(message.from, reply);
      markMessageProcessed(message.id);
      console.log(`Replied to ${message.from}`);
    } catch (error) {
      const apiError = error.response?.data || error.message;
      console.error("Failed to send WhatsApp message", apiError);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});