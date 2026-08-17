#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const WRITE = process.argv.includes("--write");

const GTM_ID = "GTM-T74PV8L5";
const RETIRED_GTM_ID = "GTM-WPJ77LQ8";

const GTM_HEAD = `<!-- Google Tag Manager -->
<script>
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');
</script>
<!-- End Google Tag Manager -->
`;

const GTM_BODY = `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
`;

function walkHtml(dir, output = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(absolute, output);
    else if (entry.name.endsWith(".html")) output.push(absolute);
  }
  return output;
}

function sitemapTargets() {
  const targets = new Set();
  for (const sitemap of ["sitemap-pages.xml", "sitemap-blog.xml"]) {
    const xml = fs.readFileSync(path.join(PUBLIC, sitemap), "utf8");
    for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
      const url = new URL(match[1]);
      const pathname = decodeURIComponent(url.pathname).replace(/\/+$/, "");
      const relative = pathname ? pathname.slice(1) : "";
      const file = relative
        ? path.join(PUBLIC, relative, "index.html")
        : path.join(PUBLIC, "index.html");
      if (fs.existsSync(file)) targets.add(file);
    }
  }
  return targets;
}

function removeRetiredContainer(html, file) {
  let output = html;

  output = output.replace(
    /<!-- Google Tag Manager \(Nextdoor container\) -->[\s\S]*?<!-- End Google Tag Manager \(Nextdoor container\) -->\s*/g,
    ""
  );
  output = output.replace(
    /<!-- Google Tag Manager \(noscript, Nextdoor container\) -->[\s\S]*?<!-- End Google Tag Manager \(noscript, Nextdoor container\) -->\s*/g,
    ""
  );
  output = output.replace(
    /<!-- Google Tag Manager \(noscript, Nextdoor container\) -->\s*<noscript>[\s\S]*?GTM-WPJ77LQ8[\s\S]*?<\/noscript>\s*/g,
    ""
  );

  if (output.includes(RETIRED_GTM_ID)) {
    throw new Error(`Retired container remains after normalization: ${path.relative(ROOT, file)}`);
  }
  return output;
}

const allHtml = walkHtml(PUBLIC);
const targets = sitemapTargets();
let changed = 0;
let addedHead = 0;
let addedBody = 0;
let removedRetired = 0;

for (const file of allHtml) {
  const before = fs.readFileSync(file, "utf8");
  let after = removeRetiredContainer(before, file);
  if (after !== before) removedRetired += 1;

  if (targets.has(file)) {
    const headEnd = after.search(/<\/head>/i);
    const head = headEnd >= 0 ? after.slice(0, headEnd) : after;

    if (!head.includes(GTM_ID)) {
      after = after.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n${GTM_HEAD}`);
      addedHead += 1;
    }
    if (!/594683\.tctm\.co\/t\.js/.test(head)) {
      after = after.replace(/<head(\s[^>]*)?>/i, (match) => `${match}\n<script async src="https://594683.tctm.co/t.js"></script>`);
    }

    after = after.replace(/src="\/\/594683\.tctm\.co\/t\.js"/g, 'src="https://594683.tctm.co/t.js"');

    if (!after.includes(`googletagmanager.com/ns.html?id=${GTM_ID}`)) {
      after = after.replace(/<body(\s[^>]*)?>/i, (match) => `${match}${GTM_BODY}`);
      addedBody += 1;
    }
  }

  if (after !== before) {
    changed += 1;
    if (WRITE) fs.writeFileSync(file, after);
  }
}

console.log(
  JSON.stringify(
    {
      mode: WRITE ? "write" : "dry-run",
      sitemapTargets: targets.size,
      htmlFiles: allHtml.length,
      changed,
      addedHead,
      addedBody,
      removedRetired,
    },
    null,
    2
  )
);
