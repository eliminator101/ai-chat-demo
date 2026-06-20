const http = require("http");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Load API key from environment variable (recommended for deployment).
// For local testing, you can also set it here: const OPENROUTER_API_KEY = "YOUR_KEY";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const PORT = 8000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === "YOUR_OPENROUTER_API_KEY") {
  console.error("Error: OPENROUTER_API_KEY is not set.");
  console.error("Set it as an environment variable or edit server.js for local testing.");
  process.exit(1);
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyToOpenRouter(req, res) {
  const referer = req.headers.host
    ? `http://${req.headers.host}`
    : `http://localhost:${PORT}`;

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
          res.writeHead(proxyRes.statusCode, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(responseBody);
        });
      }
    );

    proxyReq.on("error", (err) => {
      res.writeHead(500, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.url === "/api/chat" && req.method === "POST") {
    proxyToOpenRouter(req, res);
    return;
  }

  // Serve static files
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, filePath);
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/index.html in your browser`);
});
