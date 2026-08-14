import fs from "node:fs";
import path from "node:path";

const publicDir = path.resolve("public");
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(full);
  }
}

walk(publicDir);

const findings = {
  emptyHref: [],
  javascriptHref: [],
  malformedContact: [],
  missingButtonType: [],
  buttonWithoutHook: [],
  formWithoutAction: [],
  duplicateIds: [],
  missingLocalTarget: [],
  missingFragmentTarget: [],
};
const internalTargets = new Map();
const externalTargets = new Map();
let anchors = 0;
let buttons = 0;
let forms = 0;
let details = 0;

function rel(file) {
  return path.relative(process.cwd(), file);
}

function routeToFile(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const clean = decoded.replace(/^\/+/, "").replace(/\/+$/, "");
  const candidates = clean
    ? [path.join(publicDir, clean, "index.html"), path.join(publicDir, clean)]
    : [path.join(publicDir, "index.html")];
  return candidates.find(candidate => fs.existsSync(candidate)) ?? null;
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map(match => match[1]);
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    if (count > 1) findings.duplicateIds.push({ file: rel(file), id, count });
  }

  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    anchors += 1;
    const attrs = match[1];
    const rawHref = attrs.match(/\bhref="([^"]*)"/i)?.[1];
    const href = rawHref === undefined ? undefined : decodeEntities(rawHref);
    if (href === undefined || href.trim() === "" || href === "#") {
      const isRewrittenPhone = /\bjs-tel\b/i.test(attrs);
      if (!isRewrittenPhone) findings.emptyHref.push({ file: rel(file), href: href ?? null });
      continue;
    }
    if (/^javascript:/i.test(href)) {
      findings.javascriptHref.push({ file: rel(file), href });
      continue;
    }
    if (/^(tel|sms):/i.test(href)) {
      if (!/^(tel|sms):\+?[\d]+(?:[?].*)?$/i.test(href)) findings.malformedContact.push({ file: rel(file), href });
      continue;
    }
    if (/^mailto:/i.test(href)) {
      if (!/^mailto:(?:[^?@\s]+@[^?@\s]+\.[^?\s]+)?(?:\?.*)?$/i.test(href)) findings.malformedContact.push({ file: rel(file), href });
      continue;
    }
    if (/^(data:|blob:)/i.test(href)) continue;

    if (/\$\{|['"]\s*\+|\+\s*['"]/.test(href)) continue;

    let url;
    try {
      const currentRoute = `/${path.relative(publicDir, file).replace(/\\/g, "/").replace(/\/index\.html$/, "").replace(/^index\.html$/, "")}`;
      url = new URL(href, `https://www.valiantdoor.com${currentRoute || "/"}`);
    } catch {
      findings.missingLocalTarget.push({ file: rel(file), href, reason: "invalid URL" });
      continue;
    }
    if (url.hostname === "www.valiantdoor.com" || url.hostname === "valiantdoor.com") {
      const key = `${url.pathname}${url.search}`;
      if (!internalTargets.has(key)) internalTargets.set(key, []);
      internalTargets.get(key).push(rel(file));
      const targetFile = routeToFile(url.pathname);
      if (!targetFile && !url.pathname.startsWith("/api/")) {
        findings.missingLocalTarget.push({ file: rel(file), href, reason: "no local route file" });
      }
      if (url.hash && targetFile) {
        const fragment = decodeURIComponent(url.hash.slice(1));
        const targetHtml = fs.readFileSync(targetFile, "utf8");
        const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp(`(?:id|name)="${escaped}"`, "i").test(targetHtml)) {
          findings.missingFragmentTarget.push({ file: rel(file), href, targetFile: rel(targetFile) });
        }
      }
    } else {
      const key = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
      if (!externalTargets.has(key)) externalTargets.set(key, []);
      externalTargets.get(key).push(rel(file));
    }
  }

  for (const match of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)) {
    buttons += 1;
    const attrs = match[1];
    const label = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const type = attrs.match(/\btype="([^"]+)"/i)?.[1];
    if (!type) findings.missingButtonType.push({ file: rel(file), label });
    const hasHook = /\b(id|aria-controls|data-[\w-]+|name|form)="[^"]*"/i.test(attrs) || /\btype="submit"/i.test(attrs);
    if (!hasHook) findings.buttonWithoutHook.push({ file: rel(file), label, attrs: attrs.trim() });
  }

  for (const match of html.matchAll(/<form\b([^>]*)>/gi)) {
    forms += 1;
    const attrs = match[1];
    if (!/\b(action|id)="[^"]+"/i.test(attrs)) findings.formWithoutAction.push({ file: rel(file), attrs: attrs.trim() });
  }
  details += (html.match(/<details\b/gi) ?? []).length;
}

console.log(JSON.stringify({
  htmlFiles: htmlFiles.length,
  anchors,
  buttons,
  forms,
  details,
  uniqueInternalTargets: internalTargets.size,
  uniqueExternalTargets: externalTargets.size,
  findings,
  internalTargetList: [...internalTargets.keys()].sort(),
  externalTargetList: [...externalTargets.keys()].sort(),
}, null, 2));
