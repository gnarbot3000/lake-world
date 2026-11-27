import {
  normalizeMocreoRest,
  normalizeWebhookPayload,
  timingSafeEqual,
  toPublicReading
} from "./normalize.js";

const KV_KEY = "latest";
const KV_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAX_INGEST_BYTES = 8192;
const MOCREO_API_BASE = "https://api.mocreo.com/v1";

function allowedOriginFor(request, env) {
  const configured = (env.ALLOWED_ORIGIN || "https://lake.world")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const reqOrigin = request.headers.get("Origin");
  if (!reqOrigin) return configured[0] || "https://lake.world";
  if (configured.includes(reqOrigin)) return reqOrigin;
  return "";
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function corsHeaders(origin) {
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept",
    Vary: "Origin"
  };
}

function extractIngestToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice(7).trim();
  }
  const alt = request.headers.get("X-Webhook-Secret") || "";
  return alt.trim();
}

async function handleGetTemp(request, env, nowMs = Date.now()) {
  const origin = allowedOriginFor(request, env);
  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=60",
    ...corsHeaders(origin)
  };

  if (!env.LAKE_TEMP_KV) {
    return jsonResponse({ ok: false, error: "storage_not_configured" }, 503, headers);
  }

  const raw = await env.LAKE_TEMP_KV.get(KV_KEY, "json");
  const staleMinutes = Math.max(5, Number(env.STALE_AFTER_MINUTES) || 90);
  const pub = toPublicReading(raw, nowMs, staleMinutes);
  if (!pub) {
    return jsonResponse({ ok: false, error: "no_reading" }, 503, {
      ...headers,
      "Cache-Control": "no-store"
    });
  }

  return jsonResponse(pub, 200, headers);
}

async function handleIngest(request, env, nowMs = Date.now()) {
  const secret = env.INGEST_WEBHOOK_SECRET;
  if (typeof secret !== "string" || secret.length < 16) {
    // Fail closed when webhook secret is not configured.
    return jsonResponse({ ok: false, error: "ingest_not_configured" }, 503, {
      "Cache-Control": "no-store"
    });
  }

  const provided = extractIngestToken(request);
  if (!provided || !timingSafeEqual(provided, secret)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401, {
      "Cache-Control": "no-store"
    });
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_INGEST_BYTES) {
    return jsonResponse({ ok: false, error: "payload_too_large" }, 413, {
      "Cache-Control": "no-store"
    });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_INGEST_BYTES) {
    return jsonResponse({ ok: false, error: "payload_too_large" }, 413, {
      "Cache-Control": "no-store"
    });
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400, {
      "Cache-Control": "no-store"
    });
  }

  const normalized = normalizeWebhookPayload(parsed, nowMs);
  if (!normalized.ok) {
    return jsonResponse({ ok: false, error: normalized.error }, 400, {
      "Cache-Control": "no-store"
    });
  }

  if (!env.LAKE_TEMP_KV) {
    return jsonResponse({ ok: false, error: "storage_not_configured" }, 503, {
      "Cache-Control": "no-store"
    });
  }

  await env.LAKE_TEMP_KV.put(KV_KEY, JSON.stringify(normalized.reading), {
    expirationTtl: KV_TTL_SECONDS
  });

  return jsonResponse(
    { ok: true, updatedAt: normalized.reading.updatedAt },
    200,
    { "Cache-Control": "no-store" }
  );
}

export async function pollMocreoApi(env, fetchImpl = fetch, nowMs = Date.now()) {
  const apiKey = env.MOCREO_API_KEY;
  const assetId = env.MOCREO_ASSET_ID;
  const deviceId = env.MOCREO_DEVICE_ID;
  if (!apiKey || !assetId || !deviceId) {
    return { ok: false, skipped: true, reason: "polling_secrets_unset" };
  }
  if (!env.LAKE_TEMP_KV) {
    return { ok: false, skipped: false, reason: "storage_not_configured" };
  }

  const url = `${MOCREO_API_BASE}/assets/${encodeURIComponent(assetId)}/devices/${encodeURIComponent(deviceId)}`;
  const res = await fetchImpl(url, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json"
    },
    signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
  });

  if (!res.ok) {
    return { ok: false, skipped: false, reason: `upstream_http_${res.status}` };
  }

  const payload = await res.json();
  const normalized = normalizeMocreoRest(payload, nowMs);
  if (!normalized.ok) {
    return { ok: false, skipped: false, reason: normalized.error };
  }

  await env.LAKE_TEMP_KV.put(KV_KEY, JSON.stringify(normalized.reading), {
    expirationTtl: KV_TTL_SECONDS
  });
  return { ok: true, reading: normalized.reading };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && (url.pathname === "/temp" || url.pathname === "/")) {
      const origin = allowedOriginFor(request, env);
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && (url.pathname === "/temp" || url.pathname === "/")) {
      return handleGetTemp(request, env);
    }

    if (request.method === "POST" && url.pathname === "/ingest") {
      return handleIngest(request, env);
    }

    return jsonResponse({ ok: false, error: "not_found" }, 404, {
      "Cache-Control": "no-store"
    });
  },

  async scheduled(_event, env, ctx) {
    const job = pollMocreoApi(env);
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(job);
    } else {
      await job;
    }
  }
};
