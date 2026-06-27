const crypto = require('crypto');

const NEXTDOOR_CONVERSIONS_URL = 'https://ads.nextdoor.com/v2/api/conversions/track';
const DEFAULT_DATA_SOURCE_ID = 'fe411d2f-ce90-47be-a0c0-061dcde0eeb1';
const DEFAULT_ADVERTISER_ID = '877420622915830837';
const ALLOWED_HOSTS = new Set([
  'www.valiantdoor.com',
  'valiantdoor.com',
  '127.0.0.1:4177',
  '127.0.0.1:8765',
  'localhost:4177',
  'localhost:8765'
]);

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw);
}

function firstHeaderValue(value) {
  return String(Array.isArray(value) ? value[0] : value || '').split(',')[0].trim();
}

function requestHost(req) {
  const origin = firstHeaderValue(req.headers.origin);
  if (origin) {
    try { return new URL(origin).host; } catch (error) {}
  }
  const referer = firstHeaderValue(req.headers.referer || req.headers.referrer);
  if (referer) {
    try { return new URL(referer).host; } catch (error) {}
  }
  return firstHeaderValue(req.headers.host);
}

function isAllowedRequest(req) {
  const host = requestHost(req);
  return ALLOWED_HOSTS.has(host) || /\.vercel\.app$/i.test(host);
}

function sha256(value) {
  const text = String(value || '');
  if (!text) return undefined;
  return crypto.createHash('sha256').update(text).digest('hex');
}

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  const email = cleanText(value).toLowerCase();
  return email && email.includes('@') ? email : '';
}

function normalizePhoneE164(value) {
  const raw = cleanText(value);
  if (!raw) return '';
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return digits ? `+${digits}` : '';
}

function normalizeName(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, '');
}

function normalizeStreet(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCity(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeState(value) {
  const state = cleanText(value || 'CA').toUpperCase().replace(/[^A-Z]/g, '');
  return state.slice(0, 2) || 'CA';
}

function normalizeZip(value) {
  return cleanText(value).replace(/\D/g, '').slice(0, 5);
}

function normalizeCountry(value) {
  const country = cleanText(value || 'US').toUpperCase().replace(/[^A-Z]/g, '');
  return country.slice(0, 2) || 'US';
}

function normalizeDateOfBirth(value) {
  const digits = cleanText(value).replace(/\D/g, '');
  return digits.length === 8 ? digits : '';
}

function normalizeGender(value) {
  const gender = cleanText(value).toLowerCase().charAt(0);
  return ['f', 'm', 'n'].includes(gender) ? gender : '';
}

function buildCustomer(input, req) {
  const customer = input && typeof input === 'object' ? input : {};
  const output = {};

  const email = normalizeEmail(customer.email);
  const phone = normalizePhoneE164(customer.phone_number || customer.phone);
  const firstName = normalizeName(customer.first_name);
  const lastName = normalizeName(customer.last_name);
  const dob = normalizeDateOfBirth(customer.date_of_birth);
  const gender = normalizeGender(customer.gender);
  const street = normalizeStreet(customer.street_address);
  const city = normalizeCity(customer.city);
  const state = normalizeState(customer.state);
  const zip = normalizeZip(customer.zip_code || customer.zip);
  const country = normalizeCountry(customer.country);
  const clickId = cleanText(customer.click_id);
  const externalId = cleanText(customer.external_id);

  if (email) output.email = sha256(email);
  if (phone) output.phone_number = sha256(phone);
  if (firstName) output.first_name = sha256(firstName);
  if (lastName) output.last_name = sha256(lastName);
  if (dob) output.date_of_birth = dob;
  if (gender) output.gender = gender;
  if (street) output.street_address = sha256(street);
  if (city) output.city = sha256(city);
  if (state) output.state = state;
  if (zip) output.zip_code = zip;
  if (country) output.country = country;
  if (clickId) output.click_id = clickId;
  if (externalId) output.external_id = externalId;

  const forwardedFor = firstHeaderValue(req.headers['x-forwarded-for']);
  const realIp = firstHeaderValue(req.headers['x-real-ip']);
  const clientIp = forwardedFor || realIp;
  const userAgent = firstHeaderValue(req.headers['user-agent']);
  if (clientIp) output.client_ip_address = clientIp;
  if (userAgent) output.client_user_agent = userAgent;

  return output;
}

function safeActionSourceUrl(value, req) {
  const fallbackHost = firstHeaderValue(req.headers.host) || 'www.valiantdoor.com';
  const fallback = `https://${fallbackHost}/thank-you`;
  try {
    const url = new URL(value || fallback);
    if (!ALLOWED_HOSTS.has(url.host) && !/\.vercel\.app$/i.test(url.host)) return 'https://www.valiantdoor.com/thank-you';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch (error) {
    return 'https://www.valiantdoor.com/thank-you';
  }
}

function buildPayload(body, req) {
  const eventName = cleanText(body.event_name || body.eventName || 'LEAD').toUpperCase();
  const eventId = cleanText(body.event_id || body.eventId) || crypto.randomUUID();
  const customer = buildCustomer(body.customer, req);
  const custom = body.custom && typeof body.custom === 'object' ? body.custom : undefined;

  const payload = {
    event_name: eventName,
    event_id: eventId,
    event_time_epoch: Math.floor(Date.now() / 1000),
    action_source: cleanText(body.action_source || body.actionSource || 'website'),
    action_source_url: safeActionSourceUrl(body.action_source_url || body.actionSourceUrl, req),
    delivery_optimization: body.delivery_optimization === false ? false : true,
    partner_id: cleanText(body.partner_id || 'valiantdoor-direct-capi'),
    client_id: cleanText(process.env.NEXTDOOR_ADVERTISER_ID || body.client_id || body.clientId || DEFAULT_ADVERTISER_ID),
    data_source_id: cleanText(process.env.NEXTDOOR_DATA_SOURCE_ID || body.data_source_id || DEFAULT_DATA_SOURCE_ID),
    customer
  };

  if (custom) payload.custom = custom;
  return payload;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://www.valiantdoor.com');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  if (!isAllowedRequest(req)) {
    sendJson(res, 403, { ok: false, error: 'Forbidden.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return;
  }

  const payload = buildPayload(body || {}, req);
  const token = process.env.NEXTDOOR_CAPI_TOKEN || process.env.NEXTDOOR_ACCESS_TOKEN;
  if (!token) {
    sendJson(res, 202, {
      ok: false,
      configured: false,
      error: 'NEXTDOOR_CAPI_TOKEN is not configured.',
      event_name: payload.event_name,
      event_id: payload.event_id,
      client_id: payload.client_id,
      data_source_id: payload.data_source_id,
      customer_fields: Object.keys(payload.customer)
    });
    return;
  }

  try {
    const response = await fetch(NEXTDOOR_CONVERSIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let result;
    try { result = text ? JSON.parse(text) : {}; } catch (error) { result = { raw: text }; }
    sendJson(res, response.ok ? 200 : 502, {
      ok: response.ok,
      provider_status: response.status,
      event_name: payload.event_name,
      event_id: payload.event_id,
      client_id: payload.client_id,
      data_source_id: payload.data_source_id,
      customer_fields: Object.keys(payload.customer),
      result
    });
  } catch (error) {
    sendJson(res, 502, { ok: false, error: 'Nextdoor CAPI request failed.' });
  }
};
