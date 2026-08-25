/**
 * Submit the canonical sitemap to Google Search Console and inspect selected
 * canonical URLs. Google's separate Indexing API is supported only for
 * JobPosting and livestream pages, so it is intentionally not used here.
 *
 * Usage:
 *   node index-site.js --dry-run
 *   node index-site.js
 *   INDEX_MODE=changed INDEX_URLS="https://www.valiantdoor.com/faq" node index-site.js
 *
 * Auth, in order:
 *   1. service-account.json (git-ignored)
 *   2. GOOGLE_SEARCH_CONSOLE_KEY (raw service-account JSON)
 *   3. INDEXING_KEY (temporary backwards-compatible secret name)
 */

const fs = require("node:fs")
const path = require("node:path")
const { google } = require("googleapis")

const SITE_URL = "sc-domain:valiantdoor.com"
const SITEMAP_URL = "https://www.valiantdoor.com/sitemap.xml"
const SCOPES = ["https://www.googleapis.com/auth/webmasters"]
const SITEMAP_FILES = ["public/sitemap-pages.xml", "public/sitemap-blog.xml"]
const FALLBACK_URLS = [
  "https://www.valiantdoor.com/",
  "https://www.valiantdoor.com/mastertech",
  "https://www.valiantdoor.com/garage-door-repair",
  "https://www.valiantdoor.com/short-repair-videos",
]
const RETIRED = ["/amazon-alexa", "/authority-dashboard", "/search-atlas-growth"]

function isRetired(url) {
  const pathname = url.replace(/^https?:\/\/[^/]+/, "").replace(/\/$/, "")
  return RETIRED.includes(pathname)
}

function collectSitemapUrls() {
  const urls = new Set()
  for (const relativePath of SITEMAP_FILES) {
    const file = path.resolve(process.cwd(), relativePath)
    if (!fs.existsSync(file)) continue
    const xml = fs.readFileSync(file, "utf8")
    for (const match of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      urls.add(match[1].trim())
    }
  }
  return (urls.size ? [...urls] : FALLBACK_URLS).filter((url) => !isRetired(url))
}

function selectUrls() {
  const canonical = collectSitemapUrls()
  if (process.env.INDEX_MODE !== "changed") {
    return { urls: canonical, mode: "full" }
  }

  const canonicalSet = new Set(canonical)
  const requested = (process.env.INDEX_URLS || "")
    .trim()
    .split(/[\s,]+/)
    .map((url) => url.trim())
    .filter(Boolean)
  const urls = [...new Set(requested.filter((url) => canonicalSet.has(url)))]
  const skipped = [...new Set(requested.filter((url) => !canonicalSet.has(url)))]
  for (const url of skipped) console.log("[search-console] Skipped non-canonical URL: %s", url)
  return { urls, mode: "changed" }
}

function loadCredentials() {
  const keyPath = path.resolve(process.cwd(), "service-account.json")
  if (fs.existsSync(keyPath)) return JSON.parse(fs.readFileSync(keyPath, "utf8"))

  const raw = process.env.GOOGLE_SEARCH_CONSOLE_KEY || process.env.INDEXING_KEY
  if (raw) return JSON.parse(raw)

  throw new Error(
    "No credentials found. Add service-account.json or set GOOGLE_SEARCH_CONSOLE_KEY.",
  )
}

function makeAuthClient(credentials) {
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: SCOPES,
  })
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const { urls, mode } = selectUrls()

  console.log("[search-console] Property: %s", SITE_URL)
  console.log("[search-console] Sitemap:  %s", SITEMAP_URL)
  console.log("[search-console] Selected %d canonical URL(s) (%s mode).", urls.length, mode)

  if (dryRun) {
    for (const url of urls) console.log("[search-console]   %s", url)
    console.log("[search-console] DRY RUN: no Google API calls were made.")
    return
  }

  const credentials = loadCredentials()
  const auth = makeAuthClient(credentials)
  await auth.authorize()
  console.log("[search-console] Authenticated as %s", credentials.client_email)

  const webmasters = google.webmasters({ version: "v3", auth })
  const searchConsole = google.searchconsole({ version: "v1", auth })

  await webmasters.sitemaps.submit({ siteUrl: SITE_URL, feedpath: SITEMAP_URL })
  console.log("[search-console] Submitted canonical sitemap successfully.")

  if (urls.length === 0) {
    console.log("[search-console] No changed canonical URLs to inspect.")
    return
  }

  let inspected = 0
  let failed = 0
  for (const inspectionUrl of urls) {
    try {
      const response = await searchConsole.urlInspection.index.inspect({
        requestBody: { inspectionUrl, siteUrl: SITE_URL },
      })
      const result = response.data?.inspectionResult?.indexStatusResult || {}
      console.log(
        "[search-console] INSPECTED %s -> %s; coverage=%s",
        inspectionUrl,
        result.verdict || "UNKNOWN",
        result.coverageState || "unknown",
      )
      inspected++
    } catch (error) {
      const status = error?.code || error?.response?.status || "ERR"
      const reason = error?.response?.data?.error?.message || error.message || "Unknown error"
      console.error("[search-console] FAILED %s -> [%s] %s", inspectionUrl, status, reason)
      failed++
    }
  }

  console.log(
    "[search-console] Done. Sitemap submitted; %d inspected, %d failed.",
    inspected,
    failed,
  )
  console.log(
    "[search-console] URL Inspection reports Google status; it does not request indexing.",
  )
  if (failed) process.exitCode = 1
}

main().catch((error) => {
  console.error("[search-console] Fatal:", error.message || error)
  process.exit(1)
})
