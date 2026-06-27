function hasAny(keys) {
  return keys.some((key) => Boolean(process.env[key]));
}

function hasAll(keys) {
  return keys.every((key) => Boolean(process.env[key]));
}

function redactStatus(keys) {
  return keys.reduce((acc, key) => {
    acc[key] = Boolean(process.env[key]);
    return acc;
  }, {});
}

const providerConfigs = {
  'apple-business-connect': {
    label: 'Apple Business Connect',
    mode: 'direct-api',
    requiredForRead: ['APPLE_BUSINESS_LOCATION_GET_PATH'],
    requiredForWrite: ['APPLE_BUSINESS_LOCATION_UPDATE_PATH'],
    authGroups: [
      ['APPLE_BUSINESS_ACCESS_TOKEN'],
      ['APPLE_BUSINESS_TOKEN_URL', 'APPLE_BUSINESS_CLIENT_ID', 'APPLE_BUSINESS_CLIENT_SECRET'],
      ['APPLE_BUSINESS_PRIVATE_KEY', 'APPLE_BUSINESS_KEY_ID', 'APPLE_BUSINESS_ISSUER_ID'],
      ['APPLE_BUSINESS_PRIVATE_KEY_PATH', 'APPLE_BUSINESS_KEY_ID', 'APPLE_BUSINESS_ISSUER_ID']
    ],
    optional: ['APPLE_BUSINESS_API_BASE_URL', 'APPLE_BUSINESS_BRAND_ID', 'APPLE_BUSINESS_LOCATION_ID', 'APPLE_BUSINESS_UPDATE_METHOD', 'APPLE_BUSINESS_DRY_RUN']
  },
  'google-business-profile': {
    label: 'Google Business Profile',
    mode: 'direct-api',
    requiredForRead: ['GOOGLE_BUSINESS_ACCOUNT_ID', 'GOOGLE_BUSINESS_LOCATION_ID'],
    requiredForWrite: ['GOOGLE_BUSINESS_ACCOUNT_ID', 'GOOGLE_BUSINESS_LOCATION_ID'],
    authGroups: [
      ['GOOGLE_BUSINESS_ACCESS_TOKEN'],
      ['GOOGLE_BUSINESS_CLIENT_ID', 'GOOGLE_BUSINESS_CLIENT_SECRET', 'GOOGLE_BUSINESS_REFRESH_TOKEN']
    ],
    optional: ['GOOGLE_BUSINESS_API_BASE_URL', 'GOOGLE_MAPS_PLACE_ID']
  },
  'bing-places': {
    label: 'Bing Places',
    mode: 'direct-api-or-yext-fallback',
    requiredForRead: ['BING_PLACES_BUSINESS_ID'],
    requiredForWrite: ['BING_PLACES_BUSINESS_ID'],
    authGroups: [
      ['BING_PLACES_API_KEY'],
      ['BING_PLACES_CLIENT_ID', 'BING_PLACES_CLIENT_SECRET', 'BING_PLACES_REFRESH_TOKEN'],
      ['YEXT_API_KEY', 'YEXT_ACCOUNT_ID']
    ],
    optional: ['BING_PLACES_API_BASE_URL', 'BING_PLACES_ACCOUNT_ID', 'BING_PLACES_LOCATION_ID']
  },
  yelp: {
    label: 'Yelp',
    mode: 'read-api-manual-publish',
    requiredForRead: ['YELP_BUSINESS_ID'],
    requiredForWrite: ['YELP_BUSINESS_ID'],
    authGroups: [
      ['YELP_API_KEY']
    ],
    optional: ['YELP_API_BASE_URL']
  },
  angi: {
    label: 'Angi',
    mode: 'manual-profile-review',
    requiredForRead: [],
    requiredForWrite: [],
    authGroups: [],
    optional: ['ANGI_PROFILE_URL']
  },
  yext: {
    label: 'Yext',
    mode: 'publisher-api',
    requiredForRead: ['YEXT_ACCOUNT_ID'],
    requiredForWrite: ['YEXT_ACCOUNT_ID'],
    authGroups: [
      ['YEXT_API_KEY'],
      ['YEXT_OAUTH_TOKEN']
    ],
    optional: ['YEXT_API_BASE_URL', 'YEXT_ORGANIZATION_ENTITY_ID', 'YEXT_BRAND_ENTITY_ID']
  }
};

function authReady(config) {
  return (config.authGroups || []).some(hasAll);
}

function missingGroups(config) {
  return (config.authGroups || []).map((group) => ({
    anyOfAll: group,
    ready: hasAll(group),
    status: redactStatus(group)
  }));
}

function getProviderCredentialStatus(providerId) {
  const config = providerConfigs[providerId];
  if (!config) {
    return {
      providerId,
      label: providerId,
      knownProvider: false,
      canRead: false,
      canWrite: false,
      readyForDryRun: true,
      missing: []
    };
  }

  const auth = authReady(config);
  const readFields = config.requiredForRead || [];
  const writeFields = config.requiredForWrite || [];
  const canRead = auth && hasAll(readFields);
  const canWrite = auth && hasAll(writeFields);
  const checkedKeys = [...new Set([...(readFields || []), ...(writeFields || []), ...(config.optional || [])])];

  return {
    providerId,
    label: config.label,
    knownProvider: true,
    mode: config.mode,
    canRead,
    canWrite,
    readyForDryRun: true,
    authReady: auth,
    dryRunOnly: !canWrite,
    configured: redactStatus(checkedKeys),
    authOptions: missingGroups(config),
    missingForRead: readFields.filter((key) => !process.env[key]),
    missingForWrite: writeFields.filter((key) => !process.env[key]),
    optional: redactStatus(config.optional || [])
  };
}

function getAllProviderCredentialStatus(providerIds = Object.keys(providerConfigs)) {
  return providerIds.reduce((acc, providerId) => {
    acc[providerId] = getProviderCredentialStatus(providerId);
    return acc;
  }, {});
}

module.exports = {
  providerConfigs,
  getProviderCredentialStatus,
  getAllProviderCredentialStatus,
  hasAny,
  hasAll
};
