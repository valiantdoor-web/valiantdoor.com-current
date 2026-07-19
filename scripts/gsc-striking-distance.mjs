#!/usr/bin/env node
/**
 * GSC striking-distance report (zero dependencies).
 *
 * Pulls Search Console query data and reports "striking distance" keywords —
 * queries where the site ranks in a target average position band (default 4-8),
 * i.e. bottom of page 1 / top of page 2, the cheapest wins to push into the top 3.
 *
 * Auth: Google Cloud service account with the Search Console API enabled and the
 * service-account email added as a user on the GSC property.
 *
 * Required env:
 *   GSC_SERVICE_ACCOUNT_JSON   Full service-account JSON key (raw JSON or base64).
 *   GSC_SITE_URL               Property, e.g. "https://www.valiantdoor.com/"
 *                              or a domain property "sc-domain:valiantdoor.com".
 *
 * Optional env:
 *   GSC_POS_MIN=4  GSC_POS_MAX=8   Position band (inclusive).
 *   GSC_DAYS=90                    Trailing window (default 90).
 *   GSC_MIN_IMPRESSIONS=10         Ignore ultra-low-impression noise.
 *
 * Usage:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/gsc-striking-distance.mjs
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

function fail(msg) {
  console.error(`\n[gsc] ERROR: ${msg}\n`);
  process.exit(1);
}

function loadServiceAccount() {
  // Prefer a local gitignored key file if present (avoids env-panel truncation
  // of the ~2.3KB service-account key); fall back to the env var.
  const keyFile = path.resolve(process.cwd(), '.gsc-key.json');
  let raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (fs.existsSync(keyFile)) {
    raw = fs.readFileSync(keyFile, 'utf8');
  }
  if (!raw) fail('No credentials found: add .gsc-key.json or set GSC_SERVICE_ACCOUNT_JSON.');
  let text = raw.trim();
  // Support base64-encoded JSON (avoids newline/quoting issues in env panels).
  if (!text.startsWith('{')) {
    try {
      text = Buffer.from(text, 'base64').toString('utf8');
    } catch {
      /* fall through */
    }
  }
  let key;
  try {
    key = JSON.parse(text);
  } catch {
    fail('GSC_SERVICE_ACCOUNT_JSON is not valid JSON (or base64 of JSON).');
  }
  if (!key.client_email || !key.private_key) {
    fail('Service-account JSON is missing client_email / private_key.');
  }
  return key;
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(signingInput), sa.private_key)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    fail(`Token exchange failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return json.access_token;
}

function isoDaysAgo(days) {
  const d = new Date(Date.now() - days * 86400000);
  return d.toISOString().slice(0, 10);
}

async function queryGsc(token, siteUrl, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    fail(`Search Analytics query failed (${res.status}) for "${siteUrl}": ${text}`);
  }
  return res.json();
}

function fmtPct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

async function main() {
  const sa = loadServiceAccount();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) fail('GSC_SITE_URL is not set (e.g. https://www.valiantdoor.com/).');

  const posMin = Number(process.env.GSC_POS_MIN ?? 4);
  const posMax = Number(process.env.GSC_POS_MAX ?? 8);
  const days = Number(process.env.GSC_DAYS ?? 90);
  const minImpr = Number(process.env.GSC_MIN_IMPRESSIONS ?? 10);

  console.log(`[gsc] Property: ${siteUrl}`);
  console.log(`[gsc] Window: last ${days} days | band: pos ${posMin}-${posMax} | min impressions: ${minImpr}\n`);

  const token = await getAccessToken(sa);

  const base = {
    startDate: isoDaysAgo(days),
    endDate: isoDaysAgo(1),
    rowLimit: 25000,
  };

  // Query+page rows: which page ranks in-band for which query (most actionable).
  const qp = await queryGsc(token, siteUrl, {
    ...base,
    dimensions: ['query', 'page'],
  });

  const rows = (qp.rows ?? [])
    .map((r) => ({
      query: r.keys[0],
      page: r.keys[1],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    .filter(
      (r) =>
        r.position >= posMin &&
        r.position <= posMax &&
        r.impressions >= minImpr
    )
    .sort((a, b) => b.impressions - a.impressions);

  if (rows.length === 0) {
    console.log('[gsc] No in-band queries found for that window/threshold.');
    return;
  }

  console.log(`[gsc] ${rows.length} striking-distance query/page pairs (pos ${posMin}-${posMax}):\n`);
  console.log(
    ['#', 'pos', 'impr', 'clicks', 'ctr', 'query', 'page'].join('\t')
  );
  rows.forEach((r, i) => {
    console.log(
      [
        i + 1,
        r.position.toFixed(1),
        r.impressions,
        r.clicks,
        fmtPct(r.ctr),
        r.query,
        r.page.replace('https://www.valiantdoor.com', ''),
      ].join('\t')
    );
  });

  // Also emit machine-readable JSON to stdout tail for downstream mapping.
  console.log('\n[gsc] JSON_START');
  console.log(JSON.stringify(rows, null, 2));
  console.log('[gsc] JSON_END');
}

main().catch((e) => fail(e?.stack || String(e)));
