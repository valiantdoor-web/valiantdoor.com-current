#!/usr/bin/env node
/**
 * Sync BabyLoveGrowth published articles into static, SEO-indexable HTML pages
 * under /repair-guides/<slug>/ and refresh the repair-guides index + blog sitemap.
 *
 * The API key is read from the BABYLOVEGROWTH_API_KEY environment variable and is
 * NEVER written into any generated file or committed to the repo.
 *
 * Usage:
 *   BABYLOVEGROWTH_API_KEY=xxxx node scripts/sync-babylovegrowth.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.BABYLOVEGROWTH_API_KEY;
const BASE = 'https://api.babylovegrowth.ai/api/integrations/v1';
const SITE = 'https://www.valiantdoor.com';
const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, 'public', 'repair-guides');
const INDEX_FILE = path.join(OUT_ROOT, 'index.html');
const SITEMAP_FILE = path.join(ROOT, 'public', 'sitemap-blog.xml');
const CHROME_SOURCE = path.join(ROOT, 'public', 'blog', 'emergency-garage-door-repair-guide', 'index.html');

if (!API_KEY) {
  console.error('[sync] ERROR: BABYLOVEGROWTH_API_KEY is not set. Aborting.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiGet(pathname, { retries = 4 } = {}) {
  const url = `${BASE}${pathname}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    });
    if (res.status === 429) {
      const wait = 2000 * (attempt + 1);
      console.warn(`[sync] 429 rate-limited on ${pathname}; waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status}`);
    return res.json();
  }
  throw new Error(`GET ${pathname} failed after ${retries} retries (rate limited)`);
}

const escAttr = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escText = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isoDate = (s) => {
  try { return new Date(s).toISOString().slice(0, 10); } catch { return new Date().toISOString().slice(0, 10); }
};

/** Remove scripts and the leading duplicate H1 + hero image from API HTML. */
function normalizeContent(html = '') {
  let out = html;
  out = out.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/i, '');
  out = out.replace(/^\s*<p>\s*<img\b[^>]*>\s*<\/p>/i, '');
  out = out.replace(/^\s*<img\b[^>]*>/i, '');
  return out.trim();
}

/** Extract the shared <header> and <footer> chrome from an existing page. */
async function loadChrome() {
  const src = await readFile(CHROME_SOURCE, 'utf8');
  const header = src.match(/<header\b[\s\S]*?<\/header>/i);
  const footer = src.match(/<footer\b[\s\S]*?<\/footer>/i);
  if (!header || !footer) throw new Error('Could not extract header/footer chrome from source page');
  return { header: header[0], footer: footer[0] };
}

function buildSchema(a, url) {
  const published = isoDate(a.created_at);
  const modified = isoDate(a.updated_at);
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['HomeAndConstructionBusiness', 'LocalBusiness'],
        '@id': `${SITE}/#business`,
        name: 'Valiant Garage Door',
        url: `${SITE}/`,
        telephone: '9254094974',
        email: 'vm@valiantdoor.com',
        priceRange: '$$',
        logo: `${SITE}/assets/logo/valiant-logo-gold.png`,
        image: `${SITE}/assets/home-optimized/shield-192.webp`,
        address: {
          '@type': 'PostalAddress',
          streetAddress: '3588 Pimlico Dr',
          addressLocality: 'Pleasanton',
          addressRegion: 'CA',
          postalCode: '94588',
          addressCountry: 'US',
        },
        areaServed: ['Pleasanton, CA', 'Dublin, CA', 'Livermore, CA', 'Fremont, CA', 'San Ramon, CA', 'Danville, CA', 'Sunol, CA'].map((n) => ({ '@type': 'City', name: n })),
        geo: { '@type': 'GeoCoordinates', latitude: 37.676357, longitude: -121.894745 },
        sameAs: [
          'https://www.google.com/maps/search/?api=1&query=Valiant%20Garage%20Door%203588%20Pimlico%20Dr%20Pleasanton%20CA%2094588&query_place_id=ChIJreu0MBcWcgMRQnyWHvhS94w',
          'https://www.yelp.com/biz/valiant-garage-door-pleasanton',
          'https://www.instagram.com/valiantgaragedoor',
          'https://www.linkedin.com/company/valiant-garage-door',
          'https://www.facebook.com/ValiantGD',
          'https://www.pinterest.com/valiantgd',
          'https://www.x.com/valiantgd',
          'https://www.tiktok.com/@valiantdoor',
          'https://www.youtube.com/@Valiantdoor',
          'https://nextdoor.com/pages/valiant-garage-door-san-leandro-ca',
        ],
      },
      { '@type': 'WebSite', '@id': `${SITE}/#website`, url: `${SITE}/`, name: 'Valiant Garage Door', publisher: { '@id': `${SITE}/#business` } },
      {
        '@type': ['Article', 'WebPage'],
        '@id': `${url}#webpage`,
        url,
        name: `${a.title} | Valiant Garage Door`,
        description: a.meta_description || a.excerpt || '',
        inLanguage: 'en-US',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': `${SITE}/#business` },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        image: a.hero_image_url || undefined,
        datePublished: published,
        dateModified: modified,
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Repair Guides', item: `${SITE}/repair-guides` },
          { '@type': 'ListItem', position: 3, name: a.title, item: url },
        ],
      },
      {
        '@type': 'Article',
        headline: a.title,
        datePublished: published,
        dateModified: modified,
        author: { '@type': 'Person', name: 'Valentino Ramirez' },
        publisher: { '@id': `${SITE}/#business` },
        mainEntityOfPage: url,
        image: a.hero_image_url || undefined,
      },
    ],
  };
  const scripts = [`<script type="application/ld+json">${JSON.stringify(graph)}</script>`];
  if (a.faqJsonLd && typeof a.faqJsonLd === 'object' && a.faqJsonLd.mainEntity) {
    scripts.push(`<script type="application/ld+json">${JSON.stringify(a.faqJsonLd)}</script>`);
  }
  return scripts.join('\n');
}

function faqSection(a) {
  const faq = a.faqJsonLd;
  if (!faq || !Array.isArray(faq.mainEntity) || faq.mainEntity.length === 0) return '';
  const items = faq.mainEntity
    .map((q) => {
      const ans = q.acceptedAnswer && q.acceptedAnswer.text ? q.acceptedAnswer.text : '';
      return `<details class="geo-faq-item"><summary>${escText(q.name)}</summary><p>${escText(ans)}</p></details>`;
    })
    .join('');
  return `<section class="geo-section"><h2>Frequently Asked Questions</h2><div class="geo-faq-list">${items}</div></section>`;
}

function buildPage(a, chrome) {
  const url = `${SITE}/repair-guides/${a.slug}`;
  const title = `${a.title} | Valiant Garage Door`;
  const desc = a.meta_description || a.excerpt || '';
  const hero = a.hero_image_url || `${SITE}/assets/home-optimized/shield-192.webp`;
  const content = normalizeContent(a.content_html);
  const schema = buildSchema(a, url);
  const heroFigure = a.hero_image_url
    ? `<figure class="geo-section"><img src="${escAttr(a.hero_image_url)}" alt="${escAttr(a.title)}" loading="eager" decoding="async" style="width:100%;height:auto;border-radius:14px"></figure>`
    : '';

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escText(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" type="text/plain" href="/llms.txt" title="LLM summary for Valiant Garage Door">
<link rel="icon" href="/assets/home-optimized/shield-192.webp" type="image/webp">
<meta property="og:title" content="${escAttr(title)}">
<meta property="og:description" content="${escAttr(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="article">
<meta property="og:image" content="${escAttr(hero)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escAttr(title)}">
<meta name="twitter:description" content="${escAttr(desc)}">
<meta name="twitter:image" content="${escAttr(hero)}">
<link rel="stylesheet" href="/css/styles.min.css?v=20260703-header-buttons">
${schema}
<style>.geo-article-body img{max-width:100%;height:auto;border-radius:12px;margin:16px 0}.geo-article-body h2{margin-top:28px}.geo-article-body ul,.geo-article-body ol{padding-left:22px}.geo-article-body li{margin:6px 0}</style>
<link rel="stylesheet" href="/css/global-chrome.css">
</head>
<body class="page-services page-geo has-sticky-call">
<div class="home-sticky-call" role="region" aria-label="Emergency repair call button"><a class="home-sticky-call-button" href="tel:+19254094974">Tap to Call for Emergency Repair.</a></div>
${chrome.header}
<main class="services-shell geo-shell">
<nav class="geo-breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span>&rsaquo;</span><a href="/repair-guides">Repair Guides</a><span>&rsaquo;</span><span>${escText(a.title)}</span></nav>
<section class="geo-hero">
<p class="geo-eyebrow">Repair guide</p>
<h1>${escText(a.title)}</h1>
${desc ? `<p class="geo-intro">${escText(desc)}</p>` : ''}
</section>
${heroFigure}
<section class="geo-section geo-article-body">
${content}
</section>
${faqSection(a)}
<section class="geo-section"><h2>Related Valiant Pages</h2><ul><li><a class="geo-text-link" href="/garage-door-repair">Garage Door Repair</a></li><li><a class="geo-text-link" href="/garage-door-spring-replacement">Garage Door Spring Replacement</a></li><li><a class="geo-text-link" href="/garage-door-opener-repair">Garage Door Opener Repair</a></li><li><a class="geo-text-link" href="/emergency-garage-door-repair">Emergency Garage Door Repair</a></li><li><a class="geo-text-link" href="/repair-guides">All Repair Guides</a></li></ul></section>
<section class="geo-section geo-cta-strip"><h2>Ready For A Clear Next Step?</h2><p>Call <a href="tel:+19254094974">(925) 409-4974</a>, <a href="/quote">request an appointment</a>, or <a href="https://book.housecallpro.com/book/Valiant-Garage-Door/ae8e4a137c8c49b4b264073541533a7a?v2=true" target="_blank" rel="noopener noreferrer">book a free estimate instantly</a>.</p></section>
</main>
${chrome.footer}
<script src="/js/main.min.js?v=20260702-bot-close"></script>
<script src="/js/global-chrome.js" defer></script>
</body></html>`;
}

function renderCard(a) {
  const excerpt = (a.meta_description || a.excerpt || '').slice(0, 160);
  return `<article class="geo-blog-card"><h3><a href="/repair-guides/${a.slug}">${escText(a.title)}</a></h3><p>${escText(excerpt)}</p><a class="geo-text-link" href="/repair-guides/${a.slug}">Read Guide</a></article>`;
}

async function injectIndexCards(cardsHtml) {
  let idx = await readFile(INDEX_FILE, 'utf8');
  const start = '<!--BLG:CARDS:START-->';
  const end = '<!--BLG:CARDS:END-->';
  const block = `${start}\n<div class="geo-blog-grid">${cardsHtml}</div>\n${end}`;
  if (idx.includes(start) && idx.includes(end)) {
    idx = idx.replace(new RegExp(`${start}[\\s\\S]*?${end}`), block);
    await writeFile(INDEX_FILE, idx, 'utf8');
    console.log('[sync] repair-guides index cards updated');
  } else {
    console.warn('[sync] WARNING: card markers not found in index; skipping index injection');
  }
}

async function updateSitemap(articles) {
  let xml = await readFile(SITEMAP_FILE, 'utf8');
  // Drop any existing repair-guides entries, then re-add current ones.
  xml = xml.replace(/\s*<url>\s*<loc>https:\/\/www\.valiantdoor\.com\/repair-guides\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
  const entries = articles
    .map((a) => `  <url>\n    <loc>${SITE}/repair-guides/${a.slug}</loc>\n    <lastmod>${isoDate(a.updated_at)}</lastmod>\n  </url>`)
    .join('\n');
  xml = xml.replace(/\s*<\/urlset>\s*$/, `\n${entries}\n</urlset>\n`);
  await writeFile(SITEMAP_FILE, xml, 'utf8');
  console.log(`[sync] sitemap-blog.xml updated with ${articles.length} repair-guide URLs`);
}

async function main() {
  console.log('[sync] fetching article list...');
  const list = await apiGet('/articles');
  const published = (Array.isArray(list) ? list : []).filter((a) => a.published);
  console.log(`[sync] ${published.length} published of ${Array.isArray(list) ? list.length : 0} total`);
  if (published.length === 0) {
    console.log('[sync] nothing published; exiting without changes');
    return;
  }
  const chrome = await loadChrome();
  const full = [];
  for (const meta of published) {
    console.log(`[sync] fetching #${meta.id} ${meta.slug}`);
    const a = await apiGet(`/articles/${meta.id}`);
    const dir = path.join(OUT_ROOT, a.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), buildPage(a, chrome), 'utf8');
    console.log(`[sync]   wrote repair-guides/${a.slug}/index.html`);
    full.push(a);
    await sleep(1500); // stay under the rate limit
  }
  // newest first
  full.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
  await injectIndexCards(full.map(renderCard).join(''));
  await updateSitemap(full);
  console.log('[sync] done.');
}

main().catch((e) => {
  console.error('[sync] FAILED:', e.message);
  process.exit(1);
});
