import { getStore } from "@netlify/blobs";

const STORE_NAME = "gastosdeviaje-sync";
const HISTORY_LIMIT = 5;
const MAX_BODY_BYTES = 5_500_000;
const MAX_ATTACHMENT_CHUNK_CHARS = 3_000_000;

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

function validAttachmentId(value) {
  const id = String(value || "").toLowerCase();
  return /^[a-f0-9]{64}$/.test(id) ? id : "";
}

function attachmentPrefix(keyHash, id) {
  return `users/${keyHash}/attachments/${id}`;
}

function attachmentPartKey(keyHash, id, index) {
  return `${attachmentPrefix(keyHash, id)}/parts/${String(index).padStart(6, "0")}`;
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
    const attachmentId = validAttachmentId(url.searchParams.get("attachment"));
    if (attachmentId) {
      const part = Number(url.searchParams.get("part"));
      if (!Number.isInteger(part) || part < 0) return json({ error: "invalid_attachment_part" }, 400);
      const data = await store.get(attachmentPartKey(keyHash, attachmentId, part));
      if (data === null) return json({ error: "attachment_part_not_found" }, 404);
      return new Response(data, {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=31536000, immutable",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }
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

  if (body.action === "check-attachments") {
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : [])
      .map(validAttachmentId)
      .filter(Boolean))]
      .slice(0, 100);
    const found = await Promise.all(ids.map(async (id) => {
      const metadata = await store.getMetadata(`${attachmentPrefix(keyHash, id)}/manifest.json`);
      return metadata ? id : null;
    }));
    const existing = found.filter(Boolean);
    const existingSet = new Set(existing);
    return json({ existing, missing: ids.filter((id) => !existingSet.has(id)) });
  }

  if (body.action === "put-attachment-part") {
    const id = validAttachmentId(body.id);
    const index = Number(body.index);
    const total = Number(body.total);
    const data = typeof body.data === "string" ? body.data : "";
    if (!id || !Number.isInteger(index) || index < 0 || !Number.isInteger(total) || total < 1 || index >= total) {
      return json({ error: "invalid_attachment_part" }, 400);
    }
    if (!data || data.length > MAX_ATTACHMENT_CHUNK_CHARS) {
      return json({ error: "attachment_part_too_large" }, 400);
    }
    const result = await store.set(attachmentPartKey(keyHash, id, index), data, {
      onlyIfNew: true,
      metadata: { id, index, total },
    });
    return json({ ok: true, stored: Boolean(result && result.modified), index, total });
  }

  if (body.action === "commit-attachment") {
    const id = validAttachmentId(body.id);
    const total = Number(body.total);
    if (!id || !Number.isInteger(total) || total < 1 || total > 10_000) {
      return json({ error: "invalid_attachment_manifest" }, 400);
    }
    const parts = await Promise.all(Array.from({ length: total }, (_, index) =>
      store.getMetadata(attachmentPartKey(keyHash, id, index))));
    if (parts.some((part) => !part)) return json({ error: "attachment_incomplete" }, 409);
    const manifest = {
      id,
      parts: total,
      name: safeFilename(body.name || "ticket"),
      mime: String(body.mime || "application/octet-stream").slice(0, 120),
      encoding: String(body.encoding || "data-url").slice(0, 40),
      size: Math.max(0, Number(body.size) || 0),
      savedAt: new Date().toISOString(),
    };
    await store.setJSON(`${attachmentPrefix(keyHash, id)}/manifest.json`, manifest, {
      metadata: {
        id,
        parts: total,
        mime: manifest.mime,
        encoding: manifest.encoding,
        size: manifest.size,
        savedAt: manifest.savedAt,
      },
    });
    return json({ ok: true, manifest });
  }

  if (!body.data || typeof body.data !== "object" || body.data.backupScope !== "all") {
    return json({ error: "invalid_sync_payload" }, 400);
  }

  const expectedEtag = typeof body.expectedEtag === "string" ? body.expectedEtag : null;
  if (expectedEtag !== null) {
    const currentMetadata = await store.getMetadata(currentKey);
    const currentEtag = currentMetadata && currentMetadata.etag ? currentMetadata.etag : "";
    if (currentEtag !== expectedEtag) {
      return json({
        error: "cloud_changed",
        metadata: currentMetadata && currentMetadata.metadata || null,
        etag: currentEtag,
      }, 409);
    }
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
  const savedMetadata = await store.getMetadata(currentKey);

  await Promise.all([
    prune(store, `users/${keyHash}/history/`),
    prune(store, `users/${keyHash}/backups/`),
  ]);

  return json({
    ok: true,
    savedAt: payload.savedAt,
    updatedAt: payload.updatedAt,
    filename: payload.filename,
    etag: savedMetadata && savedMetadata.etag || "",
  });
};

export const config = {
  path: "/api/travel-sync",
  method: ["GET", "POST"],
};
