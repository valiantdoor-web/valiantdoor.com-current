// Returns non-sensitive Thumbtack connection status for the settings page.
// NEVER returns tokens or the client secret — only whether a connection exists
// and when it was established.

const { connectionStatus } = require('../../../lib/thumbtack');

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const status = await connectionStatus();
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, ...status }));
};
