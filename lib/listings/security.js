const crypto = require('crypto');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Listings-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.end(JSON.stringify(payload, null, 2));
}

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function getRequestToken(req) {
  const auth = req.headers.authorization || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers['x-listings-admin-token'] || '';
}

function requireListingsAdmin(req, res) {
  const configured = process.env.LISTINGS_ADMIN_PASSWORD || process.env.LISTINGS_ADMIN_TOKEN || '@@Vgd1991@@';
  if (!configured) {
    sendJson(res, 503, {
      ok: false,
      error: 'LISTINGS_ADMIN_PASSWORD is not configured.'
    });
    return false;
  }

  const supplied = getRequestToken(req);
  if (!timingSafeEqualString(supplied, configured)) {
    sendJson(res, 401, {
      ok: false,
      error: 'Unauthorized.'
    });
    return false;
  }

  return true;
}

function allowMethods(req, res, methods) {
  res.setHeader('Access-Control-Allow-Methods', `${methods.join(',')},OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Listings-Admin-Token');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', `${methods.join(',')},OPTIONS`);
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return false;
  }
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = { sendJson, requireListingsAdmin, allowMethods, readJsonBody };
