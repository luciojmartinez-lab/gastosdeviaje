function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function audioExtension(type) {
  const mime = String(type || "").toLowerCase();
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

function supportedAudioType(type) {
  return /^(audio|video)\/(webm|mp4|mpeg|mp3|wav|x-wav|m4a|x-m4a)(?:;|$)/i.test(String(type || ""));
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Netlify.env.get("OPENAI_TRANSCRIPTION_API_KEY");
  if (!apiKey) return json({ error: "transcription_not_configured" }, 503);

  const length = Number(req.headers.get("content-length") || 0);
  if (length > 4_000_000) return json({ error: "audio_too_large" }, 413);

  let incoming;
  try {
    incoming = await req.formData();
  } catch {
    return json({ error: "invalid_form_data" }, 400);
  }

  const audio = incoming.get("audio");
  if (!(audio instanceof Blob) || !audio.size) return json({ error: "audio_required" }, 400);
  if (audio.size > 3_500_000) return json({ error: "audio_too_large" }, 413);
  if (!supportedAudioType(audio.type)) return json({ error: "unsupported_audio" }, 415);

  const formData = new FormData();
  formData.append("file", audio, `dictado.${audioExtension(audio.type)}`);
  formData.append("model", "gpt-4o-mini-transcribe");
  formData.append("language", "es");
  formData.append("response_format", "json");
  formData.append(
    "prompt",
    "Diario personal de viaje en español. Transcribe con fidelidad nombres propios y conserva literalmente las órdenes habladas punto, coma, punto y coma, dos puntos y punto y aparte."
  );

  let response;
  try {
    response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
  } catch {
    return json({ error: "transcription_unavailable" }, 502);
  }

  if (!response.ok) {
    console.error("OpenAI transcription failed", response.status);
    if (response.status === 401 || response.status === 403) {
      return json({ error: "transcription_credentials_invalid" }, 503);
    }
    if (response.status === 429) return json({ error: "transcription_rate_limited" }, 429);
    return json({ error: "transcription_failed" }, 502);
  }

  const result = await response.json();
  const text = String(result && result.text || "").trim();
  if (!text) return json({ error: "empty_transcription" }, 422);
  return json({ text });
};

export const config = {
  path: "/api/transcribe-dictation",
  method: "POST",
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
