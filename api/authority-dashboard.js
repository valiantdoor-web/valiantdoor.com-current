const fs = require('fs');
const path = require('path');
const { sendJson, requireListingsAdmin, allowMethods } = require('../lib/listings/security');

const ROOT = path.resolve(__dirname, '..');
const SEARCH_ATLAS_DIR = path.join(ROOT, 'data', 'searchatlas', 'valiantdoor.com');
const AUTHORITY_DIR = path.join(ROOT, 'data', 'authority');
const DOMAIN = 'https://www.valiantdoor.com';

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function getSiteAuditSnapshot() {
  return readJsonSafe(path.join(AUTHORITY_DIR, 'site-audit-snapshot.json'), {
    scannedAt: null,
    pageCount: 0,
    issueTotals: {},
    issueTotal: 0,
    topIssuePages: [],
    pages: []
  });
}

function getSearchAtlasSnapshot() {
  return readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'full-snapshot.json'), null);
}

function loadQueryResponsesFromDisk() {
  const dir = path.join(SEARCH_ATLAS_DIR, 'query-responses');
  const rows = [];
  if (!fs.existsSync(dir)) return rows;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const payload = readJsonSafe(path.join(dir, file), null);
    if (!payload) continue;
    rows.push({
      file,
      id: payload.id || null,
      body: payload.body || '',
      top_competitors: Array.isArray(payload.top_competitors) ? payload.top_competitors : []
    });
  }
  return rows;
}

function buildCompetitorLeaderboard(queryResponses) {
  const counts = new Map();
  for (const row of Array.isArray(queryResponses) ? queryResponses : []) {
    for (const competitor of row.top_competitors || []) {
      const domain = String(competitor || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].toLowerCase();
      if (!domain || domain.includes('valiantdoor.com')) continue;
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([domain, mentions]) => ({ domain, mentions }));
}

function buildLocalRankings(visibility) {
  const rows = Array.isArray(visibility) ? visibility : [];
  const grouped = new Map();
  for (const row of rows) {
    const rank = Number(row.brand_rank);
    if (!Number.isFinite(rank)) continue;
    const topic = row.topic || 'Unknown';
    const item = grouped.get(topic) || { topic, count: 0, totalRank: 0, bestRank: Infinity, worstRank: 0 };
    item.count += 1;
    item.totalRank += rank;
    item.bestRank = Math.min(item.bestRank, rank);
    item.worstRank = Math.max(item.worstRank, rank);
    grouped.set(topic, item);
  }
  return [...grouped.values()].map((item) => ({
    topic: item.topic,
    average_rank: Math.round((item.totalRank / item.count) * 10) / 10,
    best_rank: item.bestRank === Infinity ? null : item.bestRank,
    worst_rank: item.worstRank || null,
    query_count: item.count
  }));
}

function buildHeatMap(overview, visibility) {
  const platforms = Array.isArray(overview?.overview?.platforms)
    ? overview.overview.platforms
    : Array.isArray(overview?.platforms)
      ? overview.platforms
      : [];
  const rows = Array.isArray(visibility)
    ? visibility
    : Array.isArray(overview?.visibility)
      ? overview.visibility
      : [];

  return {
    byPlatform: platforms.map((platform) => ({
      platform: platform.platform,
      brand_topics_count: Number(platform.brand_topics_count || 0),
      total_topics_count: Number(platform.total_topics_count || 0),
      sentiment_percentage: Number(platform.sentiment_percentage || 0),
      coverage: Number(platform.total_topics_count || 0) ? Math.round((Number(platform.brand_topics_count || 0) / Number(platform.total_topics_count || 1)) * 1000) / 10 : 0
    })),
    byQuery: rows.map((row) => {
      const visibilityScore = Number(row.visibility_score || 0);
      return {
        topic: row.topic,
        query: row.query,
        query_id: row.query_id,
        visibility_score: visibilityScore,
        brand_rank: row.brand_rank == null ? null : Number(row.brand_rank),
        heat: visibilityScore >= 60 ? 'hot' : visibilityScore >= 20 ? 'warm' : 'cold'
      };
    })
  };
}

async function fetchSearchAtlas(kind, params) {
  const key = process.env.SEARCHATLAS_API_KEY;
  if (!key) return null;
  const endpoints = {
    overview: 'https://llmvis.searchatlas.com/api/v1/se/llm-visibility-overview/',
    visibility: 'https://llmvis.searchatlas.com/api/v1/se/llm-visibility/'
  };
  const url = new URL(endpoints[kind]);
  Object.entries(params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const response = await fetch(url, { headers: { 'Accept': 'application/json', 'X-API-Key': key, 'User-Agent': 'ValiantAuthorityDashboard/1.0' } });
  if (!response.ok) throw new Error(`Search Atlas ${kind} failed: ${response.status}`);
  return response.json();
}

async function getSearchAtlas() {
  let source = 'cached';
  let overview = readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'llm-overview.json'), null);
  let visibility = readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'llm-visibility.json'), []);
  const fullSnapshot = getSearchAtlasSnapshot();
  const queryResponses = loadQueryResponsesFromDisk();
  const errors = [];
  try {
    const [liveOverview, liveVisibility] = await Promise.all([
      fetchSearchAtlas('overview', { domain: 'valiantdoor.com' }),
      fetchSearchAtlas('visibility', { domain: 'valiantdoor.com' })
    ]);
    if (liveOverview) overview = liveOverview;
    if (liveVisibility) visibility = liveVisibility;
    source = 'live_api';
  } catch (error) {
    errors.push(error.message);
  }

  const rows = Array.isArray(visibility) ? visibility : [];
  const visibleRows = rows.filter((row) => Number(row.visibility_score || 0) > 0);
  const averageVisibility = rows.length ? rows.reduce((sum, row) => sum + Number(row.visibility_score || 0), 0) / rows.length : 0;
  const zeroVisibility = rows.filter((row) => Number(row.visibility_score || 0) === 0);
  const platforms = overview && Array.isArray(overview.platforms) ? overview.platforms : [];
  const topicCoverage = platforms.length ? platforms.reduce((sum, p) => sum + Number(p.brand_topics_count || 0), 0) / platforms.reduce((sum, p) => sum + Number(p.total_topics_count || 0), 0) : 0;
  return {
    source,
    errors,
    overview,
    rows,
    fullSnapshot,
    heatMap: buildHeatMap({ overview, visibility }, rows),
    competitorLeaderboard: buildCompetitorLeaderboard(queryResponses),
    localRankings: buildLocalRankings(rows),
    summary: {
      queryCount: rows.length,
      visibleQueryCount: visibleRows.length,
      zeroVisibilityCount: zeroVisibility.length,
      averageVisibility: Math.round(averageVisibility * 10) / 10,
      topicCoveragePercent: Math.round(topicCoverage * 1000) / 10
    },
    priorityGaps: zeroVisibility.map((row) => ({ topic: row.topic, query: row.query, queryId: row.query_id, visibility: row.visibility_score, citationShareOfVoice: row.citation_share_of_voice }))
  };
}

function getCompetitors() {
  const dir = path.join(SEARCH_ATLAS_DIR, 'query-responses');
  const counts = new Map();
  if (!fs.existsSync(dir)) return [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const payload = readJsonSafe(path.join(dir, file), {});
    const body = String(payload.body || '');
    const matches = body.matchAll(/https?:\/\/([^\/\)\]\s]+)/gi);
    for (const match of matches) {
      const domain = match[1].replace(/^www\./, '').toLowerCase();
      if (!domain || domain.includes('valiantdoor.com')) continue;
      counts.set(domain, (counts.get(domain) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([domain, mentions]) => ({ domain, mentions }));
}

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const audit = getSiteAuditSnapshot();
  const searchAtlas = await getSearchAtlas();
  const authorityPlan = readJsonSafe(path.join(AUTHORITY_DIR, 'pr-backlink-targets.json'), {});
  const competitors = getCompetitors();
  const issueTotal = Number(audit.issueTotal || Object.entries(audit.issueTotals || {}).filter(([key]) => key !== 'nonOptimizedImages').reduce((sum, [, value]) => sum + Number(value || 0), 0));
  const authorityScore = process.env.SEARCHATLAS_AUTHORITY_SCORE ? Number(process.env.SEARCHATLAS_AUTHORITY_SCORE) : null;

  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    domain: 'valiantdoor.com',
    authority: {
      currentScore: Number.isFinite(authorityScore) ? authorityScore : null,
      targetScore: authorityPlan.targetAuthorityScore || 60,
      status: Number.isFinite(authorityScore) ? 'connected' : 'target_set_metric_not_connected',
      note: Number.isFinite(authorityScore) ? 'Authority score loaded from env.' : 'Search Atlas LLM data is connected. Backlink/domain authority metric endpoint is not connected yet, so this dashboard tracks the 60 target and execution plan without pretending the current score is known.'
    },
    searchAtlas,
    competitors,
    siteAudit: {
      scannedAt: audit.scannedAt,
      pageCount: audit.pageCount,
      issueTotals: audit.issueTotals,
      issueTotal,
      optimizationOpportunityTotal: Number(audit.optimizationOpportunityTotal || (audit.issueTotals || {}).nonOptimizedImages || 0),
      topIssuePages: audit.topIssuePages
    },
    backlinkPlan: authorityPlan
  });
};
