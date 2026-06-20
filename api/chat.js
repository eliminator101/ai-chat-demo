const https = require("https");

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

module.exports = function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!OPENROUTER_API_KEY) {
    res.status(500).json({ error: "OPENROUTER_API_KEY is not set" });
    return;
  }

  const referer = req.headers.host
    ? `https://${req.headers.host}`
    : "https://localhost";

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const proxyReq = https.request(
      OPENROUTER_URL,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": referer,
          "X-Title": "AI Chat with OpenRouter",
        },
      },
      (proxyRes) => {
        let responseBody = "";
        proxyRes.on("data", (chunk) => (responseBody += chunk));
        proxyRes.on("end", () => {
          res.status(proxyRes.statusCode);
          res.setHeader("Content-Type", "application/json");
          res.send(responseBody);
        });
      }
    );

    proxyReq.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });

    proxyReq.write(body);
    proxyReq.end();
  });
};
