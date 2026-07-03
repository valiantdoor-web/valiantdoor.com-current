import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises"
import { join, relative, dirname } from "node:path"

const ROOT = process.cwd()
const PUBLIC = join(ROOT, "public")
const BASE = "https://valiantdoor.com"

async function walk(dir, filter) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full, filter)))
    else if (filter(entry.name)) out.push(full)
  }
  return out
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function download(path) {
  const url = BASE + path
  const res = await fetch(url, { redirect: "follow" })
  if (res.status !== 200) return { ok: false, status: res.status }
  const buf = Buffer.from(await res.arrayBuffer())
  const dest = join(PUBLIC, path.split("?")[0])
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, buf)
  return { ok: true, bytes: buf.length }
}

// 1) Collect all local asset references from HTML files
const htmlFiles = await walk(PUBLIC, (n) => n.endsWith(".html"))
const refs = new Set()
const attrRe = /(?:src|href)\s*=\s*"([^"]+)"/gi
const srcsetRe = /srcset\s*=\s*"([^"]+)"/gi
const imagesrcsetRe = /imagesrcset\s*=\s*"([^"]+)"/gi

for (const f of htmlFiles) {
  const html = await readFile(f, "utf8")
  let m
  while ((m = attrRe.exec(html))) refs.add(m[1])
  while ((m = srcsetRe.exec(html))) m[1].split(",").forEach((s) => refs.add(s.trim().split(/\s+/)[0]))
  while ((m = imagesrcsetRe.exec(html))) m[1].split(",").forEach((s) => refs.add(s.trim().split(/\s+/)[0]))
}

// 2) Filter to local static assets (images, css, js, fonts, etc.), skip pages/anchors/external
const assetExt = /\.(webp|png|jpe?g|gif|svg|ico|css|js|mjs|woff2?|ttf|otf|webmanifest|json|mp4|webm|avif|xml|txt|pdf)$/i
const assets = [...refs]
  .filter((r) => r.startsWith("/"))
  .filter((r) => !r.startsWith("//"))
  .filter((r) => assetExt.test(r.split("?")[0]))

// 3) Always refresh CSS/JS bundles (versioned), download missing assets
let downloaded = 0,
  skipped = 0,
  failed = 0
const failedList = []
const isBundle = (p) => /\.(css|js|mjs)$/i.test(p.split("?")[0])

for (const a of [...new Set(assets)]) {
  const localPath = join(PUBLIC, a.split("?")[0])
  const need = isBundle(a) || !(await exists(localPath))
  if (!need) {
    skipped++
    continue
  }
  const r = await download(a)
  if (r.ok) {
    downloaded++
    console.log(`GET ${a.split("?")[0]} (${r.bytes}b)`)
  } else {
    failed++
    failedList.push(`${r.status} ${a}`)
  }
}

console.log("\n=== SUMMARY ===")
console.log("refs:", refs.size, "assets:", new Set(assets).size, "downloaded:", downloaded, "skipped(existing):", skipped, "failed:", failed)
if (failedList.length) {
  console.log("\n=== FAILED ===")
  failedList.forEach((x) => console.log(x))
}
