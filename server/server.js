const crypto = require('crypto');
const http = require('http');
const https = require('https');

const INDEXNOW_API_URL = 'https://api.indexnow.org/IndexNow';

function sendJson(res, statusCode, payload) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function timingSafeEqualHex(a, b) {
  if (!a || !b) return false;
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyVercelSignature(rawBody, secret, signature) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(expected, signature);
}

function fetchText(url, redirectCount = 0) {
  const client = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(
      url,
      {
        headers: {
          'User-Agent': 'valiantdoor-indexnow-bot/1.0',
          Accept: 'text/plain, application/xml, text/xml;q=0.9, */*;q=0.8',
        },
      },
      (response) => {
        const { statusCode = 0, headers } = response;

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          headers.location &&
          redirectCount < 5
        ) {
          response.resume();
          const nextUrl = new URL(headers.location, url).toString();
          resolve(fetchText(nextUrl, redirectCount + 1));
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          let body = '';
          response.setEncoding('utf8');
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () => {
            reject(new Error(`GET ${url} failed with ${statusCode}: ${body.slice(0, 240)}`));
          });
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
      }
    );

    request.on('error', reject);
  });
}

function postJson(url, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const parsed = new URL(url);
  const client = parsed.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': body.length,
          'User-Agent': 'valiantdoor-indexnow-bot/1.0',
        },
      },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractUrlsFromSitemap(xml) {
  const urls = [];
  const seen = new Set();
  const matches = xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi);

  for (const match of matches) {
    const value = decodeXmlEntities(match[1].trim());
    if (!value || seen.has(value)) continue;
    seen.add(value);
    urls.push(value);
  }

  return urls;
}

async function submitIndexNow({ reason, deploymentId, deploymentTarget }) {
  const host = process.env.INDEXNOW_HOST;
  const key = process.env.INDEXNOW_KEY;
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION;
  const sitemapUrl = process.env.INDEXNOW_SITEMAP_URL || `https://${host}/sitemap.xml`;

  if (!host || !key || !keyLocation) {
    throw new Error('Missing IndexNow configuration environment variables.');
  }

  const sitemapXml = await fetchText(sitemapUrl);
  const urlList = extractUrlsFromSitemap(sitemapXml);

  if (!urlList.length) {
    throw new Error(`No URLs found in sitemap: ${sitemapUrl}`);
  }

  const response = await postJson(INDEXNOW_API_URL, {
    host,
    key,
    keyLocation,
    urlList,
  });

  if (![200, 202].includes(response.statusCode)) {
    throw new Error(
      `IndexNow submission failed with ${response.statusCode}: ${response.body.slice(0, 300)}`
    );
  }

  return {
    ok: true,
    reason,
    deploymentId: deploymentId || null,
    deploymentTarget: deploymentTarget || null,
    submittedCount: urlList.length,
    statusCode: response.statusCode,
    keyLocation,
    sampleUrls: urlList.slice(0, 5),
  };
}

async function handleIndexNowWebhook(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const webhookSecret = process.env.INDEXNOW_WEBHOOK_SECRET;
  if (!webhookSecret) {
    sendJson(res, 500, { error: 'Webhook secret is not configured' });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-vercel-signature'];

  if (!verifyVercelSignature(rawBody, webhookSecret, signature)) {
    sendJson(res, 401, { error: 'Invalid webhook signature' });
    return;
  }

  let payload;
  try {
    payload = rawBody.length ? JSON.parse(rawBody.toString('utf8')) : {};
  } catch (error) {
    sendJson(res, 400, { error: 'Invalid JSON payload' });
    return;
  }

  const event = String(req.headers['x-vercel-event'] || payload.type || '').trim();
  const data = payload.payload || payload;
  const projectId = data.projectId || data.project?.id || null;
  const target = data.target || data.meta?.target || null;
  const deploymentId = data.id || data.deploymentId || null;
  const expectedProjectId = process.env.INDEXNOW_PROJECT_ID || null;

  if (event && event !== 'deployment.succeeded') {
    sendJson(res, 202, { ignored: true, reason: `Ignored event ${event}` });
    return;
  }

  if (expectedProjectId && projectId && expectedProjectId !== projectId) {
    sendJson(res, 202, {
      ignored: true,
      reason: 'Ignored different project',
      projectId,
    });
    return;
  }

  if (target && target !== 'production') {
    sendJson(res, 202, {
      ignored: true,
      reason: 'Ignored non-production deployment',
      target,
    });
    return;
  }

  try {
    const result = await submitIndexNow({
      reason: 'deployment.succeeded webhook',
      deploymentId,
      deploymentTarget: target,
    });
    sendJson(res, 202, result);
  } catch (error) {
    sendJson(res, 500, {
      error: 'IndexNow auto-submit failed',
      detail: error.message,
    });
  }
}

module.exports = async (req, res) => {
  const url = new URL(req.url, 'https://www.valiantdoor.com');
  const path = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (path === '/api/indexnow-webhook') {
    await handleIndexNowWebhook(req, res);
    return;
  }

  if (path === '/api/reviews') {
    sendJson(res, 200, { reviews: [] });
    return;
  }

  if (path === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
};
