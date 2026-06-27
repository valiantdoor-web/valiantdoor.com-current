const fs = require('fs');
const crypto = require('crypto');

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getPrivateKey() {
  if (process.env.APPLE_BUSINESS_PRIVATE_KEY) {
    return process.env.APPLE_BUSINESS_PRIVATE_KEY.replace(/\\n/g, '\n');
  }

  if (process.env.APPLE_BUSINESS_PRIVATE_KEY_PATH) {
    return fs.readFileSync(process.env.APPLE_BUSINESS_PRIVATE_KEY_PATH, 'utf8');
  }

  return null;
}

function signJwt({ audience, subject, issuer, keyId, expiresInSeconds = 900, extraClaims = {} } = {}) {
  const privateKey = getPrivateKey();
  if (!privateKey) throw new Error('Missing APPLE_BUSINESS_PRIVATE_KEY or APPLE_BUSINESS_PRIVATE_KEY_PATH.');
  if (!keyId) throw new Error('Missing Apple key id. Set APPLE_BUSINESS_KEY_ID.');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuer || process.env.APPLE_BUSINESS_ISSUER_ID || process.env.APPLE_BUSINESS_TEAM_ID || process.env.APPLE_TEAM_ID,
    sub: subject || process.env.APPLE_BUSINESS_CLIENT_ID || process.env.APPLE_BUSINESS_SERVICE_ACCOUNT_ID,
    aud: audience || process.env.APPLE_BUSINESS_TOKEN_AUDIENCE || 'businessconnect.apple.com',
    iat: now,
    exp: now + Number(expiresInSeconds || 900),
    ...extraClaims
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
  });

  return `${signingInput}.${base64Url(signature)}`;
}

async function getAccessToken() {
  if (process.env.APPLE_BUSINESS_ACCESS_TOKEN) return process.env.APPLE_BUSINESS_ACCESS_TOKEN;

  const tokenUrl = process.env.APPLE_BUSINESS_TOKEN_URL;
  const clientId = process.env.APPLE_BUSINESS_CLIENT_ID;
  const clientSecret = process.env.APPLE_BUSINESS_CLIENT_SECRET;

  if (tokenUrl && clientId && clientSecret) {
    const body = new URLSearchParams();
    body.set('grant_type', process.env.APPLE_BUSINESS_GRANT_TYPE || 'client_credentials');
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    if (process.env.APPLE_BUSINESS_SCOPE) body.set('scope', process.env.APPLE_BUSINESS_SCOPE);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    });

    const text = await response.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
    if (!response.ok) throw new Error(`Apple token request failed ${response.status}: ${text.slice(0, 500)}`);
    if (!parsed?.access_token) throw new Error('Apple token response did not include access_token.');
    return parsed.access_token;
  }

  if (process.env.APPLE_BUSINESS_KEY_ID) {
    return signJwt({
      keyId: process.env.APPLE_BUSINESS_KEY_ID,
      audience: process.env.APPLE_BUSINESS_TOKEN_AUDIENCE,
      issuer: process.env.APPLE_BUSINESS_ISSUER_ID || process.env.APPLE_BUSINESS_TEAM_ID || process.env.APPLE_TEAM_ID,
      subject: process.env.APPLE_BUSINESS_CLIENT_ID || process.env.APPLE_BUSINESS_SERVICE_ACCOUNT_ID
    });
  }

  throw new Error('Missing Apple auth config. Set APPLE_BUSINESS_ACCESS_TOKEN, or CLIENT_ID/CLIENT_SECRET/TOKEN_URL, or KEY_ID plus private key and issuer/client identifiers.');
}

function resolvePath(template, values = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const value = values[key] || process.env[`APPLE_BUSINESS_${key.toUpperCase()}`];
    if (!value) throw new Error(`Missing value for Apple path token {${key}}.`);
    return encodeURIComponent(value);
  });
}

async function appleBusinessRequest(pathTemplate, { method = 'GET', body, values } = {}) {
  const baseUrl = process.env.APPLE_BUSINESS_API_BASE_URL || 'https://businessconnect.apple.com/api';
  const token = await getAccessToken();
  const resolvedPath = resolvePath(pathTemplate, values);
  const url = new URL(resolvedPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let parsed = null;
  try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }

  return {
    ok: response.ok,
    status: response.status,
    url: url.toString(),
    body: parsed
  };
}

function getAppleBusinessConfigStatus() {
  return {
    apiBaseUrl: process.env.APPLE_BUSINESS_API_BASE_URL || 'https://businessconnect.apple.com/api',
    hasAccessToken: Boolean(process.env.APPLE_BUSINESS_ACCESS_TOKEN),
    hasClientCredentials: Boolean(process.env.APPLE_BUSINESS_TOKEN_URL && process.env.APPLE_BUSINESS_CLIENT_ID && process.env.APPLE_BUSINESS_CLIENT_SECRET),
    hasPrivateKey: Boolean(process.env.APPLE_BUSINESS_PRIVATE_KEY || process.env.APPLE_BUSINESS_PRIVATE_KEY_PATH),
    hasKeyId: Boolean(process.env.APPLE_BUSINESS_KEY_ID),
    hasIssuerOrTeam: Boolean(process.env.APPLE_BUSINESS_ISSUER_ID || process.env.APPLE_BUSINESS_TEAM_ID || process.env.APPLE_TEAM_ID),
    locationId: process.env.APPLE_BUSINESS_LOCATION_ID || null,
    brandId: process.env.APPLE_BUSINESS_BRAND_ID || null,
    dryRun: process.env.APPLE_BUSINESS_DRY_RUN !== 'false',
    getPath: process.env.APPLE_BUSINESS_LOCATION_GET_PATH || null,
    updatePath: process.env.APPLE_BUSINESS_LOCATION_UPDATE_PATH || null,
    updateMethod: process.env.APPLE_BUSINESS_UPDATE_METHOD || 'PATCH'
  };
}

module.exports = {
  signJwt,
  getAccessToken,
  appleBusinessRequest,
  getAppleBusinessConfigStatus
};
