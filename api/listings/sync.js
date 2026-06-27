const { buildAllProviderPayloads, buildProviderPayload } = require('../../lib/listings/provider-payloads');
const { getListingsRegistry } = require('../../lib/listings/data');
const { getProviderCredentialStatus } = require('../../lib/listings/credential-status');
const { getProviderSyncConfigStatus, submitProviderPayload } = require('../../lib/listings/provider-sync-client');
const { sendJson, requireListingsAdmin, allowMethods, readJsonBody } = require('../../lib/listings/security');

function providerIds() {
  return (getListingsRegistry().providers || []).map((provider) => provider.id);
}

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['POST'])) return;
  if (!requireListingsAdmin(req, res)) return;

  let input = {};
  try { input = await readJsonBody(req); } catch (_) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return;
  }

  const provider = input.provider || 'all';
  const commit = input.commit === true;
  const values = input.values || {};

  if (provider === 'all') {
    const ids = providerIds();
    sendJson(res, 200, {
      ok: true,
      mode: commit ? 'commit-blocked-for-bulk-safety' : 'dry-run',
      message: commit
        ? 'Bulk commit is blocked for safety. Submit one provider at a time after credentials are connected.'
        : 'All provider payloads generated. No listing provider was updated.',
      providers: ids.reduce((acc, id) => {
        acc[id] = {
          credential: getProviderCredentialStatus(id),
          syncClient: getProviderSyncConfigStatus(id),
          payload: buildProviderPayload(id)
        };
        return acc;
      }, {})
    });
    return;
  }

  let payload;
  try { payload = input.payload || buildProviderPayload(provider); } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message });
    return;
  }

  const credential = getProviderCredentialStatus(provider);
  const syncClient = getProviderSyncConfigStatus(provider);
  if (!commit) {
    sendJson(res, 200, {
      ok: true,
      mode: 'dry-run',
      message: `${provider} payload generated. No listing provider was updated.`,
      provider,
      credential,
      syncClient,
      payload
    });
    return;
  }

  if (!credential.canWrite || syncClient.dryRunOnly) {
    sendJson(res, 409, {
      ok: false,
      mode: 'commit-blocked',
      error: `${provider} is not ready for live API write. Add the missing credentials and provider update path first.`,
      provider,
      credential,
      syncClient,
      payload
    });
    return;
  }

  try {
    const providerResponse = await submitProviderPayload(provider, payload, values);
    sendJson(res, providerResponse.ok ? 200 : 502, {
      ok: providerResponse.ok,
      mode: 'commit',
      provider,
      credential,
      syncClient,
      providerResponse,
      payload
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      mode: 'commit-error',
      provider,
      error: error.message,
      credential,
      syncClient,
      payload
    });
  }
};
