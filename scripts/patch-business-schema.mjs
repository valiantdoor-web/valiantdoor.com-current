#!/usr/bin/env node
/**
 * Surgical JSON-LD business-schema completer.
 *
 * Ensures every SELF-CONTAINED business entity (one that carries its own
 * `address`) also has the Google-required `geo`, `priceRange`, and `image`
 * fields. It ONLY inspects top-level members of each JSON-LD block (the root
 * object, an array's items, or a `@graph`'s items). It deliberately does NOT
 * recurse into nested properties, so `provider`/reference stubs that only
 * carry `{@type,name,telephone}` are left untouched.
 *
 * Usage:
 *   node scripts/patch-business-schema.mjs --dry-run   # report only
 *   node scripts/patch-business-schema.mjs             # apply
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const DRY = process.argv.includes("--dry-run");

const CANON = {
  image: "https://www.valiantdoor.com/assets/home-optimized/shield-192.webp",
  priceRange: "$$",
  geo: { "@type": "GeoCoordinates", latitude: 37.676357, longitude: -121.894745 },
};

const BIZ = /GarageDoor|LocalBusiness|HomeAndConstruction/;
const typeStr = (o) => (Array.isArray(o?.["@type"]) ? o["@type"].join() : o?.["@type"] || "");

function completeMember(o) {
  // Only self-contained business entities (those with their own address).
  if (!o || typeof o !== "object") return false;
  if (!BIZ.test(typeStr(o))) return false;
  if (!("address" in o)) return false;
  let changed = false;
  if (!("image" in o)) { o.image = CANON.image; changed = true; }
  if (!("priceRange" in o)) { o.priceRange = CANON.priceRange; changed = true; }
  if (!("geo" in o)) { o.geo = CANON.geo; changed = true; }
  return changed;
}

const files = execSync('find public -name "*.html"').toString().trim().split("\n");
let filesChanged = 0;
let blocksChanged = 0;
const report = [];

for (const f of files) {
  let html = readFileSync(f, "utf8");
  let fileTouched = false;

  html = html.replace(
    /(<script[^>]*application\/ld\+json[^>]*>)([\s\S]*?)(<\/script>)/g,
    (full, open, body, close) => {
      let j;
      try { j = JSON.parse(body); } catch { return full; }
      const members = Array.isArray(j) ? j : j["@graph"] ? j["@graph"] : [j];
      let blockChanged = false;
      for (const m of members) if (completeMember(m)) blockChanged = true;
      if (!blockChanged) return full;
      blocksChanged++;
      fileTouched = true;
      const indent = body.match(/\n(\s+)\S/)?.[1]?.length || 2;
      return open + "\n" + JSON.stringify(j, null, indent) + "\n" + close;
    }
  );

  if (fileTouched) {
    filesChanged++;
    report.push(f.replace("public/", ""));
    if (!DRY) writeFileSync(f, html);
  }
}

console.log((DRY ? "[DRY RUN] " : "") + `files affected: ${filesChanged}, blocks updated: ${blocksChanged}`);
report.forEach((r) => console.log("  " + r));
