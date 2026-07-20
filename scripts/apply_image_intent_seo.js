#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const SITE = 'https://www.valiantdoor.com';
const TODAY = '2026-06-26';

const companyCam = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets/gallery-before-after/manifest.json'), 'utf8'));
const companyBySlug = Object.fromEntries(companyCam.map(x => [x.slug, x]));

const proofSets = {
  dublin: [
    'dublin-garage-door-repair-section-hardware-before-after',
    'dublin-garage-door-repair-bottom-retainer-before-after',
    'dublin-garage-door-repair-bracket-hinge-before-after',
  ],
  danville: [
    'danville-garage-door-repair-spring-hardware-before-after',
    'danville-garage-door-repair-track-hardware-before-after',
  ],
  sanramon: [
    'san-ramon-garage-door-spring-repair-before-after',
    'san-ramon-garage-door-repair-end-plate-before-after',
  ],
  emergency: [
    'san-ramon-garage-door-spring-repair-before-after',
    'danville-garage-door-repair-spring-hardware-before-after',
    'dublin-garage-door-repair-section-hardware-before-after',
  ],
  repair: [
    'dublin-garage-door-repair-section-reinforcement-before-after',
    'dublin-garage-door-repair-center-stile-before-after',
    'danville-garage-door-repair-track-hardware-before-after',
  ],
};

function walk(dir, out=[]) {
  for (const ent of fs.readdirSync(dir, {withFileTypes:true})) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.isFile() && ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function routeFor(file) {
  let rel = path.relative(PUBLIC, file).replace(/\\/g, '/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
  return '/' + rel.replace(/\.html$/, '');
}

function canonicalFrom($, file) {
  const canon = $('link[rel="canonical"]').attr('href');
  if (canon) return canon;
  return SITE + routeFor(file);
}

function titleFrom($, route) {
  return ($('title').first().text() || route).replace(/\s+/g, ' ').trim();
}

function h1From($, title) {
  return ($('h1').first().text() || title).replace(/\s+/g, ' ').trim();
}

function wordsFromSlug(route, title) {
  const r = route.toLowerCase();
  const t = `${route} ${title}`.toLowerCase();
  let city = '';
  for (const c of ['pleasanton','dublin','east dublin','livermore','fremont','san ramon','danville','sunol','walnut creek','concord','pleasant hill','castro valley','hayward','newark','union city','alamo','blackhawk','tracy']) {
    const slug = c.replace(/ /g, '-');
    if (r.includes(slug) || t.includes(c)) { city = c.replace(/\b\w/g, m => m.toUpperCase()); break; }
  }
  let service = 'same-day garage door repair';
  if (t.includes('spring') || t.includes('broken-spring')) service = 'broken spring repair and garage door spring replacement';
  else if (t.includes('emergency') || t.includes('after-hours') || t.includes('24/7')) service = '24/7 emergency garage door repair';
  else if (t.includes('opener') || t.includes('liftmaster') || t.includes('remote') || t.includes('keypad') || t.includes('motor')) service = 'garage door opener repair';
  else if (t.includes('cable')) service = 'garage door cable repair';
  else if (t.includes('off-track') || t.includes('off track') || t.includes('track')) service = 'off-track garage door repair';
  else if (t.includes('commercial') || t.includes('chain hoist')) service = 'commercial garage door repair';
  else if (t.includes('maintenance') || t.includes('tune-up') || t.includes('safety inspection')) service = 'garage door maintenance and safety tune-up';
  else if (t.includes('gallery') || t.includes('real job photos') || t.includes('case-studies') || t.includes('project')) service = 'real garage door repair project photos';
  const area = city || (t.includes('pleasanton') ? 'Pleasanton' : 'Pleasanton and the East Bay');
  const primary = city ? `${service} ${city} CA` : `${service} Pleasanton CA`;
  const secondary = [
    'same-day garage door repair',
    'high-intent garage door service',
    'Valiant Garage Door project proof',
    'East Bay garage door repair',
  ];
  if (service.includes('emergency')) secondary.unshift('book 24/7 emergency garage door repair East Bay');
  if (service.includes('spring')) secondary.unshift('broken garage door spring repair near me');
  return {primary, secondary: [...new Set(secondary)], area, service};
}

function proofSetFor(route, title) {
  const t = `${route} ${title}`.toLowerCase();
  if (t.includes('dublin')) return proofSets.dublin;
  if (t.includes('danville')) return proofSets.danville;
  if (t.includes('san-ramon') || t.includes('san ramon')) return proofSets.sanramon;
  if (t.includes('emergency') || t.includes('after-hours') || t.includes('24/7')) return proofSets.emergency;
  if (t.includes('spring')) return ['san-ramon-garage-door-spring-repair-before-after','danville-garage-door-repair-spring-hardware-before-after'];
  if (t.includes('repair') || t.includes('service')) return proofSets.repair;
  return [];
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function makeProofSection(slugs, intent, variant='compact') {
  const cards = slugs.map(slug => companyBySlug[slug]).filter(Boolean).map(item => {
    const full = item.full.replace(/\.jpg$/i, '.webp');
    const alt = `${item.caption} by Valiant Garage Door for ${intent.primary}`;
    const project = item.companycam_project_url ? `<a href="${item.companycam_project_url}" target="_blank" rel="noopener noreferrer">CompanyCam project record</a>` : '';
    return `<figure class="valiant-companycam-card">
              <a href="${item.full}" aria-label="Open ${item.caption}">
                <img src="${full}" alt="${alt}" width="${item.width}" height="${item.height}" loading="lazy" decoding="async">
              </a>
              <figcaption>${item.description} ${project}</figcaption>
            </figure>`;
  }).join('\n');
  if (!cards) return '';
  return `<section class="valiant-companycam-native-proof valiant-companycam-native-proof--${variant}" aria-labelledby="native-companycam-proof-heading">
            <div class="valiant-companycam-native-proof__intro">
              <p class="geo-eyebrow">Native crawlable CompanyCam proof</p>
              <h2 id="native-companycam-proof-heading">Real field photos for ${intent.primary}</h2>
              <p>These are Valiant job photos saved as normal crawlable image elements with descriptive filenames, alt text, captions, page context, and project-record links. The live Trusty/CompanyCam gallery stays on the site, and these native images give Google and AI search engines direct image context.</p>
            </div>
            <div class="valiant-companycam-grid">
              ${cards}
            </div>
          </section>`;
}

function upsertIntent($, canonical, title, route, intent, imgs) {
  $('meta[name="valiant:primary-keyword"]').remove();
  $('meta[name="valiant:high-intent-focus"]').remove();
  $('meta[name="valiant:service-area-focus"]').remove();
  $('script[data-valiant-page-intent]').remove();
  $('head').append(`\n<meta name="valiant:primary-keyword" content="${intent.primary.replace(/"/g, '&quot;')}">`);
  $('head').append(`\n<meta name="valiant:high-intent-focus" content="${intent.secondary.join('; ').replace(/"/g, '&quot;')}">`);
  $('head').append(`\n<meta name="valiant:service-area-focus" content="${intent.area.replace(/"/g, '&quot;')}">`);
  const json = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#valiant-page-intent`,
    url: canonical,
    name: title,
    keywords: [intent.primary, ...intent.secondary],
    about: [
      { '@type': 'Service', name: intent.service, areaServed: intent.area },
      { '@type': 'LocalBusiness', name: 'Valiant Garage Door', telephone: '9254094974' }
    ],
    image: imgs.slice(0, 6).map(src => src.startsWith('http') ? src : SITE + src),
    dateModified: TODAY
  };
  $('head').append(`\n<script type="application/ld+json" data-valiant-page-intent>${JSON.stringify(json)}</script>`);
}

function normalizePixelAlts($) {
  $('noscript img').each((_, el) => {
    const $img = $(el);
    if (($img.attr('src') || '').includes('flask.nextdoor.com/pixel')) {
      $img.attr('alt', '');
      $img.attr('role', 'presentation');
      $img.attr('aria-hidden', 'true');
    }
  });
}

function collectImages($) {
  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src || src.startsWith('data:') || src.includes('flask.nextdoor.com/pixel')) return;
    imgs.push(src);
  });
  return [...new Set(imgs)];
}

const files = walk(PUBLIC).filter(file => !file.includes('/assets/') && !file.includes('/embedded/') && !file.endsWith('google74cfcfa1c4e5b929.html'));
let intentRows = [];
let proofUpdated = [];

for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, {decodeEntities:false});
  const route = routeFor(file);
  const canonical = canonicalFrom($, file);
  const title = titleFrom($, route);
  const h1 = h1From($, title);
  const intent = wordsFromSlug(route, `${title} ${h1}`);
  normalizePixelAlts($);

  if (route === '/gallery') {
    $('.valiant-companycam-native-proof').remove();
    const section = makeProofSection(companyCam.map(x => x.slug), intent, 'gallery');
    $('.photo-album').after('\n' + section);
    proofUpdated.push(route);
  } else if (['/garage-door-repair','/emergency-garage-door-repair','/garage-door-spring-replacement','/garage-door-repair-dublin-ca','/garage-door-repair-danville','/garage-door-repair-san-ramon','/services/emergency','/blog/emergency-garage-door-response-time-east-bay','/blog/broken-spring-repair-east-bay','/blog/broken-garage-door-spring-repair-pleasanton'].includes(route)) {
    $('.valiant-companycam-native-proof').remove();
    const section = makeProofSection(proofSetFor(route, title), intent, 'compact');
    if (section) {
      const main = $('main').first();
      if (main.length) main.append('\n' + section);
      else $('body').append('\n' + section);
      proofUpdated.push(route);
    }
  }

  let imgs = collectImages($);
  // Add selected CompanyCam image URLs to intent image list for pages where the section was just inserted.
  if (proofUpdated.includes(route)) imgs = collectImages($);
  upsertIntent($, canonical, title, route, intent, imgs);

  fs.writeFileSync(file, $.html());
  intentRows.push({route, file: path.relative(ROOT, file).replace(/\\/g, '/'), primaryKeyword: intent.primary, service: intent.service, area: intent.area});
}

// Improve the existing real-job-photos CompanyCam alt text and captions without rebuilding the whole page.
{
  const file = path.join(PUBLIC, 'real-job-photos/index.html');
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, {decodeEntities:false});
  $('img[src*="/assets/gallery-before-after/"]').each((_, el) => {
    const $img = $(el);
    const src = ($img.attr('src') || '').replace(/\.webp$/i, '').split('/').pop();
    const item = companyBySlug[src];
    if (!item) return;
    $img.attr('alt', `${item.caption} by Valiant Garage Door, documented from CompanyCam for East Bay garage door repair proof`);
    const fig = $img.closest('figure');
    if (fig.length) fig.find('figcaption').text(item.description);
  });
  fs.writeFileSync(file, $.html());
}

fs.writeFileSync(path.join(ROOT, 'data/page-keyword-intent-map.json'), JSON.stringify({generated: TODAY, pages: intentRows}, null, 2) + '\n');

// Rebuild image sitemap from actual crawlable <img> tags after updates.
const imageEntries = [];
for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  const $ = cheerio.load(html, {decodeEntities:false});
  const canonical = canonicalFrom($, file);
  const images = [];
  $('img').each((_, el) => {
    const $img = $(el);
    const src = $img.attr('src') || '';
    if (!src || src.startsWith('data:') || src.includes('flask.nextdoor.com/pixel')) return;
    let loc = src.startsWith('http') ? src : SITE + src;
    const alt = ($img.attr('alt') || '').replace(/\s+/g, ' ').trim();
    const cap = $img.closest('figure').find('figcaption').first().text().replace(/\s+/g, ' ').trim();
    images.push({loc, alt, cap});
  });
  const unique = [];
  const seen = new Set();
  for (const img of images) {
    if (seen.has(img.loc)) continue;
    seen.add(img.loc); unique.push(img);
  }
  if (unique.length) imageEntries.push({loc: canonical, images: unique.slice(0, 1000)});
}

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
for (const entry of imageEntries) {
  xml += `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n`;
  for (const img of entry.images) {
    xml += `    <image:image>\n      <image:loc>${escapeXml(img.loc)}</image:loc>\n`;
    if (img.alt) xml += `      <image:title>${escapeXml(img.alt.slice(0, 250))}</image:title>\n`;
    if (img.cap) xml += `      <image:caption>${escapeXml(img.cap.slice(0, 250))}</image:caption>\n`;
    xml += '    </image:image>\n';
  }
  xml += '  </url>\n';
}
xml += '</urlset>\n';
fs.writeFileSync(path.join(PUBLIC, 'sitemap-images.xml'), xml);

// Keep sitemap index fresh and make sure image sitemap is present.
const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-pages.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-blog.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-images.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
</sitemapindex>
`;
fs.writeFileSync(path.join(PUBLIC, 'sitemap.xml'), sitemapIndex);

// Add image-proof guidance to LLM file if available.
const llmFile = path.join(PUBLIC, 'llms-searchatlas-growth.txt');
if (fs.existsSync(llmFile)) {
  let txt = fs.readFileSync(llmFile, 'utf8');
  const block = `\n## Image and CompanyCam proof policy\n- Valiant keeps the Trusty/CompanyCam embed for live proof and trust.\n- Key service, city, emergency, spring, gallery, and real-job-photo pages also include native crawlable <img> elements with descriptive filenames, alt text, captions, and page-specific high-intent context.\n- Image sitemap: https://www.valiantdoor.com/sitemap-images.xml\n- Native CompanyCam proof page: https://www.valiantdoor.com/gallery and https://www.valiantdoor.com/real-job-photos\n`;
  txt = txt.replace(/\n## Image and CompanyCam proof policy[\s\S]*?(?=\n## |$)/, '').trimEnd() + '\n' + block;
  fs.writeFileSync(llmFile, txt);
}

console.log(JSON.stringify({pages: files.length, proofUpdated, imageSitemapPages: imageEntries.length, intentRows: intentRows.length}, null, 2));
