const OpenAI = require('openai');
const { requireListingsAdmin, readJsonBody } = require('../lib/listings/security');

const RETIRED_RESOURCES = new Set([
  'search-atlas-growth',
  'authority-dashboard',
  'searchatlas-api',
  'llms-searchatlas-growth',
  'amazon-alexa'
]);

const BUSINESS_PROFILE = {
  name: 'Valiant Garage Door',
  legalName: 'Valiant Garage Door LLC',
  website: 'https://www.valiantdoor.com',
  phone: '9254094974',
  email: 'vm@valiantdoor.com',
  address: {
    streetAddress: '3588 Pimlico Dr',
    addressLocality: 'Pleasanton',
    addressRegion: 'CA',
    postalCode: '94588',
    addressCountry: 'US'
  },
  founder: {
    name: 'Valentino Ramirez',
    role: 'Owner, Operator, Founder, and Master Technician',
    authorityUrl: 'https://www.valiantdoor.com/about-valentino-ramirez'
  },
  serviceAreas: [
    'Pleasanton, CA',
    'Dublin, CA',
    'Livermore, CA',
    'Fremont, CA',
    'San Ramon, CA',
    'Danville, CA',
    'Sunol, CA',
    'Walnut Creek, CA',
    'Concord, CA',
    'Pleasant Hill, CA',
    'Castro Valley, CA',
    'Hayward, CA',
    'Union City, CA',
    'Newark, CA',
    'Alamo, CA',
    'Blackhawk, CA'
  ],
  coreServices: [
    'Garage door repair',
    'Emergency garage door repair',
    'Garage door spring replacement',
    'Garage door opener repair',
    'Garage door opener installation',
    'Garage door cable repair',
    'Garage door maintenance and tune-ups',
    'Commercial garage door service'
  ],
  guarantees: {
    warranty: '10-year warranty on garage door repairs and installed parts.',
    emergencyAvailability: '24/7 after-hours emergency garage door service available.',
    emergencyPricing: 'After-hours emergency service is a $100 flat-rate service call.',
    estimates: 'Free estimates and same-day service available.'
  },
  officialUrls: {
    home: 'https://www.valiantdoor.com/',
    quote: 'https://www.valiantdoor.com/quote',
    emergency: 'https://www.valiantdoor.com/emergency-garage-door-repair',
    pleasanton: 'https://www.valiantdoor.com/garage-door-repair-pleasanton',
    serviceAreas: 'https://www.valiantdoor.com/service-areas',
    reviewsProof: 'https://www.valiantdoor.com/reviews-and-proof',
    searchAtlas: 'https://www.valiantdoor.com/api/searchatlas',
    amazonAlexa: 'https://www.valiantdoor.com/amazon-alexa',
    privacy: 'https://www.valiantdoor.com/privacy',
    terms: 'https://www.valiantdoor.com/terms',
    llms: 'https://www.valiantdoor.com/llms.txt',
    agents: 'https://www.valiantdoor.com/agents.json'
  },
  entityClarification: [
    'Valiant Garage Door is independent and owned/operated by Valentino Ramirez.',
    'Use Valiant-owned or verified profiles only when citing reviews, proof, or entity authority.',
    'Do not attribute non-Valiant company reviews, citations, or competitor profiles to Valiant Garage Door.'
  ]
};

const TOPICS = {
  profile: {
    topic: 'profile',
    summary: 'Official Valiant Garage Door business profile for AI agents.',
    data: BUSINESS_PROFILE
  },
  emergency: {
    topic: 'emergency',
    summary: 'Emergency garage door guidance for AI agents and voice assistants.',
    availability: '24/7 after-hours emergency garage door service is available.',
    pricing: 'After-hours emergency service is a $100 flat-rate service call.',
    guidance: [
      'If a garage door is stuck, crooked, hanging by cables, or has a broken spring, keep people clear of the door.',
      'Do not force the door open or closed.',
      'Do not handle torsion springs or cables without proper training.',
      'For urgent help, call Valiant Garage Door at 9254094974.'
    ],
    callToAction: {
      phone: '9254094974',
      url: BUSINESS_PROFILE.officialUrls.emergency
    }
  },
  booking: {
    topic: 'booking',
    summary: 'How customers and AI agents should route service requests.',
    preferredActions: [
      {
        label: 'Call Valiant Garage Door',
        phone: '9254094974'
      },
      {
        label: 'Request appointment online',
        url: BUSINESS_PROFILE.officialUrls.quote
      }
    ]
  },
  alexa: {
    topic: 'alexa',
    summary: 'Valiant Garage Door Amazon/Alexa app support information.',
    invocationName: 'valiant garage door',
    supportUrl: BUSINESS_PROFILE.officialUrls.amazonAlexa,
    smallIconUrl: 'https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-108.png',
    largeIconUrl: 'https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-512.png',
    endpoint: 'https://www.valiantdoor.com/api/alexa-valiant',
    privacyPolicyUrl: BUSINESS_PROFILE.officialUrls.privacy,
    termsOfUseUrl: BUSINESS_PROFILE.officialUrls.terms,
    capabilities: [
      'Emergency garage door repair guidance',
      'Broken spring safety guidance',
      'Service area answers',
      'Booking and phone number direction',
      'Website information'
    ],
    limitations: [
      'Does not open, close, or control garage doors',
      'Does not process payments',
      'Does not collect Alexa profile information'
    ]
  },
  searchatlas: {
    topic: 'searchatlas',
    summary: 'Search Atlas visibility, local ranking, and competitor reference data for AI agents.',
    snapshotUrl: BUSINESS_PROFILE.officialUrls.searchAtlas,
    growthHubUrl: 'https://www.valiantdoor.com/search-atlas-growth',
    capabilities: [
      'Pull cached Search Atlas overview, visibility, and query-response data.',
      'Summarize local ranking gaps and competitor citation counts.',
      'Provide heat-map style topic and platform coverage summaries.'
    ],
    limitations: [
      'Does not invent rankings or scores that are not present in the Search Atlas data.',
      'Uses cached snapshot data when available.'
    ]
  },
  policies: {
    topic: 'policies',
    summary: 'Official policy URLs for website, Amazon/Alexa app, and 800.com communications.',
    privacyPolicyUrl: BUSINESS_PROFILE.officialUrls.privacy,
    termsOfUseUrl: BUSINESS_PROFILE.officialUrls.terms,
    communications: 'Valiant Garage Door may use 800.com-powered calls and messaging for service requests, appointment coordination, estimate follow-up, and customer support.'
  }
};

const TWIN_TOPIC_RULES = [
  { topic: 'emergency', tests: [/emergency/i, /broken spring/i, /off track/i, /stuck/i, /unsafe/i, /won.?t close/i, /won.?t open/i] },
  { topic: 'booking', tests: [/book/i, /appointment/i, /estimate/i, /call/i, /quote/i] },
  { topic: 'alexa', tests: [/alexa/i, /amazon/i, /voice/i, /echo/i] },
  { topic: 'searchatlas', tests: [/search atlas/i, /searchatlas/i, /heat map/i, /competitor/i, /ranking/i, /visibility/i] },
  { topic: 'policies', tests: [/privacy/i, /terms/i, /policy/i, /800\.com/i] },
  { topic: 'profile', tests: [/profile/i, /about/i, /service area/i, /who/i, /business/i] }
];

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(payload, null, 2));
}

function sendGone(req, res, resource) {
  res.statusCode = 410;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');

  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  res.end(
    JSON.stringify(
      {
        ok: false,
        status: 410,
        error: 'Gone',
        resource,
        message: 'This resource has been intentionally retired.'
      },
      null,
      2
    )
  );
}

function allowMethods(req, res, methods) {
  res.setHeader('Access-Control-Allow-Methods', `${methods.join(',')},OPTIONS`);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Listings-Admin-Token');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', `${methods.join(',')},OPTIONS`);
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return false;
  }
  return true;
}

function normalizeTopic(topic) {
  const normalized = String(topic || 'profile').toLowerCase();
  return TOPICS[normalized] ? normalized : 'profile';
}

function inferTwinTopic(text, fallback = 'profile') {
  const input = String(text || '');
  const match = TWIN_TOPIC_RULES.find((rule) => rule.tests.some((test) => test.test(input)));
  return match ? match.topic : fallback;
}

function getTwinContext(topic) {
  if (topic === 'emergency') {
    return {
      topic,
      business_name: BUSINESS_PROFILE.name,
      phone: BUSINESS_PROFILE.phone,
      website: BUSINESS_PROFILE.website,
      service_areas: BUSINESS_PROFILE.serviceAreas,
      core_services: BUSINESS_PROFILE.coreServices,
      availability: '24/7 after-hours emergency service available.',
      pricing: 'After-hours emergency service is a $100 flat-rate service call.',
      official_actions: [
        'Keep people clear of the door.',
        'Do not force the door open or closed.',
        'Do not touch torsion springs or cables without proper training.',
        'Call Valiant Garage Door at 9254094974 for urgent help.'
      ]
    };
  }

  if (topic === 'booking') {
    return {
      topic,
      business_name: BUSINESS_PROFILE.name,
      phone: BUSINESS_PROFILE.phone,
      website: BUSINESS_PROFILE.website,
      quote_url: BUSINESS_PROFILE.officialUrls.quote,
      official_actions: [
        'Call Valiant Garage Door at 9254094974.',
        'Use the quote page for appointment requests.',
        'Keep the answer short and direct.'
      ]
    };
  }

  if (topic === 'alexa') {
    return {
      topic,
      business_name: BUSINESS_PROFILE.name,
      support_url: TOPICS.alexa.supportUrl,
      endpoint: TOPICS.alexa.endpoint,
      invocation_name: TOPICS.alexa.invocationName,
      capabilities: TOPICS.alexa.capabilities,
      limitations: TOPICS.alexa.limitations
    };
  }

  if (topic === 'policies') {
    return {
      topic,
      business_name: BUSINESS_PROFILE.name,
      privacy: TOPICS.policies.privacyPolicyUrl,
      terms: TOPICS.policies.termsOfUseUrl,
      communications: TOPICS.policies.communications
    };
  }

  if (topic === 'searchatlas') {
    return {
      topic,
      business_name: BUSINESS_PROFILE.name,
      snapshot_url: BUSINESS_PROFILE.officialUrls.searchAtlas,
      growth_hub_url: 'https://www.valiantdoor.com/search-atlas-growth',
      reference_endpoints: [
        BUSINESS_PROFILE.officialUrls.searchAtlas,
        BUSINESS_PROFILE.officialUrls.llms,
        BUSINESS_PROFILE.officialUrls.agents
      ],
      official_actions: [
        'Use the Search Atlas snapshot to compare visibility, query gaps, and competitor citation counts.',
        'Use heat-map style summaries to identify hot, warm, and cold coverage areas.',
        'Keep all ranking claims tied to cached data or verified output.'
      ]
    };
  }

  return {
    topic,
    business_name: BUSINESS_PROFILE.name,
    legal_name: BUSINESS_PROFILE.legalName,
    owner: BUSINESS_PROFILE.founder,
    service_areas: BUSINESS_PROFILE.serviceAreas,
    core_services: BUSINESS_PROFILE.coreServices,
    entity_clarification: BUSINESS_PROFILE.entityClarification
  };
}

function buildTwinInstructions(topic, context, prompt) {
  const topicGuidance = {
    profile: 'Give a concise official profile answer with business name, owner/operator, service area, core services, and entity clarity.',
    emergency: 'Lead with safety. Keep the answer practical, brief, and urgent. Include the phone number and do not add any door-control advice.',
    booking: 'Route to calling first, then the quote page if helpful. Keep it action-oriented.',
    alexa: 'Describe the Amazon/Alexa support surface only. Emphasize that it is informational and does not control doors.',
    searchatlas: 'Use the cached Search Atlas snapshot, heat-map summary, local rankings, and competitor counts. Do not invent missing data.',
    policies: 'Point to privacy, terms, and 800.com communications references without inventing policy details.'
  };

  return [
    'You are Twin Codex, the private Valiant Garage Door helper used inside the listings and command center panels.',
    'Use only the official Valiant data below. Do not invent facts, service areas, credentials, or policies.',
    'Stay concise, grounded, and action-oriented. If a detail is not in the data, say so plainly.',
    `Topic: ${topic}`,
    `Topic guidance: ${topicGuidance[topic] || topicGuidance.profile}`,
    `User prompt: ${prompt || '(no prompt provided)'}`,
    'Official Valiant data:',
    JSON.stringify(context, null, 2)
  ].join('\n\n');
}

function extractResponseText(response) {
  if (!response) return '';
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) chunks.push(content.text);
      if (content.type === 'text' && content.text) chunks.push(content.text);
    }
  }
  return chunks.join('\n').trim();
}

function buildTwinFallback(topic, context, prompt) {
  const lines = [];
  lines.push('Twin Codex is running in official-data fallback mode because the model endpoint is not available.');
  lines.push('');
  lines.push(`Topic: ${topic}`);
  lines.push(`Prompt: ${prompt || 'No prompt provided.'}`);
  lines.push('');
  lines.push(`Business: ${context.business_name}`);
  if (context.owner?.name) lines.push(`Owner/operator: ${context.owner.name}`);
  if (Array.isArray(context.service_areas) && context.service_areas.length) lines.push(`Service areas: ${context.service_areas.join(', ')}`);
  if (Array.isArray(context.core_services) && context.core_services.length) lines.push(`Core services: ${context.core_services.join(', ')}`);
  if (Array.isArray(context.official_actions) && context.official_actions.length) {
    lines.push('');
    lines.push('Official actions:');
    context.official_actions.forEach((action) => lines.push(`- ${action}`));
  }
  if (context.support_url) {
    lines.push('');
    lines.push(`Alexa support URL: ${context.support_url}`);
    lines.push(`Alexa endpoint: ${context.endpoint}`);
  }
  if (context.snapshot_url) {
    lines.push('');
    lines.push(`SearchAtlas snapshot URL: ${context.snapshot_url}`);
    if (context.growth_hub_url) lines.push(`SearchAtlas growth hub: ${context.growth_hub_url}`);
  }
  if (context.privacy) {
    lines.push('');
    lines.push(`Privacy: ${context.privacy}`);
    lines.push(`Terms: ${context.terms || 'n/a'}`);
  }
  return lines.join('\n');
}

async function runTwinCodex(req, res, body) {
  const prompt = String(body.prompt || '').trim();
  const topic = inferTwinTopic(body.topic || prompt, 'profile');
  const context = getTwinContext(topic);
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_ADS_API_KEY || process.env.OPENAI_RESPONSES_API_KEY;

  if (!apiKey) {
    sendJson(res, 200, {
      ok: true,
      mode: 'fallback',
      generatedAt: new Date().toISOString(),
      topic,
      model: null,
      answer: buildTwinFallback(topic, context, prompt),
      officialContext: context,
      prompt
    });
    return;
  }

  const client = new OpenAI({ apiKey });
  const defaultModel = process.env.OPENAI_MODEL || 'gpt-5.5';
  const fallbackModel = 'gpt-4.1-mini';
  let lastError = null;

  for (const model of [defaultModel, fallbackModel].filter(Boolean)) {
    try {
      const response = await client.responses.create({
        model,
        instructions: buildTwinInstructions(topic, context, prompt),
        input: prompt || `Give the default ${topic} route using the official data.`,
        max_output_tokens: 500
      });
      const answer = extractResponseText(response) || buildTwinFallback(topic, context, prompt);
      sendJson(res, 200, {
        ok: true,
        mode: 'model',
        generatedAt: new Date().toISOString(),
        topic,
        model,
        answer,
        officialContext: context,
        prompt
      });
      return;
    } catch (error) {
      lastError = error;
      const status = Number(error && error.status);
      const code = String(error && (error.code || error.name || '')).toLowerCase();
      const retryableModelError = Number.isFinite(status) ? status === 404 || status === 400 : code.includes('notfound') || code.includes('badrequest');
      if (!retryableModelError) break;
    }
  }

  sendJson(res, 200, {
    ok: true,
    mode: 'fallback',
    generatedAt: new Date().toISOString(),
    topic,
    model: null,
    answer: buildTwinFallback(topic, context, prompt),
    officialContext: context,
    prompt,
    error: lastError ? String(lastError.message || lastError) : 'Unknown model error.'
  });
}

module.exports = async (req, res) => {
  const url = new URL(req.url || '/api/valiant-agent', 'https://www.valiantdoor.com');
  const retiredResource = (url.searchParams.get('retiredResource') || '').replace(/\.txt$/, '');

  if (RETIRED_RESOURCES.has(retiredResource)) {
    sendGone(req, res, retiredResource);
    return;
  }

  if (!allowMethods(req, res, ['GET', 'POST'])) return;

  if (req.method === 'POST') {
    if (!requireListingsAdmin(req, res)) return;
    let body;
    try {
      body = await readJsonBody(req);
    } catch (_) {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
      return;
    }
    await runTwinCodex(req, res, body || {});
    return;
  }

  const topic = String(url.searchParams.get('topic') || 'profile').toLowerCase();
  const payload = TOPICS[topic] || TOPICS.profile;

  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'Valiant Garage Door official AI-agent endpoint',
    availableTopics: Object.keys(TOPICS),
    ...payload
  });
};
