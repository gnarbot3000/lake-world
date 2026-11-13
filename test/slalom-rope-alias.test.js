const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

test(" /slalom-rope-lengths is a noindex alias to /water-ski-rope-lengths", () => {
  const html = read("slalom-rope-lengths.html");
  assert.match(html, /<script src="\/js\/ga\.js"><\/script>/);
  assert.equal((html.match(/\/js\/ga\.js/g) || []).length, 1);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/lake.world\/water-ski-rope-lengths">/);
  assert.match(html, /location\.replace\("\/water-ski-rope-lengths" \+ q \+ h\)/);
  assert.match(html, /http-equiv="refresh" content="0;url=\/water-ski-rope-lengths"/);
  assert.match(html, /href="\/water-ski-rope-lengths"/);
  assert.doesNotMatch(html, /IWWF|15 off|gtag\(/);
});

test("sitemap lists only the canonical rope-lengths URL", () => {
  const sm = read("sitemap.xml");
  assert.match(sm, /https:\/\/lake.world\/water-ski-rope-lengths/);
  assert.doesNotMatch(sm, /slalom-rope-lengths/);
});
