const canonicalNap = require('../../data/listings/canonical-nap.json');
const listingsRegistry = require('../../data/listings/listings-registry.json');
const applePayloadTemplate = require('../../data/listings/apple-location-payload.json');
const { getAllProviderCredentialStatus } = require('./credential-status');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getCanonicalNap() {
  return clone(canonicalNap);
}

function getListingsRegistry() {
  return clone(listingsRegistry);
}

function getApplePayloadTemplate() {
  return clone(applePayloadTemplate);
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length === 10) return `1${digits}`;
  return digits;
}

function normalizeString(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeAddress(address = {}) {
  return [address.street, address.city, address.region, address.postalCode, address.country]
    .map(normalizeString)
    .filter(Boolean)
    .join('|');
}

function flattenCanonical(canonical = getCanonicalNap()) {
  const business = canonical.business || {};
  return {
    name: normalizeString(business.name),
    legalName: normalizeString(business.legalName),
    website: normalizeString(business.website).replace(/\/$/, ''),
    phone: normalizePhone(business.phone || business.displayPhone),
    email: normalizeString(business.email),
    address: normalizeAddress(business.address),
    latitude: String(business.geo?.latitude || ''),
    longitude: String(business.geo?.longitude || ''),
    serviceAreas: (business.serviceAreas || []).map(normalizeString).sort().join('|'),
    services: (business.services || []).map(normalizeString).sort().join('|'),
    bookingUrl: normalizeString(business.bookingUrl).replace(/\/$/, '')
  };
}

function buildAuditSnapshot() {
  const canonical = getCanonicalNap();
  const registry = getListingsRegistry();
  const canonicalFlat = flattenCanonical(canonical);

  const credentials = getAllProviderCredentialStatus((registry.providers || []).map((provider) => provider.id));
  const providers = (registry.providers || []).map((provider) => {
    const tracked = provider.fieldsTracked || [];
    const credential = credentials[provider.id] || null;
    return {
      ...provider,
      trackedCount: tracked.length,
      canonicalFields: tracked.reduce((acc, field) => {
        acc[field] = canonicalFlat[field] || canonical.business?.[field] || null;
        return acc;
      }, {}),
      credential,
      driftStatus: provider.managedBy === 'api'
        ? (credential?.canWrite ? 'api-ready' : 'api-managed-needs-credentials')
        : 'tracked-manually'
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    canonical,
    providers,
    summary: {
      providerCount: providers.length,
      apiManagedCount: providers.filter((provider) => provider.managedBy === 'api').length,
      manualTrackedCount: providers.filter((provider) => provider.managedBy !== 'api').length
    }
  };
}

function buildAppleLocationPayload() {
  const canonical = getCanonicalNap();
  const business = canonical.business;
  const template = getApplePayloadTemplate();
  return {
    ...template,
    generatedAt: new Date().toISOString(),
    location: {
      ...template.location,
      displayName: business.name,
      legalName: business.legalName,
      websiteUrl: business.website,
      phoneNumber: business.phone,
      email: business.email,
      address: {
        addressLines: [business.address.street],
        locality: business.address.city,
        administrativeArea: business.address.region,
        postalCode: business.address.postalCode,
        countryCode: business.address.country
      },
      coordinates: business.geo,
      serviceAreas: business.serviceAreas,
      services: business.services,
      actions: [
        { type: 'WEBSITE', url: business.website },
        { type: 'BOOK_APPOINTMENT', url: business.bookingUrl },
        { type: 'CALL', url: `tel:${business.phone}` }
      ]
    }
  };
}

module.exports = {
  getCanonicalNap,
  getListingsRegistry,
  getApplePayloadTemplate,
  flattenCanonical,
  buildAuditSnapshot,
  buildAppleLocationPayload
};
