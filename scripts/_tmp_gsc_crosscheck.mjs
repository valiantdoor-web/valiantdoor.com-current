import fs from 'node:fs'
import crypto from 'node:crypto'

const SA_PATH = 'scripts/_tmp_sa.json'
const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))

// --- mint a Google OAuth access token from the service account (JWT bearer grant) ---
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
async function getToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(`${header}.${claim}`)
  const sig = b64url(signer.sign(sa.private_key))
  const assertion = `${header}.${claim}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  return res.json()
}

async function listSites(token) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.json()
}

async function queryPages(token, siteUrl) {
  const end = new Date().toISOString().slice(0, 10)
  const start = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, dimensions: ['page'], rowLimit: 25000 }),
    },
  )
  return res.json()
}

function normPath(u) {
  try { return new URL(u).pathname } catch { return u }
}

async function liveStatus(path) {
  const url = `https://www.valiantdoor.com${path}`
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' })
    let loc = res.headers.get('location') || ''
    if (loc.startsWith('https://www.valiantdoor.com')) loc = loc.slice('https://www.valiantdoor.com'.length)
    return { code: res.status, loc }
  } catch (e) {
    return { code: 'ERR', loc: e.message }
  }
}

const tok = await getToken()
if (!tok.access_token) {
  console.log('TOKEN ERROR:', JSON.stringify(tok))
  process.exit(1)
}
const token = tok.access_token
const sites = await listSites(token)
const entries = (sites.siteEntry || []).map((s) => `${s.siteUrl} [${s.permissionLevel}]`)
console.log('SITES VISIBLE:', entries.length ? entries.join(', ') : '(none)')

let SITE = null
const candidates = entries.length
  ? (sites.siteEntry || []).map((s) => s.siteUrl)
  : ['sc-domain:valiantdoor.com', 'https://www.valiantdoor.com/', 'https://valiantdoor.com/']
for (const cand of candidates) {
  const test = await queryPages(token, cand)
  if (!test.error) { SITE = cand; break }
  console.log(`  probe ${cand}: DENIED (${test.error.status})`)
}
if (!SITE) {
  console.log('\nNO ACCESS YET — add the service account to Search Console, then re-run.')
  process.exit(0)
}
console.log('USING PROPERTY:', SITE)

const data = await queryPages(token, SITE)
const rows = data.rows || []
console.log(`INDEXED/RANKING PAGES (last 120d): ${rows.length}`)

// check each live
const results = []
for (const r of rows) {
  const path = normPath(r.keys[0])
  const st = await liveStatus(path)
  results.push({ path, clicks: r.clicks, impressions: r.impressions, ...st })
}

const broken = results.filter((r) => r.code === 404 || r.code === 410 || r.code === 'ERR')
const redirected = results.filter((r) => String(r.code).startsWith('3'))
const ok = results.filter((r) => r.code === 200)

const byImp = (a, b) => b.impressions - a.impressions
console.log(`\n===== 404 / GONE (ranked in Google, now broken) : ${broken.length} =====`)
for (const r of broken.sort(byImp)) console.log(`  [${r.code}] ${r.path}  (clicks:${r.clicks} impr:${r.impressions})`)

console.log(`\n===== REDIRECTED (ranked URL now 3xx) : ${redirected.length} =====`)
for (const r of redirected.sort(byImp)) console.log(`  [${r.code}] ${r.path} -> ${r.loc}  (clicks:${r.clicks} impr:${r.impressions})`)

console.log(`\n===== OK 200 : ${ok.length} (healthy) =====`)
fs.writeFileSync('/tmp/gsc_results.json', JSON.stringify(results, null, 2))
console.log('\n(full results -> /tmp/gsc_results.json)')
