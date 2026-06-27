const { buildAuditSnapshot } = require('../../lib/listings/data');
const { getAppleBusinessConfigStatus } = require('../../lib/listings/apple-business-client');
const { getAllProviderCredentialStatus } = require('../../lib/listings/credential-status');
const { getProviderSyncConfigStatus } = require('../../lib/listings/provider-sync-client');
const { buildDriftReport } = require('../../lib/listings/drift');
const { sendJson, requireListingsAdmin, allowMethods } = require('../../lib/listings/security');

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const audit = buildAuditSnapshot();
  const providerIds = (audit.providers || []).map((provider) => provider.id);
  sendJson(res, 200, {
    ...audit,
    appleBusiness: getAppleBusinessConfigStatus(),
    credentials: getAllProviderCredentialStatus(providerIds),
    syncClients: providerIds.reduce((acc, providerId) => {
      acc[providerId] = getProviderSyncConfigStatus(providerId);
      return acc;
    }, {}),
    drift: buildDriftReport()
  });
};
