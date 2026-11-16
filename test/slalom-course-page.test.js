const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("/slalom-course-dimensions is a complete, cited guide page", () => {
  const html = read("slalom-course-dimensions.html");
  assert.equal((html.match(/<script src="\/js\/ga\.js"><\/script>/g) || []).length, 1);
  assert.match(html, /<link rel="canonical" href="https:\/\/lake\.world\/slalom-course-dimensions">/);
  assert.match(html, /2026_Rulebook_revised_9-2-26\.pdf/);
  for (const v of ["259 m", "27 m", "41 m", "11.5 m", "1.25 m", "1.15 m", "55 m", "29.347 m", "47.011 m"]) assert.ok(html.includes("<td>" + v + "</td>"), v);
  for (const p of ["/water-ski-rope-lengths", "/slalom-score-calculator", "/slalom-pass-log"]) assert.match(html, new RegExp('href="' + p + '"'));
  for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(m[1]);
});

test("the numbers add up the way the diagram says", () => {
  assert.equal(27 * 2 + 41 * 5, 259);
  assert.equal(Math.hypot(27, 11.5).toFixed(3), "29.347");
  assert.equal(Math.hypot(41, 23).toFixed(3), "47.011");
});

test("rope lengths, the calculator and the sitemap link to it", () => {
  for (const f of ["water-ski-rope-lengths.html", "slalom-score-calculator.html"]) assert.match(read(f), /href="\/slalom-course-dimensions"/, f);
  assert.match(read("sitemap.xml"), /<loc>https:\/\/lake\.world\/slalom-course-dimensions<\/loc>/);
});
