// Thumbtack OAuth callback endpoint.
//   Production URL: https://www.valiantdoor.com/api/auth/thumbtack/callback
//
// Flow:
//   1. Read query params: code, state, error, error_description.
//   2. If the provider returned an error, redirect to settings (connected=false).
//   3. Validate `state` against the secure server-side cookie (CSRF protection).
//   4. Exchange `code` for access + refresh tokens at Thumbtack's token endpoint.
//   5. Encrypt (AES-256-GCM) and store the tokens in the private Blob store.
//   6. Clear the state cookie and redirect:
//        success -> /settings/integrations/thumbtack?connected=true
//        failure -> /settings/integrations/thumbtack?connected=false
//
// Secrets (client secret, access/refresh tokens) are never written to logs,
// URLs, or responses.

const {
  missingCallbackConfig,
  parseCookies,
  clearStateCookie,
  exchangeCodeForTokens,
  saveTokens,
  STATE_COOKIE,
} = require('../../../lib/thumbtack');

const SETTINGS_OK = '/settings/integrations/thumbtack?connected=true';
const SETTINGS_FAIL = '/settings/integrations/thumbtack?connected=false';

function redirect(res, location, extraHeaders = []) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of extraHeaders) res.setHeader(k, v);
  res.end();
}

function failLocation(reason) {
  return reason ? `${SETTINGS_FAIL}&reason=${encodeURIComponent(reason)}` : SETTINGS_FAIL;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method not allowed');
    return;
  }

  // Parse query params from the request URL.
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  // error_description is read for completeness; not echoed back to the browser.
  const errorDescription = url.searchParams.get('error_description');

  const clearCookie = ['Set-Cookie', clearStateCookie()];

  // 2. Provider-reported error.
  if (error) {
    console.log('[v0] thumbtack callback provider error:', error, errorDescription ? '(has description)' : '');
    redirect(res, failLocation('provider_error'), [clearCookie]);
    return;
  }

  // Basic presence checks.
  if (!code || !state) {
    redirect(res, failLocation('missing_params'), [clearCookie]);
    return;
  }

  // 3. CSRF: state must match the cookie set at the start of the flow.
  const cookies = parseCookies(req);
  const cookieState = cookies[STATE_COOKIE];
  if (!cookieState || cookieState !== state) {
    console.log('[v0] thumbtack callback state mismatch');
    redirect(res, failLocation('state_mismatch'), [clearCookie]);
    return;
  }

  // Ensure we can actually complete the exchange + store.
  const missing = missingCallbackConfig();
  if (missing.length) {
    console.log('[v0] thumbtack callback missing config:', missing.join(','));
    redirect(res, failLocation('not_configured'), [clearCookie]);
    return;
  }

  try {
    // 4. Exchange the authorization code for tokens.
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.access_token) {
      redirect(res, failLocation('no_access_token'), [clearCookie]);
      return;
    }

    // 5. Encrypt + persist server-side only.
    await saveTokens(tokens);

    // 6. Success.
    redirect(res, SETTINGS_OK, [clearCookie]);
  } catch (err) {
    // Log a short, non-sensitive marker only.
    console.log('[v0] thumbtack token exchange error:', String(err.message || err).slice(0, 120));
    redirect(res, failLocation('exchange_failed'), [clearCookie]);
  }
};
