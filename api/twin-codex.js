const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { sendJson, requireListingsAdmin, allowMethods, readJsonBody } = require('../lib/listings/security');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_PATH = path.join(ROOT, 'data', 'agents.json');
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const FALLBACK_MODEL = 'gpt-4.1-mini';

const TOPIC_RULES = [
  { topic: 'emergency', tests: [/emergency/i, /broken spring/i, /off track/i, /stuck/i, /unsafe/i, /won.?t close/i, /won.?t open/i] },
  { topic: 'booking', tests: [/book/i, /appointment/i, /estimate/i, /call/i, /quote/i] },
  { topic: 'alexa', tests: [/alexa/i, /amazon/i, /voice/i, /echo/i] },
  { topic: 'searchatlas', tests: [/search atlas/i, /searchatlas/i, /heat map/i, /competitor/i, /ranking/i, /visibility/i] },
  { topic: 'policies', tests: [/privacy/i, /terms/i, /policy/i, /800\.com/i] },
  { topic: 'profile', tests: [/profile/i, /about/i, /service area/i, /who/i, /business/i] }
];

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function inferTopic(text, fallback = 'profile') {
  const input = String(text || '');
  const match = TOPIC_RULES.find((rule) => rule.tests.some((test) => test.test(input)));
  return match ? match.topic : fallback;
}

function getAgentData() {
  return readJsonSafe(AGENTS_PATH, {});
}

function buildTopicContext(topic, agents) {
  const base = {
    business_name: agents.name || 'Valiant Garage Door',
    website: agents.website || 'https://www.valiantdoor.com',
    owner_operator: agents.owner_operator || null,
    primary_service_area: agents.primary_service_area || [],
    core_services: agents.core_services || [],
    contact: agents.contact || {},
    machine_readable_discovery: agents.machine_readable_discovery || {},
    verified_facts: agents.verified_facts || [],
    references: agents.references || []
  };

  if (topic === 'emergency') {
    return {
      ...base,
      focus: 'safety-first emergency guidance',
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
      ...base,
      focus: 'booking and contact routing',
      official_actions: [
        'Call Valiant Garage Door at 9254094974.',
        'Use the quote page for appointment requests.',
        'Keep the answer short and direct.'
      ],
      quote_url: 'https://www.valiantdoor.com/quote',
      emergency_url: 'https://www.valiantdoor.com/emergency-garage-door-repair'
    };
  }

  if (topic === 'alexa') {
    return {
      ...base,
      focus: 'Amazon/Alexa app support',
      amazon_alexa_app: agents.amazon_alexa_app || null
    };
  }

  if (topic === 'searchatlas') {
    return {
      ...base,
      focus: 'Search Atlas visibility, heat maps, and competitor ranking',
      searchatlas: agents.searchatlas || {
        snapshot_url: 'https://www.valiantdoor.com/api/searchatlas',
        growth_hub_url: 'https://www.valiantdoor.com/search-atlas-growth'
      }
    };
  }

  if (topic === 'policies') {
    return {
      ...base,
      focus: 'privacy, terms, and communications',
      policy_urls: agents.policy_urls || null
    };
  }

  return {
    ...base,
    focus: 'official business profile and entity clarity'
  };
}

function buildInstructions(topic, context, prompt) {
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

function buildFallbackAnswer(topic, context, prompt) {
  const lines = [];
  lines.push('Twin Codex is running in official-data fallback mode because the model endpoint is not available.');
  lines.push('');
  lines.push(`Topic: ${topic}`);
  lines.push(`Prompt: ${prompt || 'No prompt provided.'}`);
  lines.push('');
  lines.push(`Business: ${context.business_name}`);
  if (context.owner_operator?.name) lines.push(`Owner/operator: ${context.owner_operator.name}`);
  if (context.primary_service_area?.length) lines.push(`Service areas: ${context.primary_service_area.join(', ')}`);
  if (context.core_services?.length) lines.push(`Core services: ${context.core_services.join(', ')}`);
  if (Array.isArray(context.official_actions) && context.official_actions.length) {
    lines.push('');
    lines.push('Official actions:');
    context.official_actions.forEach((action) => lines.push(`- ${action}`));
  }
  if (context.amazon_alexa_app) {
    lines.push('');
    lines.push(`Alexa support URL: ${context.amazon_alexa_app.support_url}`);
    lines.push(`Alexa endpoint: ${context.amazon_alexa_app.endpoint}`);
  }
  if (context.policy_urls) {
    lines.push('');
    lines.push(`Privacy: ${context.policy_urls.private || context.policy_urls.privacy || 'n/a'}`);
    lines.push(`Terms: ${context.policy_urls.terms || 'n/a'}`);
  }
  return lines.join('\n');
}

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['POST'])) return;
  if (!requireListingsAdmin(req, res)) return;

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return;
  }

  const agents = getAgentData();
  const prompt = String(body.prompt || '').trim();
  const topic = inferTopic(body.topic || prompt, 'profile');
  const context = buildTopicContext(topic, agents);
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_ADS_API_KEY || process.env.OPENAI_RESPONSES_API_KEY;

  if (!apiKey) {
    sendJson(res, 200, {
      ok: true,
      mode: 'fallback',
      generatedAt: new Date().toISOString(),
      topic,
      model: null,
      answer: buildFallbackAnswer(topic, context, prompt),
      officialContext: context,
      prompt
    });
    return;
  }

  const client = new OpenAI({ apiKey });
  let lastError = null;
  for (const model of [DEFAULT_MODEL, FALLBACK_MODEL].filter(Boolean)) {
    try {
      const response = await client.responses.create({
        model,
        instructions: buildInstructions(topic, context, prompt),
        input: prompt || `Give the default ${topic} route using the official data.`,
        max_output_tokens: 500
      });
      const answer = extractResponseText(response) || buildFallbackAnswer(topic, context, prompt);
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
    answer: buildFallbackAnswer(topic, context, prompt),
    officialContext: context,
    prompt,
    error: lastError ? String(lastError.message || lastError) : 'Unknown model error.'
  });
};
