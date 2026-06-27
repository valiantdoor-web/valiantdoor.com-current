const fs = require('fs');
const path = require('path');
const { sendJson, allowMethods } = require('../lib/listings/security');

const ROOT = path.resolve(__dirname, '..');
const SEARCH_ATLAS_DIR = path.join(ROOT, 'data', 'searchatlas', 'valiantdoor.com');
const QUERY_RESPONSES_DIR = path.join(SEARCH_ATLAS_DIR, 'query-responses');

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return fallback;
  }
}

function toSummary(value) {
  if (!value) return null;
  return {
    ...value,
    brand_topics_count: Number(value.brand_topics_count || 0),
    total_topics_count: Number(value.total_topics_count || 0),
    sentiment_percentage: Number(value.sentiment_percentage || 0)
  };
}

function loadQueryResponses(visibilityById) {
  const results = [];
  if (!fs.existsSync(QUERY_RESPONSES_DIR)) return results;

  for (const file of fs.readdirSync(QUERY_RESPONSES_DIR)) {
    if (!file.endsWith('.json')) continue;
    const payload = readJsonSafe(path.join(QUERY_RESPONSES_DIR, file), null);
    if (!payload) continue;
    const platform = file.split('-')[0];
    const visibility = visibilityById.get(payload.id) || null;
    results.push({
      file,
      platform,
      id: payload.id || null,
      query: visibility ? visibility.query : null,
      query_id: visibility ? visibility.query_id : null,
      topic: visibility ? visibility.topic : null,
      snapshot_date: payload.snapshot_date || null,
      target_brand_domain: payload.target_brand_domain || null,
      top_competitors: Array.isArray(payload.top_competitors) ? payload.top_competitors : [],
      body: payload.body || ''
    });
  }

  const extra = readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'query-response-openai-emergency.json'), null);
  if (extra) {
    results.push({
      file: 'query-response-openai-emergency.json',
      platform: 'openai',
      id: extra.id || null,
      query: null,
      query_id: null,
      topic: null,
      snapshot_date: extra.snapshot_date || null,
      target_brand_domain: extra.target_brand_domain || null,
      top_competitors: Array.isArray(extra.top_competitors) ? extra.top_competitors : [],
      body: extra.body || ''
    });
  }

  return results;
}

function buildHeatMap(visibility, overview) {
  const rows = Array.isArray(visibility) ? visibility : [];
  const platforms = Array.isArray(overview?.platforms) ? overview.platforms.map(toSummary) : [];

  return {
    byPlatform: platforms.map((platform) => ({
      platform: platform.platform,
      coverage: platform.total_topics_count ? Math.round((platform.brand_topics_count / platform.total_topics_count) * 1000) / 10 : 0,
      brand_topics_count: platform.brand_topics_count,
      total_topics_count: platform.total_topics_count,
      sentiment_percentage: platform.sentiment_percentage
    })),
    byQuery: rows.map((row) => ({
      topic: row.topic,
      query: row.query,
      query_id: row.query_id,
      visibility_score: Number(row.visibility_score || 0),
      brand_rank: row.brand_rank == null ? null : Number(row.brand_rank),
      heat: Number(row.visibility_score || 0) >= 60 ? 'hot' : Number(row.visibility_score || 0) >= 20 ? 'warm' : 'cold'
    }))
  };
}

function buildCompetitorLeaderboard(queryResponses) {
  const counts = new Map();
  for (const row of queryResponses) {
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
  const ranked = rows.filter((row) => Number.isFinite(Number(row.brand_rank)));
  const grouped = new Map();
  for (const row of ranked) {
    const topic = row.topic || 'Unknown';
    const item = grouped.get(topic) || { topic, count: 0, totalRank: 0, bestRank: Infinity, worstRank: 0 };
    const rank = Number(row.brand_rank);
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

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;

  const overview = readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'llm-overview.json'), null);
  const visibility = readJsonSafe(path.join(SEARCH_ATLAS_DIR, 'llm-visibility.json'), []);
  const visibilityById = new Map((Array.isArray(visibility) ? visibility : []).map((row) => [row.query_id, row]));
  const queryResponses = loadQueryResponses(visibilityById);
  const visibleRows = (Array.isArray(visibility) ? visibility : []).filter((row) => Number(row.visibility_score || 0) > 0);
  const zeroVisibilityRows = (Array.isArray(visibility) ? visibility : []).filter((row) => Number(row.visibility_score || 0) === 0);
  const averageVisibility = Array.isArray(visibility) && visibility.length
    ? visibility.reduce((sum, row) => sum + Number(row.visibility_score || 0), 0) / visibility.length
    : 0;

  const platformSummaries = Array.isArray(overview?.platforms) ? overview.platforms.map(toSummary) : [];
  const heatMap = buildHeatMap(visibility, overview);
  const competitorLeaderboard = buildCompetitorLeaderboard(queryResponses);
  const localRankings = buildLocalRankings(visibility);

  sendJson(res, 200, {
    ok: true,
    generatedAt: new Date().toISOString(),
    domain: 'valiantdoor.com',
    source: 'cached_searchatlas_snapshot',
    overview: overview,
    visibility: visibility,
    queryResponses,
    summary: {
      platformCount: platformSummaries.length,
      queryCount: Array.isArray(visibility) ? visibility.length : 0,
      queryResponseCount: queryResponses.length,
      visibleQueryCount: visibleRows.length,
      zeroVisibilityCount: zeroVisibilityRows.length,
      averageVisibility: Math.round(averageVisibility * 10) / 10,
      topicCoveragePercent: platformSummaries.length
        ? Math.round((platformSummaries.reduce((sum, p) => sum + (p.total_topics_count ? p.brand_topics_count / p.total_topics_count : 0), 0) / platformSummaries.length) * 1000) / 10
        : 0
    },
    heatMap,
    competitorLeaderboard,
    localRankings,
    zeroVisibilityGaps: zeroVisibilityRows.map((row) => ({
      topic: row.topic,
      query: row.query,
      query_id: row.query_id,
      visibility_score: Number(row.visibility_score || 0),
      citation_share_of_voice: row.citation_share_of_voice ?? 0,
      nextAction: 'Use this gap for content, internal links, and proof pages.'
    }))
  });
};
