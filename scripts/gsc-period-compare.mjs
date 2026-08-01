#!/usr/bin/env node
/**
 * GSC period-over-period comparison (zero dependencies).
 *
 * Compares the last N days vs the previous N days (default 9) for a GSC property:
 * total clicks / impressions / CTR / avg position, plus top movers by query and
 * by page.
 *
 * Auth + env: same as scripts/gsc-striking-distance.mjs
 *   GSC_SERVICE_ACCOUNT_JSON, GSC_SITE_URL
 *
 * Optional env:
 *   GSC_WINDOW=9     Days per period.
 *   GSC_LAG=0        Extra days to skip at the end (auto-detects latest data).
 *
 * Usage:
 *   node --env-file-if-exists=/vercel/share/.env.project scripts/gsc-period-compare.mjs
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
  const keyFile = path.resolve(process.cwd(), '.gsc-key.json');
  let raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (fs.existsSync(keyFile)) raw = fs.readFileSync(keyFile, 'utf8');
  if (!raw) fail('No credentials found: add .gsc-key.json or set GSC_SERVICE_ACCOUNT_JSON.');
  let text = raw.trim();
  if (!text.startsWith('{')) {
    try {
      text = Buffer.from(text, 'base64').toString('utf8');
    } catch {
      /* ignore */
    }
  }
  let key;
  try {
    key = JSON.parse(text);
  } catch {
    fail('GSC_SERVICE_ACCOUNT_JSON is not valid JSON (or base64 of JSON).');
  }
  if (!key.client_email || !key.private_key)
    fail('Service-account JSON is missing client_email / private_key.');
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
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
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
  if (!res.ok) fail(`Token exchange failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}
function addDays(dateStr, n) {
  return iso(new Date(new Date(dateStr + 'T00:00:00Z').getTime() + n * 86400000));
}

async function queryGsc(token, siteUrl, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    siteUrl
  )}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) fail(`Search Analytics query failed (${res.status}) for "${siteUrl}": ${await res.text()}`);
  return res.json();
}

async function detectLatestDate(token, siteUrl) {
  // Look back 10 days by 'date' and take the max date that actually has data.
  const r = await queryGsc(token, siteUrl, {
    startDate: iso(daysAgo(12)),
    endDate: iso(daysAgo(1)),
    dimensions: ['date'],
    rowLimit: 30,
  });
  const dates = (r.rows ?? []).map((x) => x.keys[0]).sort();
  return dates.length ? dates[dates.length - 1] : iso(daysAgo(3));
}

async function totals(token, siteUrl, startDate, endDate) {
  const r = await queryGsc(token, siteUrl, { startDate, endDate, rowLimit: 1 });
  const row = (r.rows ?? [])[0] ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return {
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  };
}

async function byDim(token, siteUrl, dim, startDate, endDate) {
  const r = await queryGsc(token, siteUrl, {
    startDate,
    endDate,
    dimensions: [dim],
    rowLimit: 25000,
  });
  const m = new Map();
  for (const row of r.rows ?? []) {
    m.set(row.keys[0], {
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    });
  }
  return m;
}

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}
function signed(n, dp = 0) {
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toFixed(dp)}`;
}
function shortPage(p) {
  return p.replace(/^https?:\/\/(www\.)?valiantdoor\.com/, '') || '/';
}

function deltaTable(label, cur, prev, metric, { posLike = false, topN = 15, minImpr = 0 } = {}) {
  const keys = new Set([...cur.keys(), ...prev.keys()]);
  const rows = [];
  for (const k of keys) {
    const c = cur.get(k) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const p = prev.get(k) ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    if (Math.max(c.impressions, p.impressions) < minImpr) continue;
    const cv = c[metric] || 0;
    const pv = p[metric] || 0;
    const d = cv - pv;
    rows.push({ k, cv, pv, d, c, p });
  }
  // For position, "improvement" is a decrease; sort by absolute change magnitude.
  rows.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  console.log(`\n${label}`);
  console.log(['metric', 'now', 'prev', 'Δ', 'clk(n/p)', 'impr(n/p)', label.includes('QUERY') ? 'query' : 'page'].join('\t'));
  rows.slice(0, topN).forEach((r) => {
    const now = posLike ? r.cv.toFixed(1) : Math.round(r.cv);
    const prv = posLike ? r.pv.toFixed(1) : Math.round(r.pv);
    const dd = posLike ? signed(-r.d, 1) : signed(r.d, 0); // show pos delta as improvement (+ = moved up)
    console.log(
      [
        metric,
        now,
        prv,
        dd,
        `${r.c.clicks}/${r.p.clicks}`,
        `${r.c.impressions}/${r.p.impressions}`,
        label.includes('PAGE') ? shortPage(r.k) : r.k,
      ].join('\t')
    );
  });
  return rows;
}

async function main() {
  const sa = loadServiceAccount();
  const siteUrl = process.env.GSC_SITE_URL;
  if (!siteUrl) fail('GSC_SITE_URL is not set.');
  const W = Number(process.env.GSC_WINDOW ?? 9);

  const token = await getAccessToken(sa);
  const latest = await detectLatestDate(token, siteUrl);

  // Recent: [latest-(W-1) .. latest]; Previous: the W days immediately before.
  const curEnd = latest;
  const curStart = addDays(curEnd, -(W - 1));
  const prevEnd = addDays(curStart, -1);
  const prevStart = addDays(prevEnd, -(W - 1));

  console.log(`[gsc] Property: ${siteUrl}`);
  console.log(`[gsc] Latest date with data: ${latest}`);
  console.log(`[gsc] Recent   ${W}d: ${curStart} -> ${curEnd}`);
  console.log(`[gsc] Previous ${W}d: ${prevStart} -> ${prevEnd}`);

  const [tCur, tPrev] = await Promise.all([
    totals(token, siteUrl, curStart, curEnd),
    totals(token, siteUrl, prevStart, prevEnd),
  ]);

  const pctChange = (c, p) => (p === 0 ? (c > 0 ? Infinity : 0) : ((c - p) / p) * 100);

  console.log('\n========== TOTALS (period over period) ==========');
  console.log(['metric', 'recent', 'previous', 'Δ', 'Δ%'].join('\t'));
  console.log(['clicks', tCur.clicks, tPrev.clicks, signed(tCur.clicks - tPrev.clicks), `${signed(pctChange(tCur.clicks, tPrev.clicks), 1)}%`].join('\t'));
  console.log(['impressions', tCur.impressions, tPrev.impressions, signed(tCur.impressions - tPrev.impressions), `${signed(pctChange(tCur.impressions, tPrev.impressions), 1)}%`].join('\t'));
  console.log(['ctr', pct(tCur.ctr), pct(tPrev.ctr), `${signed((tCur.ctr - tPrev.ctr) * 100, 2)}pp`, ''].join('\t'));
  console.log(['avg_position', tCur.position.toFixed(2), tPrev.position.toFixed(2), `${signed(-(tCur.position - tPrev.position), 2)} (up=+)`, ''].join('\t'));

  const [qCur, qPrev, pCur, pPrev] = await Promise.all([
    byDim(token, siteUrl, 'query', curStart, curEnd),
    byDim(token, siteUrl, 'query', prevStart, prevEnd),
    byDim(token, siteUrl, 'page', curStart, curEnd),
    byDim(token, siteUrl, 'page', prevStart, prevEnd),
  ]);

  deltaTable('========== TOP QUERY MOVERS by CLICKS ==========', qCur, qPrev, 'clicks', { topN: 20 });
  deltaTable('========== TOP QUERY MOVERS by IMPRESSIONS ==========', qCur, qPrev, 'impressions', { topN: 20, minImpr: 20 });
  deltaTable('========== TOP PAGE MOVERS by CLICKS ==========', pCur, pPrev, 'clicks', { topN: 20 });
  deltaTable('========== TOP PAGE MOVERS by IMPRESSIONS ==========', pCur, pPrev, 'impressions', { topN: 20, minImpr: 20 });

  console.log('\n[gsc] JSON_START');
  console.log(
    JSON.stringify(
      {
        property: siteUrl,
        window: W,
        recent: { start: curStart, end: curEnd, ...tCur },
        previous: { start: prevStart, end: prevEnd, ...tPrev },
      },
      null,
      2
    )
  );
  console.log('[gsc] JSON_END');
}

main().catch((e) => fail(e?.stack || String(e)));
