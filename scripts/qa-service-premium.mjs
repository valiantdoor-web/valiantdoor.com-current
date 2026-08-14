import fs from "node:fs";

const BOOKING_URL = "https://book.housecallpro.com/book/Valiant-Garage-Door/ae8e4a137c8c49b4b264073541533a7a?v2=true";
const source = fs.readFileSync("scripts/apply-service-premium.mjs", "utf8");
const pages = [...source.matchAll(/\["(public\/[^"]+\/index\.html)",\s*"([^"]+)",\s*"([^"]+)"\]/g)]
  .map(([, file, variant, label]) => ({ file, variant, label }));

const failures = [];
const rows = [];

for (const { file, variant } of pages) {
  const html = fs.readFileSync(file, "utf8");
  const bodyClass = html.match(/<body[^>]+class="([^"]+)"/i)?.[1] ?? "";
  const canonical = html.match(/rel="canonical"[^>]+href="([^"]+)"/i)?.[1] ?? "";
  const h1Count = (html.match(/<h1\b/gi) ?? []).length;
  const premiumLinks = (html.match(/\/css\/service-premium\.css/gi) ?? []).length;
  const bandCount = (html.match(/class="service-premium-cta-band"/gi) ?? []).length;
  const directActions = {
    call: html.includes('href="tel:+19254094974"'),
    book: html.includes(`href="${BOOKING_URL}"`),
    text: html.includes('href="sms:+19254094974"'),
  };
  const faqCount = (html.match(/<details\b/gi) ?? []).length;
  const imageCount = (html.match(/<img\b/gi) ?? []).length;

  if (!bodyClass.split(/\s+/).includes("page-service-premium")) failures.push(`${file}: missing page-service-premium body class`);
  if (!bodyClass.split(/\s+/).includes(variant)) failures.push(`${file}: missing ${variant} body class`);
  if (premiumLinks !== 1) failures.push(`${file}: expected one premium stylesheet link, found ${premiumLinks}`);
  if (bandCount !== 1) failures.push(`${file}: expected one premium CTA band, found ${bandCount}`);
  if (!Object.values(directActions).every(Boolean)) failures.push(`${file}: incomplete call/book/text destinations`);
  if (!canonical.startsWith("https://www.valiantdoor.com/")) failures.push(`${file}: invalid or missing canonical`);
  if (h1Count !== 1) failures.push(`${file}: expected one H1, found ${h1Count}`);

  for (const match of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${file}: invalid JSON-LD: ${error.message}`);
    }
  }

  rows.push({ file, canonical, variant, faqCount, imageCount, bandCount });
}

console.log(JSON.stringify({
  pageCount: pages.length,
  passed: failures.length === 0,
  failures,
  variants: rows.reduce((counts, row) => {
    counts[row.variant] = (counts[row.variant] ?? 0) + 1;
    return counts;
  }, {}),
  pagesWithFaq: rows.filter(row => row.faqCount > 0).length,
  pagesWithImages: rows.filter(row => row.imageCount > 0).length,
}, null, 2));

if (failures.length) process.exit(1);
