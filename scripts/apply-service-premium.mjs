import fs from "node:fs";

const BOOKING_URL = "https://book.housecallpro.com/book/Valiant-Garage-Door/ae8e4a137c8c49b4b264073541533a7a?v2=true";

const pages = [
  ["public/garage-door-repair/index.html", "service-repair", "Garage Door Repair"],
  ["public/garage-door-repair-alamo/index.html", "service-repair", "Alamo Repair"],
  ["public/garage-door-repair-blackhawk/index.html", "service-repair", "Blackhawk Repair"],
  ["public/garage-door-repair-castro-valley/index.html", "service-repair", "Castro Valley Repair"],
  ["public/garage-door-repair-concord/index.html", "service-repair", "Concord Repair"],
  ["public/garage-door-repair-danville/index.html", "service-repair", "Danville Repair"],
  ["public/garage-door-repair-dublin-ca/index.html", "service-repair", "Dublin Repair"],
  ["public/garage-door-repair-east-dublin/index.html", "service-repair", "East Dublin Repair"],
  ["public/garage-door-repair-fremont/index.html", "service-repair", "Fremont Repair"],
  ["public/garage-door-repair-hayward/index.html", "service-repair", "Hayward Repair"],
  ["public/garage-door-repair-livermore/index.html", "service-repair", "Livermore Repair"],
  ["public/garage-door-repair-newark/index.html", "service-repair", "Newark Repair"],
  ["public/garage-door-repair-pleasant-hill/index.html", "service-repair", "Pleasant Hill Repair"],
  ["public/garage-door-repair-pleasanton/index.html", "service-repair", "Pleasanton Repair"],
  ["public/garage-door-repair-san-leandro/index.html", "service-repair", "San Leandro Repair"],
  ["public/garage-door-repair-san-mateo/index.html", "service-repair", "San Mateo Repair"],
  ["public/garage-door-repair-san-ramon/index.html", "service-repair", "San Ramon Repair"],
  ["public/garage-door-repair-sunol/index.html", "service-repair", "Sunol Repair"],
  ["public/garage-door-repair-union-city/index.html", "service-repair", "Union City Repair"],
  ["public/garage-door-repair-walnut-creek/index.html", "service-repair", "Walnut Creek Repair"],
  ["public/broken-spring-repair-dublin-ca/index.html", "service-spring", "Broken Spring Repair"],
  ["public/emergency-after-hours/index.html", "service-emergency", "After-Hours Repair"],
  ["public/emergency-garage-door-repair/index.html", "service-emergency", "Emergency Repair"],
  ["public/garage-door-cable-repair/index.html", "service-cable", "Cable Repair"],
  ["public/garage-door-off-track-repair/index.html", "service-off-track", "Off-Track Repair"],
  ["public/garage-door-opener-repair/index.html", "service-opener", "Opener Repair"],
  ["public/garage-door-openers/index.html", "service-opener", "Opener Service"],
  ["public/garage-door-spring-replacement/index.html", "service-spring", "Spring Replacement"],
  ["public/safety-sensors/index.html", "service-sensor", "Sensor Repair"],
  ["public/same-day-garage-door-repair-pleasanton/index.html", "service-emergency", "Same-Day Repair"],
  ["public/tune-up-safety-inspection/index.html", "service-maintenance", "Safety Inspection"],
  ["public/services/commercial/index.html", "service-commercial", "Commercial Service"],
  ["public/services/emergency/index.html", "service-emergency", "Emergency Service"],
];

function actionMarkup(label) {
  return `<div class="service-premium-actions" aria-label="${label} options">
            <a class="btn" href="tel:+19254094974">Call for ${label}</a>
            <a class="btn service-primary" href="${BOOKING_URL}" target="_blank" rel="noopener noreferrer">Book Free Estimate</a>
            <a class="btn" href="sms:+19254094974">Text Valiant</a>
          </div>`;
}

function insertHeroActions(html, label, file) {
  if (html.includes("service-premium-actions") || html.includes("geo-hero-ctas")) return html;

  const h1Index = html.indexOf("<h1");
  if (h1Index < 0) throw new Error(`${file}: H1 not found`);
  const paragraphEnd = html.indexOf("</p>", h1Index);
  if (paragraphEnd < 0) throw new Error(`${file}: hero paragraph not found`);
  const insertionPoint = paragraphEnd + 4;
  return `${html.slice(0, insertionPoint)}\n          ${actionMarkup(label)}${html.slice(insertionPoint)}`;
}

function moveHeroActionsBeforeMedia(html) {
  const actionsMatch = html.match(/<div class="geo-hero-ctas">[\s\S]*?<\/div>/i);
  if (!actionsMatch) return html;

  const actionsIndex = actionsMatch.index;
  const heroIndex = html.lastIndexOf('<section class="geo-hero', actionsIndex);
  const figureIndex = html.indexOf("<figure", heroIndex);
  if (heroIndex < 0 || figureIndex < 0 || figureIndex > actionsIndex) return html;

  const withoutActions = `${html.slice(0, actionsIndex)}${html.slice(actionsIndex + actionsMatch[0].length)}`;
  return `${withoutActions.slice(0, figureIndex)}${actionsMatch[0]}\n${withoutActions.slice(figureIndex)}`;
}

function insertMidPageBand(html, label, file) {
  if (html.includes("service-premium-cta-band")) return html;

  const faqMatch = html.match(/<section\b[^>]*(?:faq|frequently)[^>]*>/i);
  const mainEnd = html.lastIndexOf("</main>");
  const insertionPoint = faqMatch?.index ?? mainEnd;
  if (insertionPoint < 0) throw new Error(`${file}: main insertion point not found`);

  const band = `
      <section class="service-premium-cta-band" aria-label="Schedule ${label}">
        <h2>Ready For Safe, Reliable Garage Door Service?</h2>
        <p>Valiant Garage Door provides clear diagnostics, professional repair options, and scheduling based on route timing and parts availability. Call now, book a free estimate, or text photos of the problem.</p>
        ${actionMarkup(label)}
      </section>
`;
  return `${html.slice(0, insertionPoint)}${band}${html.slice(insertionPoint)}`;
}

for (const [file, variant, label] of pages) {
  let html = fs.readFileSync(file, "utf8");

  if (!html.includes("/css/service-premium.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/css/service-premium.css?v=20260813">\n</head>');
  }

  html = html.replace(/<body([^>]*)class="([^"]*)"/i, (match, before, classes) => {
    const additions = ["page-service-premium", variant].filter(name => !classes.split(/\s+/).includes(name));
    return `<body${before}class="${[classes, ...additions].join(" ").trim()}"`;
  });

  html = insertHeroActions(html, label, file);
  html = moveHeroActionsBeforeMedia(html);
  html = insertMidPageBand(html, label, file);
  fs.writeFileSync(file, html);
}

console.log(`Applied shared premium treatment to ${pages.length} service pages.`);
