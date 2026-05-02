const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_FILE = path.join(ROOT_DIR, "data", "notebook-data.json");

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(message);
}

function ensureDataFile() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ posts: [], memories: [] }, null, 2));
  }
}

function sanitizeState(payload) {
  return {
    posts: Array.isArray(payload?.posts) ? payload.posts : [],
    memories: Array.isArray(payload?.memories) ? payload.memories : []
  };
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
    });

    request.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    request.on("error", reject);
  });
}

async function handleApi(request, response) {
  ensureDataFile();

  if (request.method === "GET") {
    try {
      const raw = await fs.promises.readFile(DATA_FILE, "utf8");
      const state = sanitizeState(JSON.parse(raw));
      return sendJson(response, 200, state);
    } catch (error) {
      return sendJson(response, 500, { error: "Could not read notebook data." });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await readRequestBody(request);
      const parsed = JSON.parse(body || "{}");
      const state = sanitizeState(parsed);
      await fs.promises.writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
      return sendJson(response, 200, { ok: true });
    } catch (error) {
      return sendJson(response, 400, { error: "Could not save notebook data." });
    }
  }

  return sendJson(response, 405, { error: "Method not allowed." });
}

function safeFilePath(urlPath) {
  const normalizedPath = urlPath === "/" ? "/index.html" : urlPath;
  const resolvedPath = path.normalize(path.join(ROOT_DIR, normalizedPath));
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    return null;
  }
  return resolvedPath;
}

async function handleStatic(request, response, pathname) {
  const filePath = safeFilePath(pathname);
  if (!filePath) {
    return sendText(response, 403, "Forbidden");
  }

  try {
    const stats = await fs.promises.stat(filePath);
    if (stats.isDirectory()) {
      return handleStatic(request, response, path.join(pathname, "index.html"));
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const content = await fs.promises.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentType });
    response.end(content);
  } catch (error) {
    sendText(response, 404, "Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (requestUrl.pathname === "/api/data") {
    return handleApi(request, response);
  }

  return handleStatic(request, response, requestUrl.pathname);
});

server.listen(PORT, () => {
  ensureDataFile();
  console.log(`Notebook app running at http://localhost:${PORT}`);
});
