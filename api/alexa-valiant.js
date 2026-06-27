const BUSINESS = {
  name: 'Valiant Garage Door',
  phoneSpoken: 'nine two five, four zero nine, four nine seven four',
  phoneDisplay: '925-409-4974',
  website: 'https://www.valiantdoor.com',
  quoteUrl: 'https://www.valiantdoor.com/quote',
  alexaUrl: 'https://www.valiantdoor.com/amazon-alexa',
  cities: 'Pleasanton, Dublin, Livermore, Fremont, San Ramon, Danville, Sunol, and nearby East Bay communities'
};

const HELP_PROMPT = 'You can ask for emergency garage door help, broken spring advice, service areas, the phone number, hours, or how to book service. What would you like?';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function response(text, options = {}) {
  const shouldEndSession = options.shouldEndSession === undefined ? false : Boolean(options.shouldEndSession);
  const payload = {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text
      },
      shouldEndSession
    }
  };

  if (!shouldEndSession) {
    payload.response.reprompt = {
      outputSpeech: {
        type: 'PlainText',
        text: options.reprompt || HELP_PROMPT
      }
    };
  }

  if (options.cardTitle) {
    payload.response.card = {
      type: 'Simple',
      title: options.cardTitle,
      content: options.cardContent || text
    };
  }

  return payload;
}

function endResponse(text, options = {}) {
  return response(text, { ...options, shouldEndSession: true });
}

function launchResponse() {
  return response(
    `Welcome to ${BUSINESS.name}. I can help with emergency garage door repair, broken spring safety, service areas, booking, hours, and the phone number. ${HELP_PROMPT}`,
    {
      cardTitle: 'Valiant Garage Door',
      cardContent: `Ask for emergency help, broken spring advice, service areas, booking, hours, or the phone number. Call ${BUSINESS.phoneDisplay}.`
    }
  );
}

function emergencyResponse() {
  const text = `If your garage door is stuck, crooked, hanging by cables, or has a broken spring, keep people clear of the door and do not force it open. For Valiant Garage Door emergency repair, call ${BUSINESS.phoneSpoken}. That is ${BUSINESS.phoneDisplay}.`;
  return endResponse(text, {
    cardTitle: 'Emergency Garage Door Repair',
    cardContent: `Do not force a stuck, crooked, or spring-broken door. Call Valiant Garage Door at ${BUSINESS.phoneDisplay}.`
  });
}

function springResponse() {
  const text = `For a possible broken garage door spring, do not pull the emergency release unless the door is fully closed, and do not try to lift a heavy door by hand. Call ${BUSINESS.name} at ${BUSINESS.phoneSpoken} for spring replacement help in Pleasanton and nearby cities.`;
  return endResponse(text, {
    cardTitle: 'Broken Spring Safety',
    cardContent: `Do not force the door or handle springs yourself. Call ${BUSINESS.phoneDisplay} for spring replacement help.`
  });
}

function phoneResponse() {
  return endResponse(`The phone number for ${BUSINESS.name} is ${BUSINESS.phoneSpoken}. Again, that is ${BUSINESS.phoneDisplay}.`, {
    cardTitle: 'Valiant Garage Door Phone',
    cardContent: `${BUSINESS.name}: ${BUSINESS.phoneDisplay}`
  });
}

function serviceAreasResponse() {
  return endResponse(`${BUSINESS.name} serves ${BUSINESS.cities}.`, {
    cardTitle: 'Service Areas',
    cardContent: `${BUSINESS.name} serves ${BUSINESS.cities}.`
  });
}

function bookingResponse() {
  return endResponse(`You can request service at ${BUSINESS.website}, slash quote, or call ${BUSINESS.phoneSpoken}.`, {
    cardTitle: 'Book Valiant Garage Door',
    cardContent: `Request service: ${BUSINESS.quoteUrl}\nCall: ${BUSINESS.phoneDisplay}`
  });
}

function hoursResponse() {
  return endResponse(`${BUSINESS.name} offers same-day and emergency garage door repair when scheduling is available. For current availability, call ${BUSINESS.phoneSpoken}.`, {
    cardTitle: 'Current Availability',
    cardContent: `Call ${BUSINESS.phoneDisplay} for current same-day and emergency availability.`
  });
}

function websiteResponse() {
  return endResponse(`The official website is valiant door dot com. The Alexa support page is valiant door dot com slash amazon dash alexa.`, {
    cardTitle: 'Valiant Website',
    cardContent: `${BUSINESS.website}\nAlexa support: ${BUSINESS.alexaUrl}`
  });
}

function fallbackResponse() {
  return response(`I can help with emergency garage door repair, broken springs, service areas, booking, hours, or the phone number. ${HELP_PROMPT}`);
}

function validateApplication(body) {
  const expected = process.env.ALEXA_SKILL_ID;
  if (!expected) return true;
  const supplied = body && body.session && body.session.application && body.session.application.applicationId;
  return supplied === expected;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      app: 'Valiant Garage Door Alexa skill endpoint',
      endpoint: '/api/alexa-valiant',
      status: 'ready-for-alexa-posts',
      collectsPersonalData: false
    });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body.' });
    return;
  }

  if (!validateApplication(body)) {
    sendJson(res, 403, { ok: false, error: 'Alexa applicationId not authorized.' });
    return;
  }

  const request = body.request || {};
  const type = request.type;
  const intentName = request.intent && request.intent.name;

  if (type === 'LaunchRequest') {
    sendJson(res, 200, launchResponse());
    return;
  }

  if (type === 'SessionEndedRequest') {
    sendJson(res, 200, { version: '1.0', response: {} });
    return;
  }

  if (type !== 'IntentRequest') {
    sendJson(res, 200, fallbackResponse());
    return;
  }

  switch (intentName) {
    case 'GetEmergencyHelpIntent':
      sendJson(res, 200, emergencyResponse());
      return;
    case 'GetBrokenSpringAdviceIntent':
      sendJson(res, 200, springResponse());
      return;
    case 'GetPhoneIntent':
      sendJson(res, 200, phoneResponse());
      return;
    case 'GetServiceAreasIntent':
      sendJson(res, 200, serviceAreasResponse());
      return;
    case 'GetBookingIntent':
      sendJson(res, 200, bookingResponse());
      return;
    case 'GetHoursIntent':
      sendJson(res, 200, hoursResponse());
      return;
    case 'GetWebsiteIntent':
      sendJson(res, 200, websiteResponse());
      return;
    case 'AMAZON.HelpIntent':
      sendJson(res, 200, response(HELP_PROMPT));
      return;
    case 'AMAZON.CancelIntent':
    case 'AMAZON.StopIntent':
      sendJson(res, 200, endResponse(`Thanks for using ${BUSINESS.name}.`));
      return;
    case 'AMAZON.FallbackIntent':
    default:
      sendJson(res, 200, fallbackResponse());
  }
};
