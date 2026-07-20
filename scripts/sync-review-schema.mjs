#!/usr/bin/env node
/**
 * sync-review-schema.mjs
 *
 * Stamps the current Google review rating + count into every page's JSON-LD
 * schema (aggregateRating) and the static visible fallback text sitewide.
 *
 * WHY: the visible on-page numbers already auto-update client-side via
 * /api/reviews, but JSON-LD structured data (what Google reads for star
 * rich-results) cannot be reliably updated with client JS. This script keeps
 * the schema and the static fallbacks in sync at deploy time.
 *
 * Usage:
 *   node scripts/sync-review-schema.mjs                 # fetch live from Google
 *   node scripts/sync-review-schema.mjs --count 60      # force a specific count
 *   node scripts/sync-review-schema.mjs --count 60 --rating 5.0
 *   node scripts/sync-review-schema.mjs --dry-run       # report only, no writes
 *
 * Env: GOOGLE_PLACES_API_KEY (same key /api/reviews uses).
 */

import { readFile, writeFile } from "node:fs/promises";
import { glob } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "public");
const GOOGLE_PLACE_ID = "ChIJreu0MBcWcgMRQnyWHvhS94w";

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const DRY_RUN = args.includes("--dry-run");

async function fetchLiveStats() {
  const forcedCount = getArg("--count");
  const forcedRating = getArg("--rating");
  if (forcedCount) {
    return {
      count: parseInt(forcedCount, 10),
      rating: forcedRating ? Number(forcedRating) : null,
      source: "cli",
    };
  }

  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY not set and no --count provided. " +
        "Run with `--count <n>` or source the env file first."
    );
  }

  const resp = await fetch(`https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}`, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "rating,userRatingCount",
    },
  });
  if (!resp.ok) throw new Error(`Places API ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  if (typeof json.userRatingCount !== "number") {
    throw new Error("Places API returned no userRatingCount");
  }
  return {
    count: json.userRatingCount,
    rating: typeof json.rating === "number" ? Math.round(json.rating * 10) / 10 : null,
    source: "google",
  };
}

async function main() {
  const { count, rating, source } = await fetchLiveStats();
  const ratingStr = rating !== null ? rating.toFixed(1) : null;
  console.log(`Target: reviewCount=${count}${ratingStr ? `, ratingValue=${ratingStr}` : ""} (source: ${source})`);

  const files = [];
  for await (const entry of glob("**/*.html", { cwd: ROOT })) files.push(entry);

  let changed = 0;
  for (const rel of files) {
    const abs = path.join(ROOT, rel);
    const before = await readFile(abs, "utf8");
    let after = before;

    // 1) JSON-LD aggregateRating reviewCount (quoted string form used sitewide)
    after = after.replace(/("reviewCount"\s*:\s*")\d+(")/g, `$1${count}$2`);
    // 2) JSON-LD ratingValue (only if we have a live rating)
    if (ratingStr) {
      after = after.replace(/("ratingValue"\s*:\s*")\d+(?:\.\d+)?(")/g, `$1${ratingStr}$2`);
    }
    // 3) Visible static fallback text inside data-review spans
    after = after.replace(/(data-review="google-count"[^>]*>)\d+(<)/g, `$1${count}$2`);
    if (ratingStr) {
      after = after.replace(/(data-review="google-rating"[^>]*>)\d+(?:\.\d+)?(<)/g, `$1${ratingStr}$2`);
    }

    if (after !== before) {
      changed += 1;
      if (!DRY_RUN) await writeFile(abs, after);
    }
  }

  console.log(`${DRY_RUN ? "[dry-run] would update" : "Updated"} ${changed} of ${files.length} HTML files.`);
}

main().catch((err) => {
  console.error("sync-review-schema failed:", err.message);
  process.exit(1);
});
