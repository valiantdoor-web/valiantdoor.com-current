const { buildAuditSnapshot, getCanonicalNap, getListingsRegistry } = require('../../lib/listings/data');
const { buildAllProviderPayloads } = require('../../lib/listings/provider-payloads');
const { buildDriftReport } = require('../../lib/listings/drift');
const { requireListingsAdmin, allowMethods } = require('../../lib/listings/security');

function send(res, statusCode, contentType, body, disposition) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  if (disposition) res.setHeader('Content-Disposition', disposition);
  res.end(body);
}

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function providerCsv() {
  const audit = buildAuditSnapshot();
  const rows = [['provider', 'managedBy', 'status', 'driftStatus', 'trackedFields', 'profileUrl']];
  (audit.providers || []).forEach((provider) => {
    rows.push([
      provider.name,
      provider.managedBy,
      provider.status,
      provider.driftStatus,
      (provider.fieldsTracked || []).join('|'),
      provider.profileUrl || ''
    ]);
  });
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

module.exports = async (req, res) => {
  if (!allowMethods(req, res, ['GET'])) return;
  if (!requireListingsAdmin(req, res)) return;

  const url = new URL(req.url, 'https://www.valiantdoor.com');
  const format = url.searchParams.get('format') || 'json';
  if (format === 'csv') {
    send(res, 200, 'text/csv; charset=utf-8', providerCsv(), 'attachment; filename="valiant-listings-providers.csv"');
    return;
  }

  const registry = getListingsRegistry();
  const providerIds = (registry.providers || []).map((provider) => provider.id);
  const payload = {
    ok: true,
    exportedAt: new Date().toISOString(),
    canonical: getCanonicalNap(),
    registry,
    audit: buildAuditSnapshot(),
    drift: buildDriftReport(),
    providerPayloads: buildAllProviderPayloads(providerIds)
  };
  send(res, 200, 'application/json; charset=utf-8', JSON.stringify(payload, null, 2), 'attachment; filename="valiant-listings-control-center.json"');
};
