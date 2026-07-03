/**
 * Minimal zero-dependency static dev server for the Valiant Garage Door site.
 *
 * The production site is a static export served from ./public with clean URLs
 * (e.g. /services -> public/services/index.html). Vercel serves this natively,
 * but the v0 preview needs a running dev server on an open port. This script
 * mirrors the clean-URL behavior locally so the preview renders the real site.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".vcf": "text/vcard; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
};

function contentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

// Prevent path traversal and resolve a request path to an absolute file path
// inside ROOT. Returns null if the resolved path escapes ROOT.
function safeResolve(pathname) {
  const decoded = decodeURIComponent(pathname);
  const resolved = path.normalize(path.join(ROOT, decoded));
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    return null;
  }
  return resolved;
}

function tryFile(candidate) {
  try {
    const stat = fs.statSync(candidate);
    if (stat.isFile()) return candidate;
  } catch (_) {}
  return null;
}

// Resolve a URL pathname to a file on disk, mirroring Vercel clean URLs:
//   /            -> public/index.html
//   /foo         -> public/foo.html OR public/foo/index.html
//   /foo/        -> public/foo/index.html
//   /assets/x.png-> public/assets/x.png
function resolveRequest(pathname) {
  const base = safeResolve(pathname);
  if (!base) return null;

  // Direct file hit (assets, .html, etc.)
  const direct = tryFile(base);
  if (direct) return direct;

  // /foo -> /foo.html
  const asHtml = tryFile(base + ".html");
  if (asHtml) return asHtml;

  // /foo or /foo/ -> /foo/index.html
  const asIndex = tryFile(path.join(base, "index.html"));
  if (asIndex) return asIndex;

  return null;
}

const server = http.createServer((req, res) => {
  let pathname = "/";
  try {
    pathname = new URL(req.url, "http://localhost").pathname;
  } catch (_) {
    res.writeHead(400);
    return res.end("Bad Request");
  }

  const filePath = resolveRequest(pathname);

  if (filePath) {
    const body = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store",
    });
    return res.end(body);
  }

  // 404 -> serve custom 404 page if present, else plain text
  const notFound = tryFile(path.join(ROOT, "404.html")) || tryFile(path.join(ROOT, "404", "index.html"));
  if (notFound) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(fs.readFileSync(notFound));
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log(`[v0] Static dev server running at http://localhost:${PORT} (serving ./public)`);
});
