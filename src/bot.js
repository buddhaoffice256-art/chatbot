const { blogPosts, contactInfo, products, siteLinks } = require("./catalog");

const MAIN_MENU_ROWS = [
  {
    id: "menu_products",
    title: "All products",
    description: "Browse main store and product links"
  },
  {
    id: "menu_featured",
    title: "Featured products",
    description: "See highlighted and popular items"
  },
  {
    id: "menu_contact",
    title: "Contact details",
    description: "Call, email, and address details"
  },
  {
    id: "menu_blog",
    title: "Blog links",
    description: "Read wellness articles and updates"
  },
  {
    id: "menu_product_name",
    title: "Search by product",
    description: "Send a product name like Shilajit"
  }
];

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, words) {
  const textWords = new Set(text.split(" "));
  return words.some((word) => {
    if (word.includes(" ")) {
      return text.includes(word);
    }
    return textWords.has(word);
  });
}

function formatProduct(product) {
  return `*${product.name}*\n${product.description}\n${product.url}`;
}

function buildTextResponse(body, intent = "text") {
  return {
    type: "text",
    body,
    intent
  };
}

function buildInteractiveListResponse(
  bodyText,
  footerText = "You can also type a product name directly.",
  intent = "menu"
) {
  const fallbackBody = [
    bodyText,
    "",
    "Options:",
    ...MAIN_MENU_ROWS.map((row, index) => `${index + 1}. ${row.title}`),
    "",
    footerText
  ].join("\n");

  return {
    type: "interactive",
    fallbackBody,
    intent,
    interactive: {
      type: "list",
      header: {
        type: "text",
        text: "Buddha Ayurveda"
      },
      body: {
        text: bodyText
      },
      footer: {
        text: footerText
      },
      action: {
        button: "View options",
        sections: [
          {
            title: "How can we help?",
            rows: MAIN_MENU_ROWS
          }
        ]
      }
    }
  };
}

function buildGreetingReply() {
  return buildInteractiveListResponse(
    [
      "Namaste from Buddha Ayurveda.",
      "Choose an option below to explore products, featured items, contact details, or blog links."
    ].join("\n"),
    "You can also type a product name directly.",
    "greeting"
  );
}

function buildCatalogReply() {
  const lines = [
    "Here are the main Buddha Ayurveda store links:",
    `${siteLinks.home}`,
    `${siteLinks.products}`,
    `${siteLinks.featured}`,
    "",
    "Available products:"
  ];

  for (const product of products) {
    lines.push(`- ${product.name}`);
    lines.push(product.url);
  }

  return buildTextResponse(lines.join("\n"));
}

function buildFeaturedReply() {
  return buildTextResponse([
    "Browse featured Buddha Ayurveda products here:",
    siteLinks.featured,
    "You can also ask for Shilajit, Chia Seeds, Ashwagandha, or Aafgani Chandi Bhasam by name."
  ].join("\n"));
}

function buildContactReply() {
  return buildTextResponse([
    "Contact Buddha Ayurveda:",
    `Phone: ${contactInfo.phonePrimary}`,
    `Alt Phone: ${contactInfo.phoneSecondary}`,
    `Email: ${contactInfo.email}`,
    `Address: ${contactInfo.address}`,
    `Contact page: ${siteLinks.contact}`
  ].join("\n"));
}

function buildBlogReply() {
  return buildTextResponse([
    "Read wellness articles and updates here:",
    siteLinks.blog,
    ...blogPosts
  ].join("\n"));
}

function buildProductNamePromptReply() {
  return buildTextResponse([
    "Please send a product name.",
    "Examples: Shilajit, Chia Seeds, Ashwagandha, or Aafgani Chandi Bhasam."
  ].join("\n"));
}

function buildFallbackReply() {
  return buildInteractiveListResponse(
    [
      "I can help with product links, featured products, contact details, and blog links.",
      "Choose an option below or type a product name like Shilajit or Chia Seeds."
    ].join("\n"),
    `Main catalog: ${siteLinks.products}`,
    "fallback"
  );
}

function findMatchingProducts(normalizedText) {
  return products.filter((product) => {
    const productName = normalizeText(product.name);
    if (normalizedText.includes(productName)) {
      return true;
    }

    return includesAny(normalizedText, product.keywords.map(normalizeText));
  });
}

function normalizeSelectionId(value) {
  const rawValue = (value || "").toString().trim().toLowerCase();
  const rawAsMenuKey = rawValue.replace(/\s+/g, "_");

  if (rawAsMenuKey === "menu_products"
    || rawAsMenuKey === "menu_featured"
    || rawAsMenuKey === "menu_contact"
    || rawAsMenuKey === "menu_blog"
    || rawAsMenuKey === "menu_product_name") {
    return rawAsMenuKey;
  }

  const normalizedText = normalizeText(value);

  if (normalizedText.includes("all products") || normalizedText.includes("product links")) {
    return "menu_products";
  }

  if (normalizedText.includes("featured products") || normalizedText.includes("featured items")) {
    return "menu_featured";
  }

  if (normalizedText.includes("contact details")) {
    return "menu_contact";
  }

  if (normalizedText.includes("blog links")) {
    return "menu_blog";
  }

  if (normalizedText.includes("search by product") || normalizedText.includes("product name")) {
    return "menu_product_name";
  }

  if (normalizedText === "1") {
    return "menu_products";
  }

  if (normalizedText === "2") {
    return "menu_featured";
  }

  if (normalizedText === "3") {
    return "menu_contact";
  }

  if (normalizedText === "4") {
    return "menu_blog";
  }

  if (normalizedText === "5") {
    return "menu_product_name";
  }

  return normalizedText;
}

function buildReply(messageText) {
  const normalizedText = normalizeText(messageText);
  const selectionId = normalizeSelectionId(messageText);

  if (!normalizedText) {
    return buildGreetingReply();
  }

  if (selectionId === "menu_products") {
    return buildCatalogReply();
  }

  if (selectionId === "menu_featured") {
    return buildFeaturedReply();
  }

  if (selectionId === "menu_contact") {
    return buildContactReply();
  }

  if (selectionId === "menu_blog") {
    return buildBlogReply();
  }

  if (selectionId === "menu_product_name") {
    return buildProductNamePromptReply();
  }

  if (includesAny(normalizedText, ["hi", "hello", "hey", "namaste", "start", "menu"])) {
    return buildGreetingReply();
  }

  if (includesAny(normalizedText, ["all products", "products", "catalog", "shop", "all url", "all urls", "product links"])) {
    return buildCatalogReply();
  }

  if (includesAny(normalizedText, ["featured", "popular", "best product", "best products"])) {
    return buildFeaturedReply();
  }

  if (includesAny(normalizedText, ["contact", "phone", "call", "email", "address", "support"])) {
    return buildContactReply();
  }

  if (includesAny(normalizedText, ["blog", "article", "articles", "tips", "wellness tips"])) {
    return buildBlogReply();
  }

  const matchedProducts = findMatchingProducts(normalizedText);
  if (matchedProducts.length > 0) {
    return buildTextResponse(matchedProducts.map(formatProduct).join("\n\n"));
  }

  return buildFallbackReply();
}

module.exports = {
  buildReply
};