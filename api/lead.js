// Receives customer lead form submissions and forwards them to Housecall Pro.
// Replaces the previous SureFire Local / promio.com capture.
//
// Requires the env var HOUSECALL_PRO_API_KEY (Bearer token created by a
// Housecall Pro Admin in the App Store -> API section; lead creation requires
// a MAX plan). Optional: HOUSECALL_PRO_LEAD_SOURCE to override the lead source
// name (must exactly match a source in Housecall Pro; defaults to "Lead Form").
// Creates a customer via POST https://api.housecallpro.com/customers.

const HCP_CUSTOMERS_ENDPOINT = 'https://api.housecallpro.com/customers';
const DEFAULT_LEAD_SOURCE = 'Lead Form';

// The lead source must exactly match a source configured in Housecall Pro.
// Guard against an env var that was set to something invalid (e.g. an embed
// snippet or HTML): only accept a short, plain-text name.
function resolveLeadSource() {
  const configured = (process.env.HOUSECALL_PRO_LEAD_SOURCE || '').trim();
  const looksLikePlainName =
    configured &&
    configured.length <= 60 &&
    !/[<>{}\n\r]/.test(configured);
  return looksLikePlainName ? configured : DEFAULT_LEAD_SOURCE;
}

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

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: 'Website', last_name: 'Lead' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  // Housecall Pro expects 10 digits; strip a leading US country code if present.
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

// Build a human-readable notes block from every submitted field so no detail
// from the form is lost, regardless of which form it came from.
function buildNotes(fields) {
  const skip = new Set([
    'name', 'first_name', 'last_name', 'phone', 'phone_number', 'mobile',
    'email', 'contact_information', 'contact', 'photos', 'source',
  ]);
  const labelFor = (key) =>
    key
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const lines = [];
  Object.keys(fields).forEach((key) => {
    if (skip.has(key)) return;
    const val = fields[key];
    if (val === undefined || val === null || String(val).trim() === '') return;
    lines.push(`${labelFor(key)}: ${String(val).trim()}`);
  });
  return lines;
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

  const apiKey = process.env.HOUSECALL_PRO_API_KEY;
  if (!apiKey) {
    console.log('[v0] lead: HOUSECALL_PRO_API_KEY is not set');
    res.statusCode = 500;
    res.end(
      JSON.stringify({ ok: false, error: 'Lead destination is not configured yet.' })
    );
    return;
  }

  const fields = await readJsonBody(req);

  // Accept a couple of common field aliases across the different site forms.
  const rawName = fields.name || fields.nominee_name || fields.contact_name || '';
  const rawPhone = fields.phone || fields.phone_number || fields.mobile || '';
  const rawEmail = fields.email || '';
  const rawContact = fields.contact_information || fields.contact || '';

  // Some forms only have a single "contact information" field. Infer email/phone.
  let email = rawEmail;
  let phone = rawPhone;
  if (!email && isEmail(rawContact)) email = rawContact;
  if (!phone && !isEmail(rawContact)) phone = rawContact;

  const { first_name, last_name } = splitName(rawName || rawContact);
  const mobile_number = normalizePhone(phone);

  const notesLines = buildNotes(fields);
  notesLines.unshift(`Source page: ${fields.source || req.headers.referer || 'valiantdoor.com'}`);
  if (Array.isArray(fields.photos) ? fields.photos.length : fields.photos) {
    notesLines.push('Customer indicated photos were attached on the website form.');
  }

  // Housecall Pro's /customers endpoint expects flat fields (no wrapper).
  const payload = {
    first_name,
    last_name,
    lead_source: resolveLeadSource(),
    notes: notesLines.join('\n'),
  };
  if (email && isEmail(email)) payload.email = email;
  if (mobile_number) payload.mobile_number = mobile_number;

  // Require at least one way to contact the lead.
  if (!payload.email && !payload.mobile_number) {
    res.statusCode = 400;
    res.end(
      JSON.stringify({ ok: false, error: 'A phone number or email is required.' })
    );
    return;
  }

  try {
    const hcpRes = await fetch(HCP_CUSTOMERS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await hcpRes.text();
    if (!hcpRes.ok) {
      console.log('[v0] lead: Housecall Pro rejected lead', hcpRes.status, text);
      res.statusCode = 502;
      res.end(
        JSON.stringify({ ok: false, error: 'Could not submit lead. Please call us.' })
      );
      return;
    }

    console.log('[v0] lead: forwarded to Housecall Pro', hcpRes.status);
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.log('[v0] lead: error forwarding to Housecall Pro', err && err.message);
    res.statusCode = 502;
    res.end(
      JSON.stringify({ ok: false, error: 'Could not submit lead. Please call us.' })
    );
  }
};
