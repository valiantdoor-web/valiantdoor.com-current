// Receives a single (client-downscaled) estimate photo as base64 JSON and
// stores it in the private Vercel Blob store. Returns the blob pathname, which
// api/estimate.js later reads back to attach the photos to the office email.
//
// One photo per request keeps each request comfortably under Vercel's
// serverless request body limit, so uploads stay reliable on mobile networks.

const { put } = require('@vercel/blob');

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB per photo after client downscaling

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 14_000_000) {
        reject(new Error('payload_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_err) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function safeName(name) {
  return String(name || 'photo')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'photo';
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (_err) {
    res.statusCode = 413;
    res.end(JSON.stringify({ ok: false, error: 'Photo is too large. Please try a smaller image.' }));
    return;
  }

  const contentType = String(body.contentType || '').toLowerCase();
  const dataBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64 : '';

  if (!ALLOWED_TYPES.has(contentType)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Unsupported image type.' }));
    return;
  }
  if (!dataBase64) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'No image data received.' }));
    return;
  }

  let buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch (_err) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Invalid image data.' }));
    return;
  }

  if (!buffer.length || buffer.length > MAX_BYTES) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'Image is empty or too large.' }));
    return;
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const day = new Date().toISOString().slice(0, 10);
  const base = safeName(body.filename).replace(/\.(jpe?g|png|webp)$/i, '');
  const pathname = `estimate-photos/${day}/${base}.${ext}`;

  try {
    const blob = await put(pathname, buffer, {
      access: 'private',
      contentType,
      addRandomSuffix: true,
    });
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, pathname: blob.pathname }));
  } catch (err) {
    console.log('[v0] estimate-photo: blob put failed', err && err.message);
    res.statusCode = 502;
    res.end(JSON.stringify({ ok: false, error: 'Could not store photo. Please call us.' }));
  }
};
