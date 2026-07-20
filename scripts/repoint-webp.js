#!/usr/bin/env node
/**
 * Repoint RENDERED image references (src=, srcset=, CSS url()) from oversized
 * .png/.jpg to an already-existing optimized .webp sibling.
 *
 * Safety rules:
 *  - Only rewrites references inside src="", srcset="", or url(...) contexts.
 *  - NEVER touches og:image / twitter:image (content="...") meta tags.
 *  - Only rewrites when the decoded .webp sibling actually exists on disk AND
 *    the original raster is >= 300KB (i.e. a real payload win).
 *  - Leaves everything else untouched.
 *
 * Usage:
 *   node scripts/repoint-webp.js            # apply changes
 *   node scripts/repoint-webp.js --dry-run  # report only
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "public");
const DRY = process.argv.includes("--dry-run");
const MIN_BYTES = 300 * 1024;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Given a raster ref (as written in source), return the .webp ref if the
 * optimized sibling exists on disk and the original is oversized; else null. */
function webpFor(ref) {
  const rel = ref.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "");
  const disk = path.join(ROOT, decode(rel));
  if (!fs.existsSync(disk) || fs.statSync(disk).size < MIN_BYTES) return null;
  const webpDisk = disk.replace(/\.(png|jpe?g)$/i, ".webp");
  if (!fs.existsSync(webpDisk)) return null;
  return ref.replace(/\.(png|jpe?g)(\b|$)/i, ".webp");
}

// Match a raster URL only inside a rendered context.
//  group layout: (prefix)(url)
const CONTEXT_RE =
  /(src=["']|srcset=["']|url\(["']?)([^"')]*?\.(?:png|jpe?g))/gi;

const changes = [];
let filesChanged = 0;

for (const file of walk(ROOT)) {
  const orig = fs.readFileSync(file, "utf8");
  let touched = false;
  const next = orig.replace(CONTEXT_RE, (whole, prefix, url) => {
    const webp = webpFor(url);
    if (!webp) return whole;
    touched = true;
    changes.push({
      file: path.relative(ROOT, file),
      from: url,
      to: webp,
    });
    return prefix + webp;
  });
  if (touched && next !== orig) {
    filesChanged++;
    if (!DRY) fs.writeFileSync(file, next);
  }
}

// Report
const byRef = {};
for (const c of changes) byRef[c.from] = (byRef[c.from] || 0) + 1;
console.log(`${DRY ? "[DRY RUN] " : ""}Repointed ${changes.length} reference(s) across ${filesChanged} file(s):`);
for (const [ref, n] of Object.entries(byRef).sort()) {
  console.log(`  x${n}  ${ref}  ->  ${ref.replace(/\.(png|jpe?g)(\b|$)/i, ".webp")}`);
}
