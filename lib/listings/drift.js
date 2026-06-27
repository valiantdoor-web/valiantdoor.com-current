const { flattenCanonical, getListingsRegistry } = require('./data');
const { getAllProviderCredentialStatus } = require('./credential-status');

function providerDriftStatus(provider, credentials) {
  if (!provider.managedBy || provider.managedBy === 'manual') return 'manual-tracked';
  if (!credentials?.authReady) return 'api-managed-needs-auth';
  if (!credentials?.canRead) return 'api-managed-needs-read-config';
  if (!credentials?.canWrite) return 'api-managed-read-ready-write-needs-config';
  return 'api-ready';
}

function buildDriftReport() {
  const registry = getListingsRegistry();
  const providerIds = (registry.providers || []).map((provider) => provider.id);
  const credentials = getAllProviderCredentialStatus(providerIds);
  const canonical = flattenCanonical();
  const providers = (registry.providers || []).map((provider) => {
    const credential = credentials[provider.id];
    const fields = provider.fieldsTracked || [];
    return {
      id: provider.id,
      name: provider.name,
      managedBy: provider.managedBy,
      status: provider.status,
      driftStatus: providerDriftStatus(provider, credential),
      credential,
      fieldsTracked: fields,
      canonicalFields: fields.reduce((acc, field) => {
        acc[field] = canonical[field] || null;
        return acc;
      }, {}),
      nextAction: provider.managedBy === 'api'
        ? (credential?.canRead ? 'Run provider read comparison when live credentials are connected.' : 'Add missing API credentials/configuration.')
        : 'Review manually against the provider profile URL.'
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    canonical,
    providers,
    summary: {
      providerCount: providers.length,
      apiReadyCount: providers.filter((provider) => provider.driftStatus === 'api-ready').length,
      apiManagedNeedsCredentials: providers.filter((provider) => String(provider.driftStatus).includes('needs')).length,
      manualTrackedCount: providers.filter((provider) => provider.driftStatus === 'manual-tracked').length
    }
  };
}

module.exports = { buildDriftReport, providerDriftStatus };
