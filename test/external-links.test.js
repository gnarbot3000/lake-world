const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
function htmlFiles(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(htmlFiles(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

test("every new-tab link sends no opener and no referrer", () => {
  const files = htmlFiles(root);
  assert.ok(files.length > 5);
  for (const f of files) {
    const html = fs.readFileSync(f, "utf8");
    for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) {
      const rel = (/rel="([^"]*)"/.exec(tag) || [, ""])[1].split(/\s+/);
      assert.ok(rel.includes("noopener") && rel.includes("noreferrer"), path.relative(root, f) + ": " + tag);
    }
  }
});
