/**
 * index-site.js
 * -----------------------------------------------------------------------------
 * Submit static URLs to the Google Web Search Indexing API for instant
 * re-crawling. Sends a URL_UPDATED notification for each URL.
 *
 * Usage:
 *   node index-site.js                       # submit ALL canonical pages (full run)
 *   INDEX_URLS="https://.../a\nhttps://.../b" node index-site.js
 *                                            # submit ONLY the given URLs
 *                                            # (validated against the sitemaps)
 *
 * Auth (in order of precedence):
 *   1. service-account.json  in the project root (git-ignored)
 *   2. GOOGLE_INDEXING_KEY   env var containing the raw JSON of the key
 *
 * The service account's email must be added as an Owner of the property in
 * Google Search Console, otherwise every request returns 403 Permission denied.
 *
 * NOTE: The Indexing API is officially intended for pages with JobPosting or
 * BroadcastEvent (livestream) structured data. It often works for other pages
 * too, but Google does not guarantee it — treat this as a "nudge," and keep
 * your sitemaps as the primary signal.
 * -----------------------------------------------------------------------------
 */

const fs = require("node:fs")
const path = require("node:path")
const { google } = require("googleapis")

const SCOPES = ["https://www.googleapis.com/auth/indexing"]
const ENDPOINT_TYPE = "URL_UPDATED" // use "URL_DELETED" to notify of removals

// Sitemaps that list the canonical, indexable pages. Read at runtime so the
// submission always covers every live page without hand-maintaining a list.
const SITEMAP_FILES = ["public/sitemap-pages.xml", "public/sitemap-blog.xml"]

// Fallback if no sitemaps are found (keeps the script usable in isolation).
const FALLBACK_URLS = [
  "https://www.valiantdoor.com/",
  "https://www.valiantdoor.com/mastertech",
  "https://www.valiantdoor.com/garage-door-repair",
  "https://www.valiantdoor.com/short-repair-videos",
]

// Retired resources (return 410). Never submit these to Google, even if a
// stray sitemap entry references them.
const RETIRED = ["/amazon-alexa", "/authority-dashboard", "/search-atlas-growth"]

const isRetired = (u) => {
  const p = u.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "")
  return RETIRED.includes(p)
}

/** Collect the canonical, indexable URLs from the local sitemap files. */
function collectSitemapUrls() {
  const urls = new Set()
  for (const rel of SITEMAP_FILES) {
    const file = path.resolve(process.cwd(), rel)
    if (!fs.existsSync(file)) continue
    const xml = fs.readFileSync(file, "utf8")
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      urls.add(m[1].trim())
    }
  }
  const all = urls.size > 0 ? [...urls] : FALLBACK_URLS
  return all.filter((u) => !isRetired(u)) // defensively drop retired paths
}

/**
 * Decide which URLs to submit.
 * - "changed" mode (INDEX_MODE=changed, push-triggered): submit ONLY the URLs in
 *   INDEX_URLS, validated against the canonical sitemap set so we never push
 *   junk, fragments (#...), query strings, or retired 410 paths to Google. An
 *   empty list means "nothing changed" -> submit nothing (conserves quota).
 * - "full" mode (default / manual re-index): submit every canonical page.
 */
function selectUrls() {
  const canonical = collectSitemapUrls()
  if (process.env.INDEX_MODE !== "changed") {
    return { urls: canonical, mode: "full" }
  }

  const raw = (process.env.INDEX_URLS || "").trim()
  const canonicalSet = new Set(canonical)
  const requested = raw
    .split(/[\s,]+/)
    .map((u) => u.trim())
    .filter(Boolean)
  const seen = new Set()
  const valid = []
  const skipped = []
  for (const u of requested) {
    if (canonicalSet.has(u) && !seen.has(u)) {
      seen.add(u)
      valid.push(u)
    } else if (!canonicalSet.has(u)) {
      skipped.push(u)
    }
  }
  if (skipped.length) {
    console.log("[index] Skipped %d non-canonical/ignored URL(s):", skipped.length)
    skipped.forEach((u) => console.log("[index]   - %s", u))
  }
  return { urls: valid, mode: "changed" }
}

const { urls: URLS, mode: RUN_MODE } = selectUrls()

/** Load service-account credentials from file or env var. */
function loadCredentials() {
  const keyPath = path.resolve(process.cwd(), "service-account.json")
  if (fs.existsSync(keyPath)) {
    return JSON.parse(fs.readFileSync(keyPath, "utf8"))
  }
  if (process.env.GOOGLE_INDEXING_KEY) {
    return JSON.parse(process.env.GOOGLE_INDEXING_KEY)
  }
  console.error(
    "[index] No credentials found. Place a service-account.json in the project " +
      "root, or set the GOOGLE_INDEXING_KEY env var to the key JSON.",
  )
  process.exit(1)
}

/** Build an authenticated JWT client for the Indexing API. */
function makeAuthClient(creds) {
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  })
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")

  if (URLS.length === 0) {
    console.log(
      "[index] No indexable URLs to submit (%s mode). Nothing to do.",
      RUN_MODE,
    )
    return
  }

  if (dryRun) {
    console.log("[index] DRY RUN — %d URL(s) selected (%s mode):", URLS.length, RUN_MODE)
    URLS.forEach((u) => console.log("[index]   %s", u))
    return
  }

  const creds = loadCredentials()
  const auth = makeAuthClient(creds)

  console.log("[index] Authenticating as %s", creds.client_email)
  await auth.authorize() // fail fast if the key is invalid

  const indexing = google.indexing({ version: "v3", auth })

  console.log(
    "[index] Submitting %d URL(s) as %s (%s mode) ...",
    URLS.length,
    ENDPOINT_TYPE,
    RUN_MODE,
  )
  console.log(
    "[index] Note: the Indexing API default quota is 200 publish requests/day.",
  )

  let ok = 0
  let failed = 0

  for (const url of URLS) {
    try {
      const res = await indexing.urlNotifications.publish({
        requestBody: { url, type: ENDPOINT_TYPE },
      })
      const notifyTime = res.data?.urlNotificationMetadata?.latestUpdate?.notifyTime
      console.log("[index] OK      %s  (%s%s)", url, ENDPOINT_TYPE, notifyTime ? " @ " + notifyTime : "")
      ok++
    } catch (err) {
      const status = err?.code || err?.response?.status || "ERR"
      const reason = err?.response?.data?.error?.message || err.message || "Unknown error"
      console.error("[index] FAILED  %s  ->  [%s] %s", url, status, reason)
      failed++
    }
    // Gentle throttle to stay well under the per-minute rate limit.
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log("\n[index] Done. %d succeeded, %d failed, %d total.", ok, failed, URLS.length)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error("[index] Fatal:", err.message || err)
  process.exit(1)
})
