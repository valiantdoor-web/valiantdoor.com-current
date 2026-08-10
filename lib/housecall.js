// Shared Housecall Pro lead forwarding.
//
// Extracted from api/lead.js so the standard lead form and the photo-based
// instant estimate flow forward customers to Housecall Pro with identical,
// proven logic.
//
// Requires HOUSECALL_PRO_API_KEY (Bearer token created by a Housecall Pro
// Admin in the App Store -> API section; lead creation requires a MAX plan).
// Optional: HOUSECALL_PRO_LEAD_SOURCE overrides the lead source name (must
// exactly match a source configured in Housecall Pro; defaults to "Lead Form").
//
// IMPORTANT: this posts to /leads, not /customers. Creating a bare Customer
// does NOT trigger Housecall Pro's "New Lead" push/app notification -- only
// creating an actual Lead does (requires a MAX plan). A lead wraps a
// customer object; lead_source is set on both so it matches HCP's
// create-lead schema and shows correctly in the Leads pipeline UI.

const HCP_LEADS_ENDPOINT = 'https://api.housecallpro.com/leads';
const DEFAULT_LEAD_SOURCE = 'Lead Form';

function resolveLeadSource() {
  const configured = (process.env.HOUSECALL_PRO_LEAD_SOURCE || '').trim();
  const looksLikePlainName =
    configured && configured.length <= 60 && !/[<>{}\n\r]/.test(configured);
  return looksLikePlainName ? configured : DEFAULT_LEAD_SOURCE;
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: 'Website', last_name: 'Lead' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''));
}

// Build a human-readable notes block from every submitted field so no detail
// from the form is lost, regardless of which form it came from.
function buildNotes(fields) {
  const skip = new Set([
    'name', 'first_name', 'last_name', 'phone', 'phone_number', 'mobile',
    'email', 'contact_information', 'contact', 'photos', 'photoPathnames', 'source',
    'ndclid', 'address', 'street', 'city', 'state', 'zip', 'zip_code', 'postal_code',
  ]);
  const labelFor = (key) =>
    key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const lines = [];
  Object.keys(fields).forEach((key) => {
    if (skip.has(key)) return;
    const val = fields[key];
    if (val === undefined || val === null || String(val).trim() === '') return;
    lines.push(`${labelFor(key)}: ${String(val).trim()}`);
  });
  return lines;
}

// Forwards a normalized set of form fields to Housecall Pro.
// Returns { ok, status, error, skipped }.
async function forwardLeadToHousecall(fields, options = {}) {
  const apiKey = process.env.HOUSECALL_PRO_API_KEY;
  if (!apiKey) {
    console.log('[v0] housecall: HOUSECALL_PRO_API_KEY is not set');
    return { ok: false, status: 0, error: 'not_configured' };
  }

  const rawName = fields.name || fields.nominee_name || fields.contact_name || '';
  const rawPhone = fields.phone || fields.phone_number || fields.mobile || '';
  const rawEmail = fields.email || '';
  const rawContact = fields.contact_information || fields.contact || '';

  let email = rawEmail;
  let phone = rawPhone;
  if (!email && isEmail(rawContact)) email = rawContact;
  if (!phone && !isEmail(rawContact)) phone = rawContact;

  const { first_name, last_name } = splitName(rawName || rawContact);
  const mobile_number = normalizePhone(phone);

  const notesLines = buildNotes(fields);
  notesLines.unshift(`Source page: ${fields.source || options.sourceFallback || 'valiantdoor.com'}`);

  const photoCount = Array.isArray(fields.photoPathnames)
    ? fields.photoPathnames.length
    : (Array.isArray(fields.photos) ? fields.photos.length : (fields.photos ? 1 : 0));
  if (photoCount) {
    notesLines.push(`Customer uploaded ${photoCount} photo(s); they were emailed to the office.`);
  }

  const leadSource = resolveLeadSource();

  const customer = {
    first_name,
    last_name,
    lead_source: leadSource,
  };
  if (email && isEmail(email)) customer.email = email;
  if (mobile_number) customer.mobile_number = mobile_number;

  if (!customer.email && !customer.mobile_number) {
    return { ok: false, status: 400, error: 'missing_contact' };
  }

  // Carry the Nextdoor ad click ID (ndclid) through as a Housecall Pro tag,
  // since HCP has no custom-fields support. The Supabase CAPI relay reads
  // this tag back out of the webhook payload (see extractClickId() there) so
  // the eventual conversion can attribute to the specific Nextdoor ad that
  // drove the click. Set on both the lead and the nested customer so it
  // survives regardless of which object the relay inspects. Also noted in
  // the notes for human visibility.
  const ndclid = typeof fields.ndclid === 'string' ? fields.ndclid.trim() : '';
  const tags = [];
  if (ndclid) {
    tags.push(`ndclid:${ndclid}`);
    notesLines.push(`Nextdoor click ID: ${ndclid}`);
  }
  customer.notes = notesLines.join('\n');
  if (tags.length) customer.tags = tags;

  const payload = { customer, lead_source: leadSource };
  if (tags.length) payload.tags = tags;

  // Attach an address when the form provided any location detail so the lead
  // shows up with a service address in Housecall Pro.
  const street = String(fields.address || fields.street || '').trim();
  const city = String(fields.city || '').trim();
  const state = String(fields.state || '').trim();
  const zip = String(fields.zip || fields.zip_code || fields.postal_code || '').trim();
  if (street || city || state || zip) {
    const address = {};
    if (street) address.street = street;
    if (city) address.city = city;
    if (state) address.state = state;
    if (zip) address.zip = zip;
    payload.address = address;
  }

  try {
    const hcpRes = await fetch(HCP_LEADS_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await hcpRes.text();
    if (!hcpRes.ok) {
      console.log('[v0] housecall: rejected lead', hcpRes.status, text);
      return { ok: false, status: hcpRes.status, error: 'rejected' };
    }

    console.log('[v0] housecall: forwarded lead', hcpRes.status);
    return { ok: true, status: hcpRes.status };
  } catch (err) {
    console.log('[v0] housecall: error forwarding lead', err && err.message);
    return { ok: false, status: 502, error: 'network' };
  }
}

module.exports = { forwardLeadToHousecall, isEmail, normalizePhone, splitName };
