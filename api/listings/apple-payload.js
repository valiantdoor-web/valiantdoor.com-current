const { buildAppleLocationPayload } = require('../../lib/listings/data');
const { sendJson, requireListingsAdmin, allowMethods } = require('../../lib/listings/security');

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;
  sendJson(res, 200, {
    ok: true,
    payload: buildAppleLocationPayload()
  });
};
