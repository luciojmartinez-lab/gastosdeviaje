import { getStore } from "@netlify/blobs";

const STORE_NAME = "gastosdeviaje-sync";
const HISTORY_LIMIT = 5;
const MAX_BODY_BYTES = 5_500_000;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

async function hashKey(key) {
  const data = new TextEncoder().encode(key);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeFilename(value) {
  return String(value || "copia.json")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "copia.json";
}

async function readBody(req) {
  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) throw new Error("payload_too_large");
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Error("payload_too_large");
  }
  return JSON.parse(text || "{}");
}

async function prune(store, prefix) {
  const { blobs } = await store.list({ prefix });
  const old = [...blobs].sort((a, b) => b.key.localeCompare(a.key)).slice(HISTORY_LIMIT);
  await Promise.all(old.map((item) => store.delete(item.key)));
}

export default async (req) => {
  if (!["GET", "POST"].includes(req.method)) return json({ error: "method_not_allowed" }, 405);

  const key = String(req.headers.get("x-sync-key") || "").trim();
  if (key.length < 12 || key.length > 128) return json({ error: "invalid_sync_key" }, 401);

  const keyHash = await hashKey(key);
  const store = getStore({ name: STORE_NAME, consistency: "strong" });
  const currentKey = `users/${keyHash}/current.json`;
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.searchParams.get("content") === "1") {
      const saved = await store.get(currentKey, { type: "json" });
      if (!saved) return json({ data: null }, 404);
      return json(saved);
    }
    const result = await store.getMetadata(currentKey);
    if (!result) return json({ data: null }, 404);
    return json({ metadata: result.metadata || {}, etag: result.etag || "" });
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    return json({ error: error.message === "payload_too_large" ? "payload_too_large" : "invalid_json" }, 400);
  }
  if (!body.data || typeof body.data !== "object" || body.data.backupScope !== "all") {
    return json({ error: "invalid_sync_payload" }, 400);
  }

  const now = new Date();
  const savedAt = now.toISOString();
  const keyStamp = savedAt.replace(/[:.]/g, "-");
  const previous = await store.get(currentKey, { type: "json" });
  if (previous && previous.data) {
    const previousStamp = String(previous.savedAt || savedAt).replace(/[:.]/g, "-");
    await store.setJSON(`users/${keyHash}/history/${previousStamp}.json`, previous, {
      metadata: {
        savedAt: previous.savedAt || "",
        updatedAt: previous.updatedAt || "",
        filename: previous.filename || "",
      },
    });
  }

  if (body.backup && body.backup.data && typeof body.backup.data === "object") {
    const backupFilename = safeFilename(body.backup.filename);
    await store.setJSON(`users/${keyHash}/backups/${keyStamp}-${backupFilename}`, {
      savedAt,
      filename: backupFilename,
      scope: body.backup.data.backupScope || "all",
      data: body.backup.data,
    }, {
      metadata: {
        savedAt,
        filename: backupFilename,
        scope: body.backup.data.backupScope || "all",
      },
    });
  }

  const payload = {
    version: 1,
    savedAt,
    updatedAt: body.updatedAt || body.data.generatedAt || savedAt,
    filename: safeFilename(body.filename),
    appVersion: String(body.appVersion || ""),
    data: body.data,
  };
  await store.setJSON(currentKey, payload, {
    metadata: {
      savedAt: payload.savedAt,
      updatedAt: payload.updatedAt,
      filename: payload.filename,
      appVersion: payload.appVersion,
      scope: "all",
    },
  });

  await Promise.all([
    prune(store, `users/${keyHash}/history/`),
    prune(store, `users/${keyHash}/backups/`),
  ]);

  return json({
    ok: true,
    savedAt: payload.savedAt,
    updatedAt: payload.updatedAt,
    filename: payload.filename,
  });
};

export const config = {
  path: "/api/travel-sync",
  method: ["GET", "POST"],
};
