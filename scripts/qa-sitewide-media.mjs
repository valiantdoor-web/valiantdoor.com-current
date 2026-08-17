import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public");
const textExtensions = new Set([".html", ".css", ".js", ".json", ".xml", ".webmanifest", ".txt"]);
const mediaExtensions = /\.(?:avif|gif|ico|jpe?g|m4v|mov|mp4|ogg|png|svg|webm|webp)(?:[?#].*)?$/i;
const textFiles = [];
const references = [];
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) textFiles.push(full);
  }
}

function lineNumber(text, index) {
  return text.slice(0, index).split("\n").length;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function addReference(file, text, index, type, raw) {
  let value = decodeEntities(raw.trim());
  if (!value || /^data:|^blob:|^\$\{|^#/.test(value)) return;
  if (type === "srcset") {
    for (const candidate of value.split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) addReference(file, text, index, "srcset-candidate", url);
    }
    return;
  }
  references.push({
    file: path.relative(process.cwd(), file),
    line: lineNumber(text, index),
    type,
    value,
  });
}

walk(root);

for (const file of textFiles) {
  const text = fs.readFileSync(file, "utf8");
  const extension = path.extname(file).toLowerCase();
  if (extension === ".html") {
    for (const match of text.matchAll(/\b(src|poster|data-src-landscape|data-src-portrait|content|href)="([^"]+)"/gi)) {
      const attr = match[1].toLowerCase();
      const value = match[2];
      if (!mediaExtensions.test(value) && !/youtube\.com\/embed|trusty\.app\/embed|google\.com\/maps|housecallpro\.com/i.test(value)) continue;
      addReference(file, text, match.index, attr, value);
    }
    for (const match of text.matchAll(/\b(srcset)="([^"]+)"/gi)) addReference(file, text, match.index, "srcset", match[2]);
  }

  for (const match of text.matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi)) {
    if (mediaExtensions.test(match[2])) addReference(file, text, match.index, "css-url", match[2]);
  }

  for (const match of text.matchAll(/https?:\/\/[^"'<>\\\s]+/gi)) {
    const value = match[0].replace(/[),.;]+$/, "");
    if (mediaExtensions.test(value) || /youtube\.com\/embed|trusty\.app\/embed|google\.com\/maps/i.test(value)) {
      addReference(file, text, match.index, "absolute-url", value);
    }
  }
}

const unique = new Map();
for (const ref of references) {
  const key = `${ref.type}\t${ref.value}`;
  if (!unique.has(key)) unique.set(key, ref);
}

for (const ref of references) {
  if (/^https?:\/\//i.test(ref.value) || /^\/\//.test(ref.value)) continue;
  let pathname = ref.value.split(/[?#]/)[0];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {}
  let target;
  if (pathname.startsWith("/")) {
    target = path.join(root, pathname.replace(/^\/+/, ""));
  } else {
    target = path.resolve(path.dirname(path.resolve(ref.file)), pathname);
  }
  if (!fs.existsSync(target)) {
    failures.push({ ...ref, resolved: path.relative(process.cwd(), target), reason: "missing local file" });
  } else if (fs.statSync(target).isFile() && fs.statSync(target).size === 0) {
    failures.push({ ...ref, resolved: path.relative(process.cwd(), target), reason: "zero-byte local file" });
  }
}

const counts = {};
for (const ref of references) counts[ref.type] = (counts[ref.type] ?? 0) + 1;

const external = [...new Set(references
  .map(ref => ref.value)
  .filter(value => /^https?:\/\//i.test(value) || /^\/\//.test(value)))]
  .sort();
const localUnique = [...new Set(references
  .map(ref => ref.value)
  .filter(value => !/^https?:\/\//i.test(value) && !/^\/\//.test(value)))]
  .sort();

console.log(JSON.stringify({
  textFiles: textFiles.length,
  referenceCount: references.length,
  uniqueReferenceCount: unique.size,
  counts,
  uniqueLocalReferences: localUnique.length,
  uniqueExternalReferences: external.length,
  failures,
  external,
  localUnique,
}, null, 2));

if (failures.length) process.exitCode = 1;
