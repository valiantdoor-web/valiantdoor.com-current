// Finalizes a photo-based instant estimate:
//   1. Reads the previously uploaded photos back from the private Blob store.
//   2. Emails the customer details + photos (as real attachments) to the office
//      via the Resend API.
//   3. Forwards the lead to Housecall Pro using the shared library.
//
// Env vars:
//   RESEND_API_KEY        (required for email) - Resend API key.
//   ESTIMATE_TO_EMAIL     (optional) - office recipient. Default vm@valiantdoor.com.
//   ESTIMATE_FROM_EMAIL   (optional) - verified Resend sender.
//                          Default "Valiant Estimates <onboarding@resend.dev>".
//   HOUSECALL_PRO_API_KEY (optional) - enables Housecall Pro forwarding.

const { get } = require('@vercel/blob');
const { forwardLeadToHousecall } = require('../lib/housecall');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_TO = 'vm@valiantdoor.com';
const DEFAULT_FROM = 'Valiant Estimates <onboarding@resend.dev>';
const MAX_ATTACHMENT_TOTAL = 20 * 1024 * 1024; // keep total email well under Resend's 40MB cap
const MAX_PHOTOS = 6;

function readJsonBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        raw = '';
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (_err) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function filenameFromPathname(pathname) {
  const base = String(pathname).split('/').pop() || 'photo.jpg';
  return base;
}

async function streamToBuffer(stream) {
  // get() returns a web ReadableStream; Response can drain it to a buffer.
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function collectAttachments(pathnames) {
  const attachments = [];
  const stored = [];
  let total = 0;

  for (const pathname of pathnames) {
    try {
      const result = await get(pathname, { access: 'private' });
      if (!result || result.statusCode !== 200 || !result.stream) {
        stored.push(pathname);
        continue;
      }
      const buffer = await streamToBuffer(result.stream);
      if (total + buffer.length > MAX_ATTACHMENT_TOTAL) {
        // Too big to attach; still note it was stored.
        stored.push(pathname);
        continue;
      }
      total += buffer.length;
      attachments.push({
        filename: filenameFromPathname(pathname),
        content: buffer.toString('base64'),
        contentType: result.blob.contentType || 'application/octet-stream',
      });
    } catch (err) {
      console.log('[v0] estimate: could not read blob', pathname, err && err.message);
      stored.push(pathname);
    }
  }
  return { attachments, stored };
}

function buildEmailHtml(fields, pathnames, attachedCount) {
  const rows = [
    ['Name', fields.name],
    ['Phone', fields.phone],
    ['Email', fields.email],
    ['Problem Type', fields.problem_type],
    ['City', fields.city],
    ['Notes', fields.notes],
    ['Source', fields.source],
  ]
    .filter(([, v]) => v && String(v).trim())
    .map(
      ([label, v]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(v).replace(/\n/g, '<br>')}</td></tr>`
    )
    .join('');

  const photoNote = pathnames.length
    ? `<p style="margin:16px 0 4px">${attachedCount} of ${pathnames.length} photo(s) attached to this email.</p>
       <p style="margin:0 0 4px;color:#555;font-size:13px">Stored securely in Blob:</p>
       <ul style="margin:4px 0 0;padding-left:18px;color:#555;font-size:13px">${pathnames
         .map((p) => `<li>${escapeHtml(p)}</li>`)
         .join('')}</ul>`
    : '<p style="margin:16px 0 4px">No photos were included.</p>';

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111">
    <h2 style="margin:0 0 12px">New Instant Estimate Request</h2>
    <table style="border-collapse:collapse;background:#f7f7f7;border-radius:8px">${rows}</table>
    ${photoNote}
    <p style="margin:16px 0 0;color:#777;font-size:12px">Sent automatically from valiantdoor.com.</p>
  </div>`;
}

async function sendEmail(fields, attachments, pathnames) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[v0] estimate: RESEND_API_KEY not set; skipping email');
    return { ok: false, error: 'not_configured' };
  }

  const to = (process.env.ESTIMATE_TO_EMAIL || DEFAULT_TO).trim();
  const from = (process.env.ESTIMATE_FROM_EMAIL || DEFAULT_FROM).trim();

  const payload = {
    from,
    to: [to],
    subject: `Instant Estimate: ${fields.problem_type || 'Garage door'} - ${fields.city || 'East Bay'}`,
    html: buildEmailHtml(fields, pathnames, attachments.length),
    attachments,
  };
  if (fields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    payload.reply_to = fields.email;
  }

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.log('[v0] estimate: Resend rejected email', resp.status, text);
      return { ok: false, error: 'send_failed', status: resp.status };
    }
    return { ok: true };
  } catch (err) {
    console.log('[v0] estimate: Resend request error', err && err.message);
    return { ok: false, error: 'network' };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  const body = await readJsonBody(req);

  const pathnames = Array.isArray(body.photoPathnames)
    ? body.photoPathnames.filter((p) => typeof p === 'string' && p).slice(0, MAX_PHOTOS)
    : [];

  const fields = {
    name: body.name,
    phone: body.phone,
    email: body.email,
    problem_type: body.problem_type,
    city: body.city,
    notes: body.notes,
    source: body.source || req.headers.referer || 'valiantdoor.com/instant-estimate',
  };

  if (!fields.phone && !fields.email) {
    res.statusCode = 400;
    res.end(JSON.stringify({ ok: false, error: 'A phone number or email is required.' }));
    return;
  }

  const { attachments, stored } = await collectAttachments(pathnames);
  if (stored.length) {
    console.log('[v0] estimate: photos stored but not attached', stored.length);
  }

  const [emailResult, hcpResult] = await Promise.all([
    sendEmail(fields, attachments, pathnames),
    forwardLeadToHousecall({ ...fields, photoPathnames: pathnames }, {
      sourceFallback: req.headers.referer,
    }),
  ]);

  // Success if the request reached the office by at least one channel.
  if (emailResult.ok || hcpResult.ok) {
    res.statusCode = 200;
    res.end(
      JSON.stringify({
        ok: true,
        emailed: emailResult.ok,
        housecall: hcpResult.ok,
        photosAttached: attachments.length,
      })
    );
    return;
  }

  res.statusCode = 502;
  res.end(
    JSON.stringify({
      ok: false,
      error: 'Could not submit your request. Please call us at (925) 409-4974.',
    })
  );
};
