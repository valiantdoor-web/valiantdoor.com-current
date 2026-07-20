#!/usr/bin/env node
/**
 * Remove <url>...</url> blocks whose <loc> matches a noindex page from the
 * page/image sitemaps. Keeps sitemaps free of noindex URLs (Google treats a
 * noindex URL listed in a sitemap as a conflicting signal).
 *
 * Idempotent: safe to run repeatedly. Pass --dry-run to preview.
 */
const fs = require("fs");
const path = require("path");

const PUBLIC = path.join(__dirname, "..", "public");
const SITEMAPS = ["sitemap-pages.xml", "sitemap-images.xml", "sitemap-blog.xml"];

// Canonical paths (no domain) of noindex pages that must not appear in sitemaps.
const REMOVE = new Set([
  "/business-card",
  "/thank-you",
  "/address-selection-hidden",
]);

const DOMAIN = "https://www.valiantdoor.com";
const dryRun = process.argv.includes("--dry-run");

for (const name of SITEMAPS) {
  const file = path.join(PUBLIC, name);
  if (!fs.existsSync(file)) continue;
  const xml = fs.readFileSync(file, "utf8");

  // Split into <url>...</url> blocks, preserving the surrounding prologue/epilogue.
  const urlBlock = /[ \t]*<url>[\s\S]*?<\/url>\n?/g;
  let removed = 0;
  const out = xml.replace(urlBlock, (block) => {
    const m = block.match(/<loc>\s*([^<]+?)\s*<\/loc>/);
    if (!m) return block;
    const loc = m[1].trim();
    const p = loc.replace(DOMAIN, "").replace(/\/$/, "") || "/";
    if (REMOVE.has(p)) {
      removed++;
      return "";
    }
    return block;
  });

  if (removed > 0) {
    console.log(`${name}: removing ${removed} noindex <url> block(s)`);
    if (!dryRun) fs.writeFileSync(file, out);
  } else {
    console.log(`${name}: no matching noindex blocks (clean)`);
  }
}
console.log(dryRun ? "\n(dry run — no files written)" : "\nDone.");
