const { sendJson, requireListingsAdmin, allowMethods } = require('../lib/listings/security');

const API_ROOT = 'https://api.localfalcon.com/v1';
const REPORT_LIMIT = 100;

// The stored key can pick up stray whitespace/newlines when pasted into env UIs,
// and Local Falcon rejects it with a 401 if it is not trimmed.
function getApiKey() {
  return String(process.env.LOCAL_FALCON_API_KEY || '').replace(/\s+/g, '');
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value, places = 2) {
  const factor = 10 ** places;
  return Math.round(num(value) * factor) / factor;
}

async function callFalcon(endpoint, apiKey, params) {
  const url = new URL(`${API_ROOT}/${endpoint}/`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'ValiantAuthorityDashboard/1.0'
    },
    body: new URLSearchParams({ api_key: apiKey }).toString()
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.code >= 400) {
    const message = (payload && (payload.message || payload.error)) || `HTTP ${response.status}`;
    const error = new Error(`Local Falcon ${endpoint} failed: ${message}`);
    error.status = response.status;
    throw error;
  }
  return payload.data || {};
}

function normalizeReport(report) {
  const location = report.location || {};
  return {
    id: report.id || null,
    reportKey: report.report_key || null,
    date: report.date || null,
    timestamp: num(report.timestamp),
    platform: report.platform || 'unknown',
    keyword: report.keyword || 'unknown',
    campaignName: report.campaign_name || null,
    locationName: location.name || null,
    locationAddress: location.address || null,
    rating: location.rating ? round(location.rating, 1) : null,
    reviews: location.reviews == null ? null : num(location.reviews),
    gridSize: report.grid_size ? `${report.grid_size}x${report.grid_size}` : null,
    radius: report.radius ? `${report.radius} ${report.measurement || 'mi'}` : null,
    dataPoints: num(report.data_points),
    foundIn: num(report.found_in),
    // ARP = average rank position, ATRP = average total rank position,
    // SoLV = share of local voice (percentage of grid points where the business appears in the top 3).
    arp: round(report.arp),
    atrp: round(report.atrp),
    solv: round(report.solv),
    heatmap: report.heatmap || null,
    publicUrl: report.public_url || null,
    pdf: report.pdf || null
  };
}

function averageBy(rows, field) {
  if (!rows.length) return 0;
  return round(rows.reduce((sum, row) => sum + num(row[field]), 0) / rows.length);
}

function latestFirst(rows) {
  return [...rows].sort((a, b) => b.timestamp - a.timestamp);
}

function groupBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

function heatFor(solv) {
  if (solv >= 50) return 'hot';
  if (solv >= 15) return 'warm';
  return 'cold';
}

function buildByPlatform(reports) {
  const grouped = groupBy(reports, (row) => row.platform);
  return [...grouped.entries()]
    .map(([platform, rows]) => {
      const solv = averageBy(rows, 'solv');
      const latest = latestFirst(rows)[0];
      return {
        platform,
        reportCount: rows.length,
        avgSolv: solv,
        avgArp: averageBy(rows, 'arp'),
        avgAtrp: averageBy(rows, 'atrp'),
        keywordCount: new Set(rows.map((row) => row.keyword)).size,
        lastScanned: latest ? latest.date : null,
        heat: heatFor(solv)
      };
    })
    .sort((a, b) => b.avgSolv - a.avgSolv);
}

function buildByKeyword(reports) {
  const grouped = groupBy(reports, (row) => row.keyword);
  return [...grouped.entries()]
    .map(([keyword, rows]) => {
      const ordered = latestFirst(rows);
      const latest = ordered[0];
      const platforms = groupBy(rows, (row) => row.platform);
      return {
        keyword,
        reportCount: rows.length,
        latestDate: latest.date,
        latestPlatform: latest.platform,
        solv: latest.solv,
        arp: latest.arp,
        atrp: latest.atrp,
        foundIn: latest.foundIn,
        dataPoints: latest.dataPoints,
        gridSize: latest.gridSize,
        radius: latest.radius,
        avgSolv: averageBy(rows, 'solv'),
        bestSolv: round(Math.max(...rows.map((row) => row.solv))),
        worstSolv: round(Math.min(...rows.map((row) => row.solv))),
        platformCount: platforms.size,
        heat: heatFor(latest.solv),
        heatmap: latest.heatmap,
        publicUrl: latest.publicUrl
      };
    })
    .sort((a, b) => b.avgSolv - a.avgSolv);
}

// A gap is a keyword that is effectively invisible on a given platform. These are the
// combinations worth attacking with content, citations, and profile work.
function buildGaps(reports) {
  const grouped = groupBy(reports, (row) => `${row.keyword}||${row.platform}`);
  const gaps = [];
  for (const [key, rows] of grouped.entries()) {
    const [keyword, platform] = key.split('||');
    const latest = latestFirst(rows)[0];
    if (latest.solv >= 15) continue;
    gaps.push({
      keyword,
      platform,
      solv: latest.solv,
      arp: latest.arp,
      foundIn: latest.foundIn,
      dataPoints: latest.dataPoints,
      date: latest.date,
      publicUrl: latest.publicUrl,
      severity: latest.solv === 0 ? 'invisible' : 'weak'
    });
  }
  return gaps.sort((a, b) => a.solv - b.solv || a.keyword.localeCompare(b.keyword));
}

// Compare the oldest and newest scan for each keyword+platform pair so the trend is
// apples-to-apples. Mixing platforms in one trend line produces misleading swings.
function buildTrends(reports) {
  const grouped = groupBy(reports, (row) => `${row.keyword}||${row.platform}`);
  const trends = [];
  for (const [key, rows] of grouped.entries()) {
    if (rows.length < 2) continue;
    const [keyword, platform] = key.split('||');
    const ordered = [...rows].sort((a, b) => a.timestamp - b.timestamp);
    const first = ordered[0];
    const last = ordered[ordered.length - 1];
    trends.push({
      keyword,
      platform,
      scans: rows.length,
      fromDate: first.date,
      toDate: last.date,
      solvFrom: first.solv,
      solvTo: last.solv,
      solvDelta: round(last.solv - first.solv),
      arpFrom: first.arp,
      arpTo: last.arp,
      // ARP is a rank, so a decrease is an improvement.
      arpDelta: round(last.arp - first.arp),
      direction: last.solv > first.solv ? 'up' : last.solv < first.solv ? 'down' : 'flat'
    });
  }
  return trends.sort((a, b) => a.solvDelta - b.solvDelta);
}

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 503, { ok: false, error: 'LOCAL_FALCON_API_KEY is not configured.' });
    return;
  }

  const errors = [];
  let rawReports = [];
  try {
    const data = await callFalcon('reports', apiKey, { limit: REPORT_LIMIT });
    rawReports = Array.isArray(data.reports) ? data.reports : [];
  } catch (error) {
    sendJson(res, error.status === 401 ? 401 : 502, {
      ok: false,
      error: error.message,
      hint: error.status === 401
        ? 'Local Falcon rejected the key. Confirm LOCAL_FALCON_API_KEY has no trailing spaces and is still active.'
        : 'Local Falcon reports endpoint is unavailable.'
    });
    return;
  }

  // Locations and campaigns are secondary context. Some plans restrict them, so a
  // failure here must not take down the whole panel.
  const [locations, campaigns] = await Promise.all([
    callFalcon('locations', apiKey, {}).catch((error) => {
      errors.push(error.message);
      return {};
    }),
    callFalcon('campaigns', apiKey, {}).catch((error) => {
      errors.push(error.message);
      return {};
    })
  ]);

  const reports = rawReports.map(normalizeReport);
  const ordered = latestFirst(reports);
  const timestamps = reports.map((row) => row.timestamp).filter(Boolean);
  const byPlatform = buildByPlatform(reports);
  const byKeyword = buildByKeyword(reports);
  const gaps = buildGaps(reports);
  const latest = ordered[0] || null;

  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    source: 'local_falcon_api',
    errors,
    summary: {
      reportCount: reports.length,
      keywordCount: byKeyword.length,
      platformCount: byPlatform.length,
      avgSolv: averageBy(reports, 'solv'),
      avgArp: averageBy(reports, 'arp'),
      avgAtrp: averageBy(reports, 'atrp'),
      invisibleCount: gaps.filter((gap) => gap.severity === 'invisible').length,
      gapCount: gaps.length,
      lastScanned: latest ? latest.date : null,
      firstScanned: timestamps.length
        ? new Date(Math.min(...timestamps) * 1000).toISOString().slice(0, 10)
        : null,
      businessName: latest ? latest.locationName : null,
      rating: latest ? latest.rating : null,
      reviews: latest ? latest.reviews : null
    },
    byPlatform,
    byKeyword,
    gaps,
    trends: buildTrends(reports),
    recentScans: ordered.slice(0, 12),
    locations: (Array.isArray(locations.locations) ? locations.locations : []).map((location) => ({
      name: location.name || null,
      address: location.address || null,
      placeId: location.place_id || null,
      rating: location.rating ? round(location.rating, 1) : null,
      reviews: location.reviews == null ? null : num(location.reviews)
    })),
    // The campaigns endpoint returns its rows under `reports`, and counts arrive as
    // strings rather than arrays, so they are normalized to numbers here.
    campaigns: (Array.isArray(campaigns.reports) ? campaigns.reports : []).map((campaign) => ({
      name: campaign.name || null,
      campaignKey: campaign.report_key || null,
      keywordCount: num(campaign.keywords),
      locationCount: num(campaign.locations),
      scanCount: num(campaign.scans),
      gridSize: campaign.grid_size ? `${campaign.grid_size}x${campaign.grid_size}` : null,
      radius: campaign.radius ? `${campaign.radius} ${campaign.measurement || 'mi'}` : null,
      frequency: campaign.frequency || null,
      lastRun: campaign.last_run_date || null,
      nextRun: campaign.next_run_date || null,
      status: campaign.status || null,
      publicUrl: campaign.public_url || null
    }))
  });
};
