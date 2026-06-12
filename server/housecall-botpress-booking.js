const HOUSECALL_API_BASE_URL = 'https://api.housecallpro.com';
const DEFAULT_TIMEZONE = 'America/Los_Angeles';

function getNestedValue(source, paths) {
  for (const path of paths) {
    const keys = Array.isArray(path) ? path : String(path).split('.');
    let current = source;

    for (const key of keys) {
      if (current == null || !(key in Object(current))) {
        current = undefined;
        break;
      }
      current = current[key];
    }

    if (current !== undefined && current !== null && current !== '') {
      return current;
    }
  }

  return undefined;
}

function getHousecallApiKey() {
  return (
    process.env.HOUSECALL_PRO_API_KEY ||
    process.env.HOUSECALL_API_KEY ||
    process.env.HCP_API_KEY ||
    process.env.BOTPRESS_HOUSECALL_API_KEY
  );
}

function normalizePhone(value) {
  return String(value || '').replace(/\D+/g, '');
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeAddressLine(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function getCollection(responseBody, keys = []) {
  if (Array.isArray(responseBody)) return responseBody;

  for (const key of keys) {
    if (Array.isArray(responseBody?.[key])) return responseBody[key];
    if (Array.isArray(responseBody?.[key]?.data)) return responseBody[key].data;
  }

  if (Array.isArray(responseBody?.data)) return responseBody.data;

  return [];
}

function formatApiError(errorBody, fallbackMessage) {
  if (!errorBody) return fallbackMessage;
  if (typeof errorBody === 'string') return errorBody.trim() || fallbackMessage;

  return (
    errorBody.error ||
    errorBody.message ||
    errorBody.description ||
    errorBody.err ||
    errorBody.errors?.[0]?.message ||
    fallbackMessage
  );
}

async function housecallRequest(apiKey, endpoint, { method = 'GET', body, query } = {}) {
  const url = new URL(endpoint, HOUSECALL_API_BASE_URL);

  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let parsedBody = null;

  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    parsedBody = rawText || null;
  }

  if (!response.ok) {
    const message = formatApiError(parsedBody, `Housecall Pro request failed with ${response.status}`);
    const requestError = new Error(message);
    requestError.status = response.status;
    requestError.body = parsedBody;
    throw requestError;
  }

  return parsedBody;
}

function extractBotpressBookingInput(botpressInput = {}) {
  const timezone =
    getNestedValue(botpressInput, [
      'timezone',
      'requestedTimezone',
      'user.timezone',
      'conversation.timezone',
      'variables.timezone',
      'workflow.timezone',
    ]) || DEFAULT_TIMEZONE;

  const firstName = getNestedValue(botpressInput, [
    'firstName',
    'first_name',
    'customer.firstName',
    'customer.first_name',
    'user.firstName',
    'variables.firstName',
    'workflow.firstName',
  ]);

  const lastName = getNestedValue(botpressInput, [
    'lastName',
    'last_name',
    'customer.lastName',
    'customer.last_name',
    'user.lastName',
    'variables.lastName',
    'workflow.lastName',
  ]);

  const email = getNestedValue(botpressInput, [
    'email',
    'customer.email',
    'user.email',
    'variables.email',
    'workflow.email',
  ]);

  const phone = getNestedValue(botpressInput, [
    'phone',
    'mobile_number',
    'mobileNumber',
    'customer.phone',
    'customer.mobile_number',
    'customer.mobileNumber',
    'user.phone',
    'variables.phone',
    'workflow.phone',
  ]);

  const street = getNestedValue(botpressInput, [
    'street',
    'address.street',
    'customer.address.street',
    'variables.street',
    'workflow.street',
  ]);

  const streetLine2 = getNestedValue(botpressInput, [
    'streetLine2',
    'street_line_2',
    'address.streetLine2',
    'address.street_line_2',
    'customer.address.streetLine2',
    'customer.address.street_line_2',
    'variables.streetLine2',
    'workflow.streetLine2',
  ]);

  const city = getNestedValue(botpressInput, [
    'city',
    'address.city',
    'customer.address.city',
    'variables.city',
    'workflow.city',
  ]);

  const state = getNestedValue(botpressInput, [
    'state',
    'address.state',
    'customer.address.state',
    'variables.state',
    'workflow.state',
  ]);

  const zip = getNestedValue(botpressInput, [
    'zip',
    'postalCode',
    'postal_code',
    'address.zip',
    'address.postalCode',
    'address.postal_code',
    'customer.address.zip',
    'customer.address.postalCode',
    'variables.zip',
    'workflow.zip',
  ]);

  const country =
    getNestedValue(botpressInput, [
      'country',
      'address.country',
      'customer.address.country',
      'variables.country',
      'workflow.country',
    ]) || 'US';

  const requestedStart = getNestedValue(botpressInput, [
    'requestedStart',
    'requested_start',
    'schedule.requestedStart',
    'schedule.scheduledStart',
    'schedule.start',
    'appointment.start',
    'variables.requestedStart',
    'workflow.requestedStart',
  ]);

  const requestedEnd = getNestedValue(botpressInput, [
    'requestedEnd',
    'requested_end',
    'schedule.requestedEnd',
    'schedule.scheduledEnd',
    'schedule.end',
    'appointment.end',
    'variables.requestedEnd',
    'workflow.requestedEnd',
  ]);

  const requestedDurationMinutes = Number(
    getNestedValue(botpressInput, [
      'durationMinutes',
      'duration_minutes',
      'schedule.durationMinutes',
      'schedule.duration_minutes',
      'appointment.durationMinutes',
      'variables.durationMinutes',
      'workflow.durationMinutes',
    ]) || 0
  );

  const arrivalWindow = Number(
    getNestedValue(botpressInput, [
      'arrivalWindow',
      'arrival_window',
      'schedule.arrivalWindow',
      'schedule.arrival_window',
      'variables.arrivalWindow',
      'workflow.arrivalWindow',
    ]) || 0
  );

  const leadSource =
    getNestedValue(botpressInput, [
      'leadSource',
      'lead_source',
      'variables.leadSource',
      'workflow.leadSource',
    ]) || 'Botpress';

  const serviceSummary = getNestedValue(botpressInput, [
    'serviceSummary',
    'service_summary',
    'issueSummary',
    'issue_summary',
    'jobSummary',
    'job_summary',
    'notes',
    'customerMessage',
    'conversation.lastMessage',
    'variables.serviceSummary',
    'workflow.serviceSummary',
  ]);

  const assignedEmployeeIds =
    getNestedValue(botpressInput, [
      'assignedEmployeeIds',
      'assigned_employee_ids',
      'schedule.assignedEmployeeIds',
      'variables.assignedEmployeeIds',
      'workflow.assignedEmployeeIds',
    ]) || [];

  const tags =
    getNestedValue(botpressInput, ['tags', 'variables.tags', 'workflow.tags']) || [];

  const jobFields =
    getNestedValue(botpressInput, ['jobFields', 'job_fields', 'variables.jobFields', 'workflow.jobFields']) || undefined;

  const lineItems =
    getNestedValue(botpressInput, ['lineItems', 'line_items', 'variables.lineItems', 'workflow.lineItems']) || undefined;

  const normalizedStart = requestedStart ? new Date(requestedStart) : null;
  const normalizedEnd = requestedEnd
    ? new Date(requestedEnd)
    : normalizedStart && requestedDurationMinutes > 0
      ? new Date(normalizedStart.getTime() + requestedDurationMinutes * 60 * 1000)
      : null;

  return {
    firstName,
    lastName,
    email,
    phone,
    street,
    streetLine2,
    city,
    state,
    zip,
    country,
    requestedStart: normalizedStart,
    requestedEnd: normalizedEnd,
    arrivalWindow: arrivalWindow > 0 ? arrivalWindow : undefined,
    leadSource,
    serviceSummary,
    assignedEmployeeIds: Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : [assignedEmployeeIds].filter(Boolean),
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    jobFields,
    lineItems,
    timezone,
  };
}

function validateBookingInput(bookingInput) {
  const missing = [];

  if (!bookingInput.firstName && !bookingInput.lastName && !bookingInput.email && !bookingInput.phone) {
    missing.push('customer name, email, or phone');
  }
  if (!bookingInput.street) missing.push('street');
  if (!bookingInput.city) missing.push('city');
  if (!bookingInput.state) missing.push('state');
  if (!bookingInput.zip) missing.push('zip');
  if (!(bookingInput.requestedStart instanceof Date) || Number.isNaN(bookingInput.requestedStart.getTime())) {
    missing.push('requestedStart');
  }
  if (!(bookingInput.requestedEnd instanceof Date) || Number.isNaN(bookingInput.requestedEnd.getTime())) {
    missing.push('requestedEnd');
  }

  if (!missing.length) return null;
  return `Missing or invalid booking fields: ${missing.join(', ')}`;
}

function getLocalDateParts(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

  return {
    weekday: lookup.weekday,
    minutes: Number(lookup.hour) * 60 + Number(lookup.minute),
  };
}

function parseWindowMinutes(value) {
  const [hours, minutes] = String(value || '')
    .split(':')
    .map((part) => Number.parseInt(part, 10));

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function isRequestedSlotAvailable(scheduleAvailability, requestedStart, requestedEnd, timezone) {
  const days = getCollection(scheduleAvailability?.daily_availabilities, ['daily_availabilities']);
  if (!days.length) {
    return {
      available: false,
      message: 'Housecall Pro schedule availability returned no schedule windows.',
    };
  }

  const startParts = getLocalDateParts(requestedStart, timezone);
  const endParts = getLocalDateParts(requestedEnd, timezone);

  if (startParts.weekday !== endParts.weekday) {
    return {
      available: false,
      message: 'Requested slot crosses multiple days, which this booking function does not support.',
    };
  }

  const matchingDay = days.find((day) => normalizeText(day?.day_name) === normalizeText(startParts.weekday));
  const windows = getCollection(matchingDay?.schedule_windows, ['schedule_windows']);

  if (!windows.length) {
    return {
      available: false,
      message: `No Housecall Pro schedule windows are configured for ${startParts.weekday}.`,
    };
  }

  const matchingWindow = windows.find((window) => {
    const windowStart = parseWindowMinutes(window?.start_time);
    const windowEnd = parseWindowMinutes(window?.end_time);

    if (windowStart === null || windowEnd === null) return false;
    return startParts.minutes >= windowStart && endParts.minutes <= windowEnd;
  });

  if (!matchingWindow) {
    return {
      available: false,
      message: `Requested time is outside the configured Housecall Pro schedule windows for ${startParts.weekday}.`,
    };
  }

  return {
    available: true,
    window: matchingWindow,
  };
}

function findExactCustomer(customers, bookingInput) {
  const email = normalizeText(bookingInput.email);
  const phone = normalizePhone(bookingInput.phone);

  return customers.find((customer) => {
    const matchesEmail =
      email &&
      [customer?.email, customer?.emails?.[0]?.value]
        .filter(Boolean)
        .some((value) => normalizeText(value) === email);

    const matchesPhone =
      phone &&
      [
        customer?.mobile_number,
        customer?.home_number,
        customer?.work_number,
        customer?.phone_number,
        customer?.phone,
      ]
        .filter(Boolean)
        .some((value) => normalizePhone(value) === phone);

    return Boolean(matchesEmail || matchesPhone);
  });
}

function findExactAddress(addresses, bookingInput) {
  const expectedStreet = normalizeAddressLine(bookingInput.street);
  const expectedLine2 = normalizeAddressLine(bookingInput.streetLine2);
  const expectedCity = normalizeText(bookingInput.city);
  const expectedState = normalizeText(bookingInput.state);
  const expectedZip = normalizeText(bookingInput.zip);

  return addresses.find((address) => {
    const streetMatches = normalizeAddressLine(address?.street) === expectedStreet;
    const line2Matches = normalizeAddressLine(address?.street_line_2) === expectedLine2;
    const cityMatches = normalizeText(address?.city) === expectedCity;
    const stateMatches = normalizeText(address?.state) === expectedState;
    const zipMatches = normalizeText(address?.zip) === expectedZip;

    return streetMatches && line2Matches && cityMatches && stateMatches && zipMatches;
  });
}

async function findOrCreateCustomer(apiKey, bookingInput) {
  const searchQuery = bookingInput.email || bookingInput.phone || [bookingInput.firstName, bookingInput.lastName].filter(Boolean).join(' ');
  let existingCustomer = null;

  if (searchQuery) {
    const customerSearch = await housecallRequest(apiKey, '/customers', {
      method: 'GET',
      query: {
        q: searchQuery,
        page_size: 25,
      },
    });

    existingCustomer = findExactCustomer(getCollection(customerSearch, ['customers']), bookingInput);
  }

  if (existingCustomer?.id) {
    return existingCustomer;
  }

  const createdCustomer = await housecallRequest(apiKey, '/customers', {
    method: 'POST',
    body: {
      first_name: bookingInput.firstName,
      last_name: bookingInput.lastName,
      email: bookingInput.email,
      mobile_number: bookingInput.phone,
      notifications_enabled: true,
      lead_source: bookingInput.leadSource,
      notes: bookingInput.serviceSummary,
      tags: bookingInput.tags,
    },
  });

  return createdCustomer;
}

async function findOrCreateAddress(apiKey, customerId, bookingInput) {
  const addressResponse = await housecallRequest(apiKey, `/customers/${customerId}/addresses`, {
    method: 'GET',
  });

  const existingAddress = findExactAddress(getCollection(addressResponse, ['addresses']), bookingInput);
  if (existingAddress?.id) {
    return existingAddress;
  }

  const createdAddress = await housecallRequest(apiKey, `/customers/${customerId}/addresses`, {
    method: 'POST',
    body: {
      street: bookingInput.street,
      street_line_2: bookingInput.streetLine2,
      city: bookingInput.city,
      state: bookingInput.state,
      zip: bookingInput.zip,
      country: bookingInput.country,
    },
  });

  return createdAddress;
}

async function createHousecallJobFromBotpress(botpressInput = {}) {
  try {
    const apiKey = getHousecallApiKey();
    if (!apiKey) {
      return {
        ok: false,
        message:
          'Housecall Pro API key is not configured. Set HOUSECALL_PRO_API_KEY, HOUSECALL_API_KEY, HCP_API_KEY, or BOTPRESS_HOUSECALL_API_KEY before using this function.',
      };
    }

    const bookingInput = extractBotpressBookingInput(botpressInput);
    const validationError = validateBookingInput(bookingInput);

    if (validationError) {
      return {
        ok: false,
        message: validationError,
      };
    }

    const scheduleAvailability = await housecallRequest(apiKey, '/company/schedule_availability', {
      method: 'GET',
    });

    const availabilityCheck = isRequestedSlotAvailable(
      scheduleAvailability,
      bookingInput.requestedStart,
      bookingInput.requestedEnd,
      bookingInput.timezone
    );

    if (!availabilityCheck.available) {
      return {
        ok: false,
        message: availabilityCheck.message,
      };
    }

    const customer = await findOrCreateCustomer(apiKey, bookingInput);
    if (!customer?.id) {
      return {
        ok: false,
        message: 'Housecall Pro did not return a customer ID.',
      };
    }

    const address = await findOrCreateAddress(apiKey, customer.id, bookingInput);
    if (!address?.id) {
      return {
        ok: false,
        message: 'Housecall Pro did not return an address ID.',
      };
    }

    const jobPayload = {
      customer_id: customer.id,
      address_id: address.id,
      lead_source: bookingInput.leadSource,
      notes: bookingInput.serviceSummary,
      tags: bookingInput.tags,
      assigned_employee_ids: bookingInput.assignedEmployeeIds,
      line_items: bookingInput.lineItems,
      job_fields: bookingInput.jobFields,
      schedule: {
        scheduled_start: bookingInput.requestedStart.toISOString(),
        scheduled_end: bookingInput.requestedEnd.toISOString(),
        arrival_window: bookingInput.arrivalWindow,
      },
    };

    Object.keys(jobPayload).forEach((key) => {
      const value = jobPayload[key];
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (Array.isArray(value) && !value.length)
      ) {
        delete jobPayload[key];
      }
    });

    if (jobPayload.schedule && !jobPayload.schedule.arrival_window) {
      delete jobPayload.schedule.arrival_window;
    }

    const job = await housecallRequest(apiKey, '/jobs', {
      method: 'POST',
      body: jobPayload,
    });

    if (!job?.id) {
      return {
        ok: false,
        message: 'Housecall Pro accepted the request but did not return a job ID.',
      };
    }

    const confirmationName = [customer.first_name || bookingInput.firstName, customer.last_name || bookingInput.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      ok: true,
      message: `Booked Housecall Pro job ${job.id}${confirmationName ? ` for ${confirmationName}` : ''}.`,
      jobId: job.id,
      customerId: customer.id,
      addressId: address.id,
      scheduledStart: bookingInput.requestedStart.toISOString(),
      scheduledEnd: bookingInput.requestedEnd.toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || 'Unable to create the Housecall Pro job.',
    };
  }
}

module.exports = {
  createHousecallJobFromBotpress,
};
