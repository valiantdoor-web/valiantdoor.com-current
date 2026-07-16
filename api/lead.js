// Receives customer lead form submissions and forwards them to Housecall Pro.
// Replaces the previous SureFire Local / promio.com capture.
//
// The Housecall Pro forwarding logic lives in lib/housecall.js so it can be
// shared with the photo-based instant estimate flow (api/estimate.js).

const { forwardLeadToHousecall } = require('../lib/housecall');

function readJsonBody(req) {
  return new Promise((resolve) => {
    // Vercel may have already parsed the body.
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      // Guard against oversized payloads (~1MB).
      if (raw.length > 1_000_000) {
        raw = '';
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
        // Fall back to urlencoded form bodies.
        const params = new URLSearchParams(raw);
        resolve(Object.fromEntries(params.entries()));
      }
    });
    req.on('error', () => resolve({}));
  });
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

  const fields = await readJsonBody(req);
  const result = await forwardLeadToHousecall(fields, {
    sourceFallback: req.headers.referer,
  });

  if (result.ok) {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (result.error === 'not_configured') {
    res.statusCode = 500;
    res.end(JSON.stringify({ ok: false, error: 'Lead destination is not configured yet.' }));
    return;
  }

  if (result.error === 'missing_contact') {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'A phone number or email is required.' }));
    return;
  }

  res.statusCode = 502;
  res.end(JSON.stringify({ ok: false, error: 'Could not submit lead. Please call us.' }));
};
