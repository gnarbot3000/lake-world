// Pure normalization and validation helpers for MOCREO H5Pro-LS2D readings.
// LS2 waterproof probe spec: -40 C to 105 C (-40 F to 221 F).

export const MIN_TEMP_C = -40;
export const MAX_TEMP_C = 105;

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function cToF(c) {
  return round1((c * 9) / 5 + 32);
}

export function fToC(f) {
  return round1(((f - 32) * 5) / 9);
}

export function parseTimestampMs(raw, fallbackMs = Date.now()) {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    // Epoch seconds (10 digits) vs milliseconds (13 digits)
    return raw < 1e12 ? Math.round(raw * 1000) : Math.round(raw);
  }
  if (typeof raw === "string" && raw.trim()) {
    const asNum = Number(raw.trim());
    if (Number.isFinite(asNum) && asNum > 0) {
      return asNum < 1e12 ? Math.round(asNum * 1000) : Math.round(asNum);
    }
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallbackMs;
}

export function isValidTempC(c) {
  return typeof c === "number" && Number.isFinite(c) && c >= MIN_TEMP_C && c <= MAX_TEMP_C;
}

/**
 * Normalize a MOCREO Smart System v1 GET /assets/{assetId}/devices/{deviceId} response.
 * OpenAPI schema: result.properties.temperature (float C), result.attributes.online,
 * result.updatedAt (epoch ms or s).
 */
export function normalizeMocreoRest(payload, nowMs = Date.now()) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "invalid_payload" };
  }
  const device = payload.result && typeof payload.result === "object" ? payload.result : payload;
  const props = device.properties && typeof device.properties === "object" ? device.properties : {};
  const attrs = device.attributes && typeof device.attributes === "object" ? device.attributes : {};

  const rawTemp = props.temperature;
  if (typeof rawTemp !== "number" || !Number.isFinite(rawTemp)) {
    return { ok: false, error: "missing_temperature" };
  }
  const tempC = round1(rawTemp);
  if (!isValidTempC(tempC)) {
    return { ok: false, error: "temperature_out_of_range" };
  }

  const updatedAtMs = parseTimestampMs(device.updatedAt ?? attrs.lastOnline, nowMs);
  const online = typeof attrs.online === "boolean" ? attrs.online : true;

  return {
    ok: true,
    reading: {
      tempC,
      tempF: cToF(tempC),
      updatedAt: new Date(updatedAtMs).toISOString(),
      updatedAtMs,
      online,
      source: "mocreo_rest"
    }
  };
}

/**
 * Normalize an incoming webhook payload (e.g., H5Pro MQTT bridge -> HTTP POST).
 * Supports:
 *  - MOCREO MQTT LS2 format: { measureId, timestamp, model: "LS2"|"LS2D", temperature: 2850 } (centi-C)
 *  - Explicit { tempC } or { tempF }
 *  - Generic { temperature, unit: "C" | "F" | "cC" }
 */
export function normalizeWebhookPayload(payload, nowMs = Date.now()) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "invalid_payload" };
  }

  let tempC = null;

  if (typeof payload.tempC === "number" && Number.isFinite(payload.tempC)) {
    tempC = round1(payload.tempC);
  } else if (typeof payload.tempF === "number" && Number.isFinite(payload.tempF)) {
    tempC = fToC(payload.tempF);
  } else if (typeof payload.temperature === "number" && Number.isFinite(payload.temperature)) {
    const unit = typeof payload.unit === "string" ? payload.unit.trim().toLowerCase() : "";
    const model = typeof payload.model === "string" ? payload.model.trim().toUpperCase() : "";
    if (unit === "f" || unit === "fahrenheit") {
      tempC = fToC(payload.temperature);
    } else if (unit === "cc" || unit === "centic" || unit === "centi-c") {
      tempC = round1(payload.temperature / 100);
    } else if (unit === "c" || unit === "celsius") {
      tempC = round1(payload.temperature);
    } else {
      // MOCREO H5Pro MQTT LS2/LS2D payloads report integer centi-degrees C (e.g. 2850 -> 28.50 C).
      const looksLikeMocreoCenti =
        Number.isInteger(payload.temperature) &&
        (model.startsWith("LS") ||
          typeof payload.measureId === "number" ||
          Math.abs(payload.temperature) > MAX_TEMP_C);
      tempC = looksLikeMocreoCenti ? round1(payload.temperature / 100) : round1(payload.temperature);
    }
  } else {
    return { ok: false, error: "missing_temperature" };
  }

  if (!isValidTempC(tempC)) {
    return { ok: false, error: "temperature_out_of_range" };
  }

  const updatedAtMs = parseTimestampMs(payload.timestamp ?? payload.updatedAt, nowMs);
  const online =
    typeof payload.online === "boolean"
      ? payload.online
      : typeof payload.found === "boolean"
        ? payload.found
        : true;

  return {
    ok: true,
    reading: {
      tempC,
      tempF: cToF(tempC),
      updatedAt: new Date(updatedAtMs).toISOString(),
      updatedAtMs,
      online,
      source: "webhook"
    }
  };
}

/**
 * Shape the KV record for public GET /temp responses.
 * Strictly whitelists safe public fields (never leaks device IDs, asset IDs, or credentials).
 */
export function toPublicReading(stored, nowMs = Date.now(), staleAfterMinutes = 90) {
  if (!stored || typeof stored !== "object" || !isValidTempC(stored.tempC)) {
    return null;
  }
  const updatedAtMs = parseTimestampMs(stored.updatedAtMs ?? stored.updatedAt, nowMs);
  const ageMinutes = Math.max(0, Math.round((nowMs - updatedAtMs) / 60000));
  const stale = ageMinutes >= staleAfterMinutes;
  const tempC = round1(stored.tempC);
  return {
    ok: true,
    tempF: cToF(tempC),
    tempC,
    updatedAt: new Date(updatedAtMs).toISOString(),
    ageMinutes,
    stale,
    online: stored.online !== false
  };
}

/**
 * Constant-time string comparison for webhook secret verification.
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(ab, bb);
  }
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}
