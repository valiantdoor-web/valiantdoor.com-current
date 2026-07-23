// Begins the Thumbtack OAuth flow.
//   1. Generates a cryptographically-random CSRF `state`.
//   2. Stores it in a secure, HttpOnly, SameSite=Lax cookie.
//   3. Redirects the browser to Thumbtack's authorize URL (from env).
//
// The "Connect Thumbtack" button on the settings page links here.

const {
  missingStartConfig,
  serializeStateCookie,
  buildAuthorizeUrl,
  randomState,
} = require('../../../lib/thumbtack');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end('Method not allowed');
    return;
  }

  const missing = missingStartConfig();
  if (missing.length) {
    // Configuration problem -> bounce back to settings with an error flag.
    res.statusCode = 302;
    res.setHeader(
      'Location',
      `/settings/integrations/thumbtack?connected=false&reason=not_configured&missing=${encodeURIComponent(missing.join(','))}`
    );
    res.end();
    return;
  }

  const state = randomState();
  res.setHeader('Set-Cookie', serializeStateCookie(state));
  res.statusCode = 302;
  res.setHeader('Location', buildAuthorizeUrl(state));
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};
