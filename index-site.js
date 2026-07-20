/**
 * index-site.js
 * -----------------------------------------------------------------------------
 * Submit static URLs to the Google Web Search Indexing API for instant
 * re-crawling. Sends a URL_UPDATED notification for each URL.
 *
 * Usage:
 *   node index-site.js
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

// Key URLs to notify Google about. Add/remove as needed.
const URLS = [
  "https://www.valiantdoor.com/",
  "https://www.valiantdoor.com/mastertech",
  "https://www.valiantdoor.com/garage-door-repair",
  "https://www.valiantdoor.com/short-repair-videos",
]

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
  const creds = loadCredentials()
  const auth = makeAuthClient(creds)

  console.log("[index] Authenticating as %s", creds.client_email)
  await auth.authorize() // fail fast if the key is invalid

  const indexing = google.indexing({ version: "v3", auth })

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
  }

  console.log("\n[index] Done. %d succeeded, %d failed, %d total.", ok, failed, URLS.length)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error("[index] Fatal:", err.message || err)
  process.exit(1)
})
