#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const cheerio = require('cheerio');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const quality = '82';

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function cleanSrc(src) {
  const [pathname] = String(src || '').split(/[?#]/);
  return pathname;
}

function toLocalFile(srcPath) {
  if (!srcPath.startsWith('/') || srcPath.startsWith('//')) return null;
  if (!/\.(png|jpe?g)$/i.test(srcPath)) return null;
  const decoded = decodeURIComponent(srcPath);
  const file = path.join(publicDir, decoded);
  if (!file.startsWith(publicDir) || !fs.existsSync(file)) return null;
  return file;
}

function webpPathFor(file) {
  return file.replace(/\.(png|jpe?g)$/i, '.webp');
}

function convert(file) {
  const out = webpPathFor(file);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) return out;
  const result = spawnSync('cwebp', ['-quiet', '-q', quality, file, '-o', out], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.warn(`Skipped ${file}: ${String(result.stderr || result.stdout).split('\n')[0]}`);
    return file;
  }
  return out;
}

let converted = 0;
let changedPages = 0;
const convertedFiles = new Set();
for (const htmlFile of walk(publicDir)) {
  const html = fs.readFileSync(htmlFile, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  let changed = false;
  $('img[src]').each((_, el) => {
    const src = $(el).attr('src');
    const srcPath = cleanSrc(src);
    const local = toLocalFile(srcPath);
    if (!local) return;
    const out = convert(local);
    if (out === local) return;
    convertedFiles.add(path.relative(root, out));
    const relPublic = '/' + path.relative(publicDir, out).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/');
    const suffix = String(src).slice(srcPath.length);
    $(el).attr('src', relPublic + suffix);
    changed = true;
  });
  if (changed) {
    fs.writeFileSync(htmlFile, $.html());
    changedPages++;
  }
}
console.log(`Updated ${changedPages} HTML pages; webp files present/created: ${convertedFiles.size}.`);
