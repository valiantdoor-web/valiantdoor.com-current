#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'data', 'authority');
const DOMAIN = 'https://www.valiantdoor.com';

function walkHtml(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkHtml(full, out);
    else if (name.endsWith('.html') && !/^google[0-9a-f]+\.html$/i.test(name)) out.push(full);
  }
  return out;
}

function pageUrlFromFile(filePath) {
  const rel = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

function normalizeInternalPath(href) {
  if (!href || typeof href !== 'string') return null;
  const clean = href.trim();
  if (!clean || clean.startsWith('#') || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('sms:')) return null;
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const url = new URL(clean);
      if (!['www.valiantdoor.com', 'valiantdoor.com'].includes(url.hostname)) return null;
      return url.pathname || '/';
    } catch (_) { return null; }
  }
  if (!clean.startsWith('/') || clean.startsWith('//')) return null;
  return clean.split('#')[0].split('?')[0] || '/';
}

function internalPathExists(urlPath) {
  const decoded = decodeURIComponent(urlPath || '/');
  const apiBackedPaths = new Set(['/agents.json', '/api/agents', '/api/searchatlas']);
  if (apiBackedPaths.has(decoded)) return true;
  const candidates = decoded === '/'
    ? [path.join(PUBLIC_DIR, 'index.html')]
    : [path.join(PUBLIC_DIR, decoded, 'index.html'), path.join(PUBLIC_DIR, decoded + '.html'), path.join(PUBLIC_DIR, decoded)];
  return candidates.some((candidate) => fs.existsSync(candidate));
}

function auditSite() {
  const files = walkHtml(PUBLIC_DIR);
  const pages = [];
  const issueTotals = { missingTitle: 0, longTitle: 0, missingDescription: 0, h1Problems: 0, missingCanonical: 0, brokenInternalLinks: 0, imageAltIssues: 0, imageSizeIssues: 0, nonOptimizedImages: 0 };

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const $ = cheerio.load(html);
    $('script,style,noscript,svg,template').remove();
    const title = ($('title').first().text() || '').trim();
    const description = ($('meta[name="description"]').first().attr('content') || '').trim();
    const h1s = $('h1').map((_, el) => $(el).text().trim().replace(/\s+/g, ' ')).get().filter(Boolean);
    const h2h3 = $('h2,h3').map((_, el) => `${el.tagName.toUpperCase()}: ${$(el).text().trim().replace(/\s+/g, ' ')}`).get().filter(Boolean).slice(0, 12);
    const canonical = ($('link[rel="canonical"]').first().attr('href') || '').trim();
    const pagePath = pageUrlFromFile(file);
    const expectedCanonical = DOMAIN + (pagePath === '/' ? '/' : pagePath);
    const bodyText = ($('body').text() || '').replace(/\s+/g, ' ').trim();
    const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
    const internalLinks = [];
    $('a[href]').each((_, el) => { const normalized = normalizeInternalPath($(el).attr('href')); if (normalized) internalLinks.push(normalized); });
    const broken = [...new Set(internalLinks)].filter((href) => !internalPathExists(href));
    const images = $('img').map((_, el) => ({ src: ($(el).attr('src') || '').trim(), alt: ($(el).attr('alt') || '').trim(), width: ($(el).attr('width') || '').trim(), height: ($(el).attr('height') || '').trim() })).get();
    const missingAlt = images.filter((img) => !img.alt).length;
    const missingSize = images.filter((img) => !img.width || !img.height).length;
    const nonOptimized = images.filter((img) => img.src && !/\.(webp|avif)(\?|#|$)/i.test(img.src) && /\.(png|jpe?g|gif)(\?|#|$)/i.test(img.src)).length;

    if (!title) issueTotals.missingTitle += 1;
    if (title.length > 60) issueTotals.longTitle += 1;
    if (!description) issueTotals.missingDescription += 1;
    if (h1s.length !== 1) issueTotals.h1Problems += 1;
    if (!canonical) issueTotals.missingCanonical += 1;
    issueTotals.brokenInternalLinks += broken.length;
    issueTotals.imageAltIssues += missingAlt;
    issueTotals.imageSizeIssues += missingSize;
    issueTotals.nonOptimizedImages += nonOptimized;

    const issueCount = (!title ? 1 : 0) + (title.length > 60 ? 1 : 0) + (!description ? 1 : 0) + (h1s.length !== 1 ? 1 : 0) + (!canonical ? 1 : 0) + broken.length + missingAlt + missingSize;
    pages.push({ path: pagePath, title, titleLength: title.length, descriptionLength: description.length, h1Count: h1s.length, h1: h1s[0] || '', outline: h2h3, wordCount, canonical, canonicalLooksCorrect: canonical === expectedCanonical || canonical === expectedCanonical + '/', internalLinkCount: internalLinks.length, brokenInternalLinks: broken.slice(0, 20), imageCount: images.length, missingAlt, missingSize, nonOptimized, issueCount });
  }
  pages.sort((a, b) => b.issueCount - a.issueCount || a.path.localeCompare(b.path));
  const blockingIssueTotal = Object.entries(issueTotals).filter(([key]) => key !== 'nonOptimizedImages').reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const optimizationOpportunityTotal = Number(issueTotals.nonOptimizedImages || 0);
  return { scannedAt: new Date().toISOString(), pageCount: pages.length, issueTotals, issueTotal: blockingIssueTotal, optimizationOpportunityTotal, topIssuePages: pages.slice(0, 40), pages };
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const audit = auditSite();
fs.writeFileSync(path.join(OUT_DIR, 'site-audit-snapshot.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, 'site-audit-snapshot.json'))} (${audit.pageCount} pages, ${audit.issueTotal} issues).`);
