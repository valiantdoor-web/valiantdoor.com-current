// Shared helpers for the Thumbtack OAuth integration.
//
// Responsibilities:
//   - Read + validate the required environment variables (config()).
//   - CSRF state cookie helpers (parse / serialize / clear).
//   - AES-256-GCM encryption for tokens at rest.
//   - Encrypted token storage in the PRIVATE Vercel Blob store.
//   - Authorization-code -> token exchange against Thumbtack's token endpoint.
//
// SECURITY NOTES:
//   - The client secret and all tokens live ONLY on the server. Nothing in this
//     file is imported by browser code.
//   - Tokens are encrypted with THUMBTACK_TOKEN_ENC_KEY before being written to
//     Blob, so a leaked Blob URL still does not expose usable credentials.
//   - The token blob is stored with access:'private' and a fixed pathname.

const crypto = require('crypto');
const { put, get, del, list } = require('@vercel/blob');

const TOKEN_BLOB_PATHNAME = 'integrations/thumbtack/tokens.enc';
const STATE_COOKIE = 'tt_oauth_state';
const STATE_COOKIE_MAX_AGE = 600; // 10 minutes

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// The OAuth authorize/token URLs are intentionally read from env vars and are
// NOT hard-coded. Thumbtack's official endpoints must be supplied by the
// operator (see docs/THUMBTACK_OAUTH_SETUP.md). Do not invent them here.
function config() {
  return {
    clientId: process.env.THUMBTACK_CLIENT_ID || '',
    clientSecret: process.env.THUMBTACK_CLIENT_SECRET || '',
    redirectUri: process.env.THUMBTACK_REDIRECT_URI || '',
    authorizeUrl: process.env.THUMBTACK_OAUTH_AUTHORIZE_URL || '',
    tokenUrl: process.env.THUMBTACK_OAUTH_TOKEN_URL || '',
    encKey: process.env.THUMBTACK_TOKEN_ENC_KEY || '',
  };
}

// Returns a list of missing env var names needed to START the OAuth flow.
function missingStartConfig() {
  const c = config();
  const missing = [];
  if (!c.clientId) missing.push('THUMBTACK_CLIENT_ID');
  if (!c.redirectUri) missing.push('THUMBTACK_REDIRECT_URI');
  if (!c.authorizeUrl) missing.push('THUMBTACK_OAUTH_AUTHORIZE_URL');
  return missing;
}

// Returns a list of missing env var names needed to COMPLETE the token exchange.
function missingCallbackConfig() {
  const c = config();
  const missing = [];
  if (!c.clientId) missing.push('THUMBTACK_CLIENT_ID');
  if (!c.clientSecret) missing.push('THUMBTACK_CLIENT_SECRET');
  if (!c.redirectUri) missing.push('THUMBTACK_REDIRECT_URI');
  if (!c.tokenUrl) missing.push('THUMBTACK_OAUTH_TOKEN_URL');
  if (!c.encKey) missing.push('THUMBTACK_TOKEN_ENC_KEY');
  return missing;
}

// ---------------------------------------------------------------------------
// Cookies
// ---------------------------------------------------------------------------

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

function serializeStateCookie(value) {
  return [
    `${STATE_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${STATE_COOKIE_MAX_AGE}`,
  ].join('; ');
}

function clearStateCookie() {
  return [
    `${STATE_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Encryption (AES-256-GCM)
// ---------------------------------------------------------------------------

// Accepts a base64, hex, or raw passphrase key and derives a 32-byte key.
function deriveKey(rawKey) {
  if (!rawKey) throw new Error('missing_enc_key');
  // Try base64 (44 chars for 32 bytes) then hex (64 chars); otherwise scrypt.
  let buf = null;
  if (/^[A-Za-z0-9+/]{43}=$/.test(rawKey)) {
    buf = Buffer.from(rawKey, 'base64');
  } else if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    buf = Buffer.from(rawKey, 'hex');
  }
  if (buf && buf.length === 32) return buf;
  // Fallback: derive deterministically from an arbitrary passphrase.
  return crypto.scryptSync(rawKey, 'valiant-thumbtack-oauth', 32);
}

function encryptJson(obj, rawKey) {
  const key = deriveKey(rawKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Envelope: v1.<iv>.<tag>.<ciphertext> (all base64url)
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

function decryptJson(envelope, rawKey) {
  const key = deriveKey(rawKey);
  const [version, ivB64, tagB64, dataB64] = String(envelope).split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('bad_envelope');
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plaintext.toString('utf8'));
}

// ---------------------------------------------------------------------------
// Token storage (encrypted, private Blob)
// ---------------------------------------------------------------------------

async function saveTokens(tokens) {
  const { encKey } = config();
  const envelope = encryptJson(tokens, encKey);
  await put(TOKEN_BLOB_PATHNAME, Buffer.from(envelope, 'utf8'), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/octet-stream',
  });
}

async function readTokens() {
  const { encKey } = config();
  try {
    const result = await get(TOKEN_BLOB_PATHNAME, { access: 'private' });
    if (!result) return null;
    // get() returns a web ReadableStream; drain it via Response.
    const text = await new Response(result).text();
    if (!text) return null;
    return decryptJson(text, encKey);
  } catch (_err) {
    return null;
  }
}

async function deleteTokens() {
  try {
    // Resolve the concrete blob(s) for this pathname, then delete by URL.
    const { blobs } = await list({ prefix: TOKEN_BLOB_PATHNAME });
    const urls = (blobs || []).map((b) => b.url);
    if (urls.length) await del(urls);
    return true;
  } catch (_err) {
    return false;
  }
}

// Returns non-sensitive connection status only. NEVER returns token material.
async function connectionStatus() {
  try {
    const { blobs } = await list({ prefix: TOKEN_BLOB_PATHNAME });
    const blob = (blobs || [])[0];
    if (!blob) return { connected: false };
    return {
      connected: true,
      connectedAt: blob.uploadedAt || null,
    };
  } catch (_err) {
    return { connected: false };
  }
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

// Exchanges an authorization code for tokens using the standard OAuth 2.0
// authorization_code grant. The endpoint URL comes from env (not invented).
// NOTE: If Thumbtack requires a non-standard body or HTTP Basic client auth,
// adjust the request below per their official docs.
async function exchangeCodeForTokens(code) {
  const c = config();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: c.redirectUri,
    client_id: c.clientId,
    client_secret: c.clientSecret,
  });

  const resp = await fetch(c.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  const raw = await resp.text();
  if (!resp.ok) {
    // Do not leak the client secret; only surface status + provider message.
    throw new Error(`token_exchange_failed_${resp.status}: ${raw.slice(0, 300)}`);
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (_err) {
    throw new Error('token_exchange_bad_json');
  }

  return {
    access_token: json.access_token || null,
    refresh_token: json.refresh_token || null,
    token_type: json.token_type || null,
    scope: json.scope || null,
    expires_in: json.expires_in || null,
    obtained_at: new Date().toISOString(),
  };
}

// Builds the provider authorize URL the user is sent to.
function buildAuthorizeUrl(state) {
  const c = config();
  const url = new URL(c.authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', c.clientId);
  url.searchParams.set('redirect_uri', c.redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}

function randomState() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  STATE_COOKIE,
  TOKEN_BLOB_PATHNAME,
  config,
  missingStartConfig,
  missingCallbackConfig,
  parseCookies,
  serializeStateCookie,
  clearStateCookie,
  encryptJson,
  decryptJson,
  saveTokens,
  readTokens,
  deleteTokens,
  connectionStatus,
  exchangeCodeForTokens,
  buildAuthorizeUrl,
  randomState,
};
