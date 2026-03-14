# WhatsApp Webhook Chatbot

This project is a Node.js webhook for the WhatsApp Business Cloud API. It verifies the Meta webhook, receives customer messages, and replies with Buddha Ayurveda product links, catalog links, blog links, and contact details.

## What it does

- Receives incoming WhatsApp messages from Meta Cloud API.
- Replies automatically when a customer sends a message first.
- Answers common requests like products, featured products, blog, and contact.
- Shares direct product URLs from your sitemap.

## Included links and products

Main links:

- https://www.buddhaayurveda.store
- https://www.buddhaayurveda.store/products
- https://www.buddhaayurveda.store/products/featured
- https://www.buddhaayurveda.store/blog
- https://www.buddhaayurveda.store/contact

Products currently mapped:

- BUDDHA YOGA SHUDH SHILAJIT 30gm
- Weight Gain + Ashwagandha Combo
- Sanjeevani Buti + Chia Seeds Combo
- Aafgani Chandi Bhasam

You can add more products later in `src/catalog.js`.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env
```

3. Fill these values in `.env`:

```env
PORT=3000
VERIFY_TOKEN=mytoken123
WHATSAPP_TOKEN=your_permanent_access_token
PHONE_NUMBER_ID=1042754282251910
GRAPH_API_VERSION=v22.0
APP_SECRET=
```

4. Run the server:

```bash
npm start
```

5. For local testing only, expose your port using a tunnel like ngrok or Cloudflare Tunnel.

Example callback URL:

```text
https://your-public-domain.com/webhook
```

## Meta webhook setup

In Meta Developers, open your WhatsApp app and go to WhatsApp > Configuration.

Use:

- Callback URL: `https://your-domain.com/webhook`
- Verify Token: the same value as `VERIFY_TOKEN`

Then subscribe to the `messages` field.

## Recommended hosting

### Option 1: Render

This is the simplest option for this project.

1. Push this folder to GitHub.
2. Create a new Web Service on Render.
3. Connect your GitHub repository.
4. Render will detect the `render.yaml` file.
5. Add environment variables:
   - `VERIFY_TOKEN`
   - `WHATSAPP_TOKEN`
   - `PHONE_NUMBER_ID`
   - `GRAPH_API_VERSION`
   - `APP_SECRET` optional
6. Deploy.
7. Copy your Render URL and set the Meta callback URL to:

```text
https://your-render-service.onrender.com/webhook
```

### Option 2: Railway

1. Push the code to GitHub.
2. Create a new project in Railway from the GitHub repo.
3. Add the same environment variables.
4. Deploy.
5. Use your Railway public URL plus `/webhook` in Meta.

### Option 3: VPS

If you already have a server:

1. Install Node.js 20+.
2. Run `npm install`.
3. Set environment variables.
4. Run with PM2:

```bash
npm install -g pm2
pm2 start src/index.js --name webhook-chatbot
```

5. Put Nginx in front with HTTPS.
6. Use `https://your-domain.com/webhook` in Meta.

## How customer chat works

1. Customer sends `hi` to your WhatsApp number.
2. WhatsApp sends the message to Meta Cloud API.
3. Meta sends the event to your `/webhook` endpoint.
4. Your bot builds a reply based on the message text.
5. Your server sends the reply through the Graph API.
6. Customer receives the response on WhatsApp.

## Example messages the bot handles

- `hi`
- `products`
- `all products`
- `featured`
- `contact`
- `blog`
- `shilajit`
- `chia seeds`
- `ashwagandha`

## Important notes

- Customers can message first and your bot can reply without adding a payment method, within Meta's allowed free conversation limits.
- Business-initiated conversations require billing setup in Meta.
- If you want AI answers later, this webhook can be extended to call OpenAI or your own product database.