import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  normalizeMocreoRest,
  normalizeWebhookPayload,
  timingSafeEqual,
  toPublicReading
} from "../workers/mocreo-temp/src/normalize.js";
import worker, { pollMocreoApi } from "../workers/mocreo-temp/src/index.js";

function makeMemoryKv() {
  const store = new Map();
  return {
    store,
    async get(key, type) {
      const val = store.get(key);
      if (val === undefined) return null;
      return type === "json" ? JSON.parse(val) : val;
    },
    async put(key, value) {
      store.set(key, value);
    }
  };
}

test("normalizeMocreoRest parses real MOCREO v1 Device payload", () => {
  const payload = {
    success: true,
    result: {
      id: "AB1234567890",
      assetId: "64af9199134bf5aa7bf18bbd",
      type: "NODE",
      model: "LS2D",
      attributes: { online: true, lastOnline: 1760682172 },
      properties: { temperature: 21.8, battery_percentage: 98 },
      updatedAt: 1760682172000
    }
  };
  const out = normalizeMocreoRest(payload);
  assert.equal(out.ok, true);
  assert.equal(out.reading.tempC, 21.8);
  assert.equal(out.reading.tempF, 71.2);
  assert.equal(out.reading.online, true);
  assert.equal(out.reading.updatedAtMs, 1760682172000);
});

test("normalizeWebhookPayload handles H5Pro LS2 centi-C and explicit F/C", () => {
  const centi = normalizeWebhookPayload({
    measureId: 1,
    timestamp: 1760682172,
    model: "LS2",
    temperature: 2850
  });
  assert.equal(centi.ok, true);
  assert.equal(centi.reading.tempC, 28.5);
  assert.equal(centi.reading.tempF, 83.3);
  assert.equal(centi.reading.updatedAtMs, 1760682172000);

  const fahr = normalizeWebhookPayload({ tempF: 68.0 });
  assert.equal(fahr.ok, true);
  assert.equal(fahr.reading.tempC, 20.0);
  assert.equal(fahr.reading.tempF, 68.0);

  const bad = normalizeWebhookPayload({ tempC: 999 });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, "temperature_out_of_range");
});

test("POST /ingest fails closed when secret unset and rejects bad secrets", async () => {
  const kv = makeMemoryKv();
  const reqUnset = new Request("https://temp.lake.world/ingest", {
    method: "POST",
    body: JSON.stringify({ tempC: 20 })
  });
  const resUnset = await worker.fetch(reqUnset, { LAKE_TEMP_KV: kv });
  assert.equal(resUnset.status, 503);

  const env = {
    LAKE_TEMP_KV: kv,
    INGEST_WEBHOOK_SECRET: "super-secret-token-value-123456"
  };

  const resWrong = await worker.fetch(
    new Request("https://temp.lake.world/ingest", {
      method: "POST",
      headers: { Authorization: "Bearer wrong-token" },
      body: JSON.stringify({ tempC: 20 })
    }),
    env
  );
  assert.equal(resWrong.status, 401);

  const resOk = await worker.fetch(
    new Request("https://temp.lake.world/ingest", {
      method: "POST",
      headers: { Authorization: "Bearer super-secret-token-value-123456" },
      body: JSON.stringify({ model: "LS2", measureId: 2, temperature: 2150, timestamp: 1760682172 })
    }),
    env
  );
  assert.equal(resOk.status, 200);
  assert.equal(kv.store.has("latest"), true);
});

test("GET /temp returns sanitized public JSON with CORS and no internal IDs", async () => {
  const kv = makeMemoryKv();
  const env = {
    LAKE_TEMP_KV: kv,
    ALLOWED_ORIGIN: "https://lake.world",
    STALE_AFTER_MINUTES: "90"
  };

  const emptyRes = await worker.fetch(new Request("https://temp.lake.world/temp"), env);
  assert.equal(emptyRes.status, 503);

  await kv.put(
    "latest",
    JSON.stringify({
      tempC: 22.0,
      tempF: 71.6,
      updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
      updatedAtMs: Date.now() - 5 * 60000,
      online: true,
      deviceId: "SHOULD_NOT_LEAK"
    })
  );

  const res = await worker.fetch(
    new Request("https://temp.lake.world/temp", {
      headers: { Origin: "https://lake.world" }
    }),
    env
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "https://lake.world");
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");

  const body = await res.json();
  assert.equal(body.ok, true);
  assert.equal(body.tempC, 22.0);
  assert.equal(body.tempF, 71.6);
  assert.equal(body.stale, false);
  assert.equal("deviceId" in body, false);
});

test("pollMocreoApi sends X-API-Key header and stores reading in KV", async () => {
  const kv = makeMemoryKv();
  let capturedUrl = "";
  let capturedHeaders = {};
  const fakeFetch = async (url, init) => {
    capturedUrl = url;
    capturedHeaders = init.headers;
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          id: "DEV1",
          attributes: { online: true },
          properties: { temperature: 19.5 },
          updatedAt: 1760682172000
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const skipped = await pollMocreoApi({ LAKE_TEMP_KV: kv }, fakeFetch);
  assert.equal(skipped.skipped, true);

  const res = await pollMocreoApi(
    {
      LAKE_TEMP_KV: kv,
      MOCREO_API_KEY: "mok_test_secret_value",
      MOCREO_ASSET_ID: "asset123",
      MOCREO_DEVICE_ID: "dev456"
    },
    fakeFetch
  );
  assert.equal(res.ok, true);
  assert.equal(capturedUrl, "https://api.mocreo.com/v1/assets/asset123/devices/dev456");
  assert.equal(capturedHeaders["X-API-Key"], "mok_test_secret_value");
  const saved = await kv.get("latest", "json");
  assert.equal(saved.tempC, 19.5);
  assert.equal(saved.tempF, 67.1);
});

test("timingSafeEqual and toPublicReading stale boundary", () => {
  assert.equal(timingSafeEqual("abc", "abc"), true);
  assert.equal(timingSafeEqual("abc", "abd"), false);
  assert.equal(timingSafeEqual("abc", "abcd"), false);

  const now = 1_760_000_000_000;
  const pub = toPublicReading(
    { tempC: 20, updatedAtMs: now - 95 * 60000, online: true },
    now,
    90
  );
  assert.equal(pub.stale, true);
  assert.equal(pub.ageMinutes, 95);
});

test("static widget and preview page keep secrets out of client code and load GA4", () => {
  const widgetSrc = fs.readFileSync(path.resolve("js/lake-temp-widget.js"), "utf8");
  assert.doesNotMatch(widgetSrc, /MOCREO_API_KEY|X-API-Key|INGEST_WEBHOOK_SECRET|mok_/i);
  assert.doesNotMatch(widgetSrc, /innerHTML/);

  const previewHtml = fs.readFileSync(path.resolve("preview/lake-temp.html"), "utf8");
  assert.match(previewHtml, /<script src="\/js\/ga\.js"><\/script>/);
  assert.match(previewHtml, /name="robots"\s+content="noindex, nofollow"/);
});
