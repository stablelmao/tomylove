const { get, put } = require("@vercel/blob");

const DEFAULT_STATE = {
  posts: [],
  memories: []
};

const DATA_PATHNAME = process.env.NOTEBOOK_DATA_PATHNAME || "notebook/notebook-data.json";

function sanitizeState(payload) {
  return {
    posts: Array.isArray(payload?.posts) ? payload.posts : [],
    memories: Array.isArray(payload?.memories) ? payload.memories : []
  };
}

async function streamToText(stream) {
  if (!stream) {
    return "";
  }

  return await new Response(stream).text();
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(payload, null, 2));
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

module.exports = async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const result = await get(DATA_PATHNAME, { access: "private" });

      if (!result) {
        return sendJson(response, 200, DEFAULT_STATE);
      }

      const text = await streamToText(result.stream);
      const parsed = text ? JSON.parse(text) : DEFAULT_STATE;
      return sendJson(response, 200, sanitizeState(parsed));
    } catch (error) {
      return sendJson(response, 500, { error: "Could not read Vercel data storage." });
    }
  }

  if (request.method === "POST") {
    try {
      const body = await readBody(request);
      const parsed = JSON.parse(body || "{}");
      const state = sanitizeState(parsed);

      await put(DATA_PATHNAME, JSON.stringify(state, null, 2), {
        access: "private",
        allowOverwrite: true,
        contentType: "application/json"
      });

      return sendJson(response, 200, { ok: true });
    } catch (error) {
      return sendJson(response, 400, { error: "Could not save Vercel data storage." });
    }
  }

  return sendJson(response, 405, { error: "Method not allowed." });
};
