import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

const ROOT = process.cwd()
const PUBLIC = join(ROOT, "public")
const BASE = "https://valiantdoor.com"

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.name.endsWith(".html")) out.push(full)
  }
  return out
}

function fileToUrl(file) {
  let rel = relative(PUBLIC, file).replace(/\\/g, "/")
  if (rel === "index.html") return "/"
  if (rel.endsWith("/index.html")) return "/" + rel.slice(0, -"/index.html".length)
  return "/" + rel.slice(0, -".html".length)
}

const files = await walk(PUBLIC)
let changed = 0,
  same = 0,
  missing = 0,
  errors = 0
const changedList = []

for (const file of files) {
  const path = fileToUrl(file)
  const url = BASE + path
  try {
    const res = await fetch(url, { redirect: "follow" })
    if (res.status !== 200) {
      missing++
      console.log(`MISSING ${res.status} ${path}`)
      continue
    }
    const live = await res.text()
    const current = await readFile(file, "utf8")
    if (live === current) {
      same++
    } else {
      await writeFile(file, live)
      changed++
      changedList.push(path)
    }
  } catch (e) {
    errors++
    console.log(`ERROR ${path}: ${e.message}`)
  }
}

console.log("\n=== SUMMARY ===")
console.log("total:", files.length, "changed:", changed, "same:", same, "missing:", missing, "errors:", errors)
console.log("\n=== CHANGED FILES ===")
changedList.forEach((p) => console.log(p))
