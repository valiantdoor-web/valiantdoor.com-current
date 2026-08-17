#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const WRITE = process.argv.includes("--write");

const CORE = [
  "Pleasanton, CA",
  "Dublin, CA",
  "Livermore, CA",
  "Fremont, CA",
  "San Ramon, CA",
  "Danville, CA",
  "Sunol, CA",
].map((name) => ({ "@type": "City", name }));

function walkHtml(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(absolute, output);
    else if (entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

function includesBusinessType(value) {
  const types = Array.isArray(value) ? value : [value];
  return types.some((type) =>
    ["LocalBusiness", "HomeAndConstructionBusiness", "GarageDoor"].includes(type)
  );
}

function normalize(node) {
  let changed = false;
  if (!node || typeof node !== "object") return changed;
  if (Array.isArray(node)) {
    for (const item of node) if (normalize(item)) changed = true;
    return changed;
  }

  if (includesBusinessType(node["@type"]) && Array.isArray(node.areaServed)) {
    if (JSON.stringify(node.areaServed) !== JSON.stringify(CORE)) {
      node.areaServed = CORE;
      changed = true;
    }
  }

  for (const value of Object.values(node)) {
    if (normalize(value)) changed = true;
  }
  return changed;
}

let filesChanged = 0;
let blocksChanged = 0;

for (const file of walkHtml(PUBLIC)) {
  const before = fs.readFileSync(file, "utf8");
  let touched = false;
  const after = before.replace(
    /(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (full, open, body, close) => {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        return full;
      }
      if (!normalize(data)) return full;
      touched = true;
      blocksChanged += 1;
      const indent = body.match(/\n(\s+)\S/)?.[1]?.length || 2;
      return `${open}\n${JSON.stringify(data, null, indent)}\n${close}`;
    }
  );

  if (touched) {
    filesChanged += 1;
    if (WRITE) fs.writeFileSync(file, after);
  }
}

console.log(
  JSON.stringify(
    {
      mode: WRITE ? "write" : "dry-run",
      filesChanged,
      blocksChanged,
      coreCities: CORE.map((item) => item.name),
    },
    null,
    2
  )
);
