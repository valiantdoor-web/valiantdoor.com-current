const crypto = require('crypto');

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function getHeader(req, name) {
  const value = req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function authorized(req) {
  const expected = process.env.ANGI_WEBHOOK_SECRET;

  // During the initial Angi integrations-team connectivity test, the endpoint
  // may run without a shared secret. As soon as Angi supplies its auth/signing
  // requirements, set ANGI_WEBHOOK_SECRET in Vercel and the route will enforce it.
  if (!expected) return { ok: true, mode: 'connectivity-test' };

  const auth = getHeader(req, 'authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  const explicit = getHeader(req, 'x-angi-webhook-secret') || getHeader(req, 'x-webhook-secret') || '';
  const candidate = bearer || explicit;

  return {
    ok: timingSafeEqualString(candidate, expected),
    mode: 'shared-secret'
  };
}

function normalizeBody(req) {
  const body = req.body;
  if (body == null) return null;
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8');
    try { return JSON.parse(text); } catch (_) { return text; }
  }
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_) { return body; }
  }
  return body;
}

module.exports = async (req, res) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      integration: 'angi',
      endpoint: '/api/angi-webhook',
      status: 'ready',
      mode: process.env.ANGI_WEBHOOK_SECRET ? 'shared-secret' : 'connectivity-test',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { ok: false, error: 'method_not_allowed', requestId });
  }

  const auth = authorized(req);
  if (!auth.ok) {
    return sendJson(res, 401, { ok: false, error: 'unauthorized', requestId });
  }

  const payload = normalizeBody(req);
  const eventType =
    getHeader(req, 'x-angi-event') ||
    getHeader(req, 'x-event-type') ||
    (payload && typeof payload === 'object' && (payload.event || payload.event_type || payload.type)) ||
    'unknown';

  const payloadKeys = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? Object.keys(payload).slice(0, 100)
    : [];

  // Intentionally log metadata only for the first connectivity test so customer
  // PII is not sprayed into runtime logs before Angi's payload and retention
  // requirements are agreed. Persistence to Supabase/Neon can be added once the
  // integrations team provides the production schema and auth/signing contract.
  console.log(JSON.stringify({
    integration: 'angi',
    requestId,
    receivedAt: new Date().toISOString(),
    eventType: String(eventType),
    payloadKeys,
    authMode: auth.mode
  }));

  return sendJson(res, 200, {
    ok: true,
    received: true,
    requestId,
    eventType: String(eventType),
    timestamp: new Date().toISOString()
  });
};
