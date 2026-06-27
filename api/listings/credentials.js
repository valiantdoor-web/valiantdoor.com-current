const { getListingsRegistry } = require('../../lib/listings/data');
const { getAllProviderCredentialStatus } = require('../../lib/listings/credential-status');
const { getProviderSyncConfigStatus } = require('../../lib/listings/provider-sync-client');
const { sendJson, requireListingsAdmin, allowMethods } = require('../../lib/listings/security');

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const registry = getListingsRegistry();
  const providerIds = (registry.providers || []).map((provider) => provider.id);
  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    credentials: getAllProviderCredentialStatus(providerIds),
    syncClients: providerIds.reduce((acc, providerId) => {
      acc[providerId] = getProviderSyncConfigStatus(providerId);
      return acc;
    }, {})
  });
};
