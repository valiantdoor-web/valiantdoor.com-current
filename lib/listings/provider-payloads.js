const { getCanonicalNap, buildAppleLocationPayload } = require('./data');

function business() {
  return getCanonicalNap().business;
}

function commonIdentity() {
  const b = business();
  return {
    name: b.name,
    legalName: b.legalName,
    description: b.description,
    website: b.website,
    phone: b.phone,
    displayPhone: b.displayPhone,
    email: b.email,
    address: b.address,
    geo: b.geo,
    serviceAreas: b.serviceAreas,
    services: b.services,
    bookingUrl: b.bookingUrl,
    mapsUrl: b.mapsUrl,
    sameAs: b.sameAs,
    socialProfiles: b.socialProfiles
  };
}

function buildBingPlacesPayload() {
  const b = business();
  return {
    source: 'data/listings/canonical-nap.json',
    generatedFor: 'Bing Places / Bing Maps local listing',
    generatedAt: new Date().toISOString(),
    business: {
      businessName: b.name,
      legalName: b.legalName,
      description: b.description,
      websiteUrl: b.website,
      phone: b.phone,
      email: b.email,
      address: {
        addressLine1: b.address.street,
        city: b.address.city,
        stateOrProvince: b.address.region,
        postalCode: b.address.postalCode,
        country: b.address.country
      },
      latitude: b.geo.latitude,
      longitude: b.geo.longitude,
      categories: ['Garage Door Supplier', 'Garage Door Service'],
      serviceAreas: b.serviceAreas,
      services: b.services,
      appointmentUrl: b.bookingUrl
    }
  };
}

function buildGoogleBusinessPayload() {
  const b = business();
  return {
    source: 'data/listings/canonical-nap.json',
    generatedFor: 'Google Business Profile location',
    generatedAt: new Date().toISOString(),
    location: {
      title: b.name,
      storeCode: 'valiant-garage-door-pleasanton',
      websiteUri: b.website,
      phoneNumbers: {
        primaryPhone: b.phone
      },
      profile: {
        description: b.description
      },
      storefrontAddress: {
        addressLines: [b.address.street],
        locality: b.address.city,
        administrativeArea: b.address.region,
        postalCode: b.address.postalCode,
        regionCode: b.address.country
      },
      latlng: {
        latitude: b.geo.latitude,
        longitude: b.geo.longitude
      },
      serviceArea: {
        places: {
          placeInfos: b.serviceAreas.map((area) => ({ placeName: area }))
        }
      },
      serviceItems: b.services.map((service) => ({ freeFormServiceItem: { label: { displayName: service } } })),
      metadata: {
        mapsUri: b.mapsUrl,
        newReviewUri: b.mapsUrl
      },
      openInfo: {
        status: 'OPEN'
      }
    }
  };
}

function buildYelpPayload() {
  const b = business();
  return {
    source: 'data/listings/canonical-nap.json',
    generatedFor: 'Yelp business listing verification',
    generatedAt: new Date().toISOString(),
    business: {
      name: b.name,
      phone: b.phone,
      displayPhone: b.displayPhone,
      url: b.website,
      categories: ['Garage Door Services'],
      location: {
        address1: b.address.street,
        city: b.address.city,
        state: b.address.region,
        zip_code: b.address.postalCode,
        country: b.address.country
      },
      coordinates: b.geo,
      serviceAreas: b.serviceAreas,
      services: b.services
    }
  };
}

function buildAngiPayload() {
  const b = business();
  return {
    source: 'data/listings/canonical-nap.json',
    generatedFor: 'Angi / HomeAdvisor profile verification',
    generatedAt: new Date().toISOString(),
    profileUrl: 'https://www.angi.com/companylist/us/ca/pleasanton/valiant-garage-door-llc-reviews-1.htm',
    business: {
      name: b.name,
      legalName: b.legalName,
      phone: b.phone,
      displayPhone: b.displayPhone,
      website: b.website,
      email: b.email,
      categories: ['Garage Door Services'],
      address: b.address,
      coordinates: b.geo,
      serviceAreas: b.serviceAreas,
      services: b.services,
      bookingUrl: b.bookingUrl
    }
  };
}

function buildYextPayload() {
  const b = business();
  return {
    source: 'data/listings/canonical-nap.json',
    generatedFor: 'Yext Organization and Brand entities',
    generatedAt: new Date().toISOString(),
    entity: {
      name: b.name,
      legalName: b.legalName,
      description: b.description,
      websiteUrl: b.website,
      mainPhone: b.phone,
      emails: [b.email],
      address: {
        line1: b.address.street,
        city: b.address.city,
        region: b.address.region,
        postalCode: b.address.postalCode,
        countryCode: b.address.country
      },
      geocodedCoordinate: b.geo,
      serviceAreaPlaces: b.serviceAreas,
      services: b.services,
      appointmentUrl: b.bookingUrl,
      sameAs: b.sameAs,
      socialProfiles: b.socialProfiles
    }
  };
}

function buildProviderPayload(providerId) {
  switch (providerId) {
    case 'apple-business-connect':
      return buildAppleLocationPayload();
    case 'bing-places':
      return buildBingPlacesPayload();
    case 'google-business-profile':
      return buildGoogleBusinessPayload();
    case 'yelp':
      return buildYelpPayload();
    case 'angi':
      return buildAngiPayload();
    case 'yext':
      return buildYextPayload();
    case 'canonical':
      return { generatedFor: 'Canonical Valiant Garage Door NAP', generatedAt: new Date().toISOString(), business: commonIdentity() };
    default:
      throw new Error(`Unsupported listings provider: ${providerId}`);
  }
}

function buildAllProviderPayloads(providerIds = ['apple-business-connect', 'google-business-profile', 'bing-places', 'yelp', 'angi', 'yext']) {
  return providerIds.reduce((acc, providerId) => {
    acc[providerId] = buildProviderPayload(providerId);
    return acc;
  }, {});
}

module.exports = {
  buildProviderPayload,
  buildAllProviderPayloads,
  buildBingPlacesPayload,
  buildGoogleBusinessPayload,
  buildYelpPayload,
  buildAngiPayload,
  buildYextPayload
};
