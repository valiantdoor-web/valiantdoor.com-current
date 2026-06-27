const { getProviderCredentialStatus } = require('./credential-status');

const providerHttpConfig = {
  'bing-places': {
    baseUrl: 'BING_PLACES_API_BASE_URL',
    updatePath: 'BING_PLACES_UPDATE_PATH',
    updateMethod: 'BING_PLACES_UPDATE_METHOD',
    auth: [
      { key: 'BING_PLACES_ACCESS_TOKEN', type: 'bearer' },
      { key: 'BING_PLACES_API_KEY', type: 'subscription-key', header: 'Ocp-Apim-Subscription-Key' },
      { key: 'YEXT_API_KEY', type: 'bearer' }
    ]
  },
  'google-business-profile': {
    baseUrl: 'GOOGLE_BUSINESS_API_BASE_URL',
    updatePath: 'GOOGLE_BUSINESS_LOCATION_UPDATE_PATH',
    updateMethod: 'GOOGLE_BUSINESS_UPDATE_METHOD',
    auth: [
      { key: 'GOOGLE_BUSINESS_ACCESS_TOKEN', type: 'bearer' }
    ]
  },
  yelp: {
    baseUrl: 'YELP_API_BASE_URL',
    updatePath: 'YELP_BUSINESS_UPDATE_PATH',
    updateMethod: 'YELP_UPDATE_METHOD',
    auth: [
      { key: 'YELP_API_KEY', type: 'bearer' }
    ]
  },
  yext: {
    baseUrl: 'YEXT_API_BASE_URL',
    updatePath: 'YEXT_ENTITY_UPDATE_PATH',
    updateMethod: 'YEXT_UPDATE_METHOD',
    auth: [
      { key: 'YEXT_OAUTH_TOKEN', type: 'bearer' },
      { key: 'YEXT_API_KEY', type: 'api-key-query', query: 'api_key' }
    ]
  }
};

function resolveTemplate(template, values = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const envKey = key.toUpperCase();
    const value = values[key] || process.env[envKey] || process.env[`LISTINGS_${envKey}`] || '';
    if (!value) throw new Error(`Missing value for path token {${key}}.`);
    return encodeURIComponent(value);
  });
}

function authHeader(providerId) {
  const config = providerHttpConfig[providerId];
  if (!config) return { headers: {}, query: {} };
  for (const option of config.auth || []) {
    const value = process.env[option.key];
    if (!value) continue;
    if (option.type === 'bearer') return { headers: { Authorization: `Bearer ${value}` }, query: {} };
    if (option.type === 'subscription-key') return { headers: { [option.header || 'Ocp-Apim-Subscription-Key']: value }, query: {} };
    if (option.type === 'api-key-query') return { headers: {}, query: { [option.query || 'api_key']: value } };
  }
  return { headers: {}, query: {} };
}

function getProviderSyncConfigStatus(providerId) {
  const http = providerHttpConfig[providerId] || null;
  const credential = getProviderCredentialStatus(providerId);
  return {
    providerId,
    directWriteClient: Boolean(http),
    credential,
    hasBaseUrl: http ? Boolean(process.env[http.baseUrl]) : false,
    hasUpdatePath: http ? Boolean(process.env[http.updatePath]) : false,
    updateMethod: http ? (process.env[http.updateMethod] || 'PATCH') : null,
    dryRunOnly: !http || !process.env[http.updatePath] || !credential.canWrite
  };
}

async function submitProviderPayload(providerId, payload, values = {}) {
  const http = providerHttpConfig[providerId];
  if (!http) throw new Error(`No direct write client is configured for ${providerId}.`);
  const base = process.env[http.baseUrl];
  const path = process.env[http.updatePath];
  if (!base) throw new Error(`${http.baseUrl} is not configured.`);
  if (!path) throw new Error(`${http.updatePath} is not configured.`);

  const resolvedPath = resolveTemplate(path, values);
  const url = new URL(resolvedPath, base.endsWith('/') ? base : `${base}/`);
  const auth = authHeader(providerId);
  Object.entries(auth.query || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    method: process.env[http.updateMethod] || 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...auth.headers
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let parsed = text;
  try { parsed = text ? JSON.parse(text) : null; } catch (_) {}

  return {
    ok: response.ok,
    status: response.status,
    url: url.toString().replace(/([?&](api_key|key|token)=)[^&]+/gi, '$1[redacted]'),
    body: parsed
  };
}

module.exports = {
  getProviderSyncConfigStatus,
  submitProviderPayload
};
