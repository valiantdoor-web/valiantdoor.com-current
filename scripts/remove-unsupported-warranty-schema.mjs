#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const WRITE = process.argv.includes("--write");

function walkHtml(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(absolute, output);
    else if (entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

function removeWarranty(node) {
  let changed = false;
  if (!node || typeof node !== "object") return changed;

  if (Array.isArray(node)) {
    for (let index = node.length - 1; index >= 0; index -= 1) {
      const item = node[index];
      if (item && typeof item === "object" && item["@type"] === "WarrantyPromise") {
        node.splice(index, 1);
        changed = true;
      } else if (removeWarranty(item)) {
        changed = true;
      }
    }
    return changed;
  }

  for (const key of Object.keys(node)) {
    if (key === "warranty") {
      delete node[key];
      changed = true;
      continue;
    }
    if (removeWarranty(node[key])) changed = true;
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
      if (!removeWarranty(data)) return full;
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
    },
    null,
    2
  )
);
