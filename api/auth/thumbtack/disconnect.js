// Disconnects the Thumbtack integration by deleting the stored encrypted
// tokens from the private Blob store. POST-only to avoid CSRF via simple
// navigations / prefetching.

const { deleteTokens } = require('../../../lib/thumbtack');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const ok = await deleteTokens();
  res.statusCode = ok ? 200 : 500;
  res.end(JSON.stringify({ ok }));
};
