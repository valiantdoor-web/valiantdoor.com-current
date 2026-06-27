const { buildAppleLocationPayload } = require('../../lib/listings/data');
const { appleBusinessRequest, getAppleBusinessConfigStatus } = require('../../lib/listings/apple-business-client');
const { sendJson, requireListingsAdmin, allowMethods, readJsonBody } = require('../../lib/listings/security');

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['POST'])) return;
  if (!requireListingsAdmin(req, res)) return;

  let input = {};
  try {
    input = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return;
  }

  const config = getAppleBusinessConfigStatus();
  const payload = input.payload || buildAppleLocationPayload();
  const commitRequested = input.commit === true;
  const dryRun = !commitRequested || config.dryRun;

  if (dryRun) {
    sendJson(res, 200, {
      ok: true,
      mode: 'dry-run',
      message: 'Apple payload generated but not submitted. Set APPLE_BUSINESS_DRY_RUN=false and POST {"commit":true} after Apple API access is approved.',
      appleBusiness: config,
      payload
    });
    return;
  }

  const updatePath = process.env.APPLE_BUSINESS_LOCATION_UPDATE_PATH;
  if (!updatePath) {
    sendJson(res, 409, {
      ok: false,
      error: 'APPLE_BUSINESS_LOCATION_UPDATE_PATH is not configured.',
      appleBusiness: config,
      payload
    });
    return;
  }

  try {
    const response = await appleBusinessRequest(updatePath, {
      method: process.env.APPLE_BUSINESS_UPDATE_METHOD || 'PATCH',
      body: payload,
      values: {
        locationId: process.env.APPLE_BUSINESS_LOCATION_ID,
        brandId: process.env.APPLE_BUSINESS_BRAND_ID
      }
    });

    sendJson(res, response.ok ? 200 : 502, {
      ok: response.ok,
      appleBusiness: config,
      appleResponse: response,
      payload
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message,
      appleBusiness: config,
      payload
    });
  }
};
