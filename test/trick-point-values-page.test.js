const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("/trick-ski-point-values is a complete, cited guide page", () => {
  const html = read("trick-ski-point-values.html");
  assert.equal((html.match(/<script src="\/js\/ga\.js"><\/script>/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/lake\.world\/trick-ski-point-values">/);
  assert.match(html, /IWWF-World-Waterski-Rules-2026-FINAL\.pdf/);
  for (const p of ["/trick-ski-log", "/water-ski-rope-lengths", "/slalom-course-dimensions"]) assert.match(html, new RegExp('href="' + p + '"'));
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(m[1]);
});

test("every value on the page matches the IWWF chart the calculator uses", () => {
  const ctx = {};
  vm.runInNewContext(read("js/trick-chart.js"), ctx);
  const html = read("trick-ski-point-values.html");
  const v = (b, r) => (b == null ? "–" : r == null ? String(b) : b + " / R " + r);
  const rows = [...html.matchAll(/<tr data-code="([^"]+)"><td>([^<]+)<\/td><td>[^<]+<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><td>([^<]+)<\/td><\/tr>/g)];
  assert.equal(rows.length, ctx.LakeTricks.chart.length);
  for (const [, code, no, name, two, one] of rows) {
    const r = ctx.LakeTricks.byCode[code];
    assert.ok(r, code);
    assert.deepEqual([no, name, two, one], [r[2], r[1], v(r[3], r[4]), v(r[5], r[6])], code);
  }
});

test("the trick log and sitemap link to it", () => {
  assert.match(read("trick-ski-log.html"), /href="\/trick-ski-point-values"/);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/lake\.world\/trick-ski-point-values<\/loc>/);
});
