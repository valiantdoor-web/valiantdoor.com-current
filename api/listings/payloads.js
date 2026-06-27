const { getListingsRegistry } = require('../../lib/listings/data');
const { buildAllProviderPayloads, buildProviderPayload } = require('../../lib/listings/provider-payloads');
const { sendJson, requireListingsAdmin, allowMethods } = require('../../lib/listings/security');

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const url = new URL(req.url, 'https://www.valiantdoor.com');
  const provider = url.searchParams.get('provider');
  try {
    if (provider) {
      sendJson(res, 200, { ok: true, provider, payload: buildProviderPayload(provider) });
      return;
    }
    const registry = getListingsRegistry();
    const providerIds = (registry.providers || []).map((item) => item.id);
    sendJson(res, 200, { ok: true, payloads: buildAllProviderPayloads(providerIds) });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
  }
};
