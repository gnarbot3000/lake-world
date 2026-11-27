# lake.world MOCREO H5Pro-LS2D Live Water Temp Worker (Draft)

Reads live water temperature from a **MOCREO H5Pro Hub + LS2 / LS2D waterproof probe** and serves a small, cacheable, read-only JSON endpoint (`GET /temp`) for `lake.world`.

All credentials stay strictly in Cloudflare Worker secrets (`wrangler secret put`). Zero API keys, device IDs, or hub serial numbers ever appear in client-side JS or this repo.

## Supported ingest modes

You can use either mode (or both):

1. **MOCREO Smart System REST API polling (recommended, no MQTT broker needed):**
   - Runs on the Worker cron (`*/15 * * * *`).
   - Calls `GET https://api.mocreo.com/v1/assets/{assetId}/devices/{deviceId}` with header `X-API-Key: mok_...`.
   - Requires Worker secrets: `MOCREO_API_KEY`, `MOCREO_ASSET_ID`, `MOCREO_DEVICE_ID`.
2. **Webhook ingest (for H5Pro MQTT bridge -> HTTP POST):**
   - `POST /ingest` authenticated with `Authorization: Bearer <INGEST_WEBHOOK_SECRET>` (or `X-Webhook-Secret` header).
   - Fails closed (`503`) if `INGEST_WEBHOOK_SECRET` is unset.
   - Accepts MOCREO MQTT LS2 centi-°C payloads (`{"measureId":1,"timestamp":1760682172,"model":"LS2","temperature":2850}`) as well as `{ "tempC": 21.4 }` or `{ "tempF": 70.5 }`.

## Public response (`GET /temp`)

Returns only sanitized public fields (no device ID, asset ID, or credentials):

```json
{
  "ok": true,
  "tempF": 71.2,
  "tempC": 21.8,
  "updatedAt": "2026-11-26T20:00:00.000Z",
  "ageMinutes": 4,
  "stale": false,
  "online": true
}
```

## Setup (when Joel approves deployment)

```bash
cd workers/mocreo-temp

# 1. Create the KV namespace and copy its ID into wrangler.toml
wrangler kv namespace create LAKE_TEMP_KV

# 2a. For REST API polling mode:
wrangler secret put MOCREO_API_KEY
wrangler secret put MOCREO_ASSET_ID
wrangler secret put MOCREO_DEVICE_ID

# 2b. Or for webhook ingest mode (generate a 32-byte random token):
wrangler secret put INGEST_WEBHOOK_SECRET

# 3. Deploy
wrangler deploy
```

## Embedding the static widget

Include `/js/lake-temp-widget.js` and add a mount container pointing at your deployed Worker URL:

```html
<div data-lake-temp-widget
     data-endpoint="https://temp.lake.world/temp"
     data-label="Water temp"></div>
<script src="/js/lake-temp-widget.js" defer></script>
```
