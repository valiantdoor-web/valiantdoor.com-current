# Google Search Console API — Setup Guide

`index-site.js` now uses Google's supported Search Console APIs for an ordinary
service-business website. It submits the canonical sitemap and reads URL
Inspection status for canonical pages.

Google's separate **Indexing API is not used**. Google supports that API only
for pages containing `JobPosting` or livestream `BroadcastEvent` structured
data. Search Console URL Inspection reports index status; it does not provide a
programmatic “request indexing” action.

## 1. Enable the supported APIs

In the existing Google Cloud project:

1. Enable **Google Search Console API**.
2. Use the existing service-account JSON key, or create a new JSON key.
3. Never commit the JSON key or paste it into chat.

## 2. Add the service account to Search Console

1. Open Search Console and select the domain property `valiantdoor.com`.
2. Go to **Settings → Users and permissions → Add user**.
3. Add the service-account email with **Full** permission.

The script addresses the property as `sc-domain:valiantdoor.com`, so the
service account must have access to that exact domain property.

## 3. Local credentials

Place the JSON at `service-account.json` in the project root. The filename is
already git-ignored. Alternatively:

```bash
export GOOGLE_SEARCH_CONSOLE_KEY="$(cat service-account.json)"
```

`INDEXING_KEY` is accepted only as a temporary backwards-compatible variable
name so the existing GitHub secret can keep working during migration.

## 4. Run and verify

```bash
npm run search-console:dry-run  # local preview; no credentials or API calls
npm run index:site              # submit sitemap and inspect all canonical URLs
```

Changed-page mode validates every requested URL against the local page and blog
sitemaps before inspection:

```bash
INDEX_MODE=changed \
INDEX_URLS=$'https://www.valiantdoor.com/quote\nhttps://www.valiantdoor.com/faq' \
npm run index:site
```

Every live API run submits:

- property: `sc-domain:valiantdoor.com`
- sitemap: `https://www.valiantdoor.com/sitemap.xml`

It then inspects either all canonical URLs (manual/full mode) or only changed
canonical URLs (push/changed mode). Retired 410 URLs remain excluded.

## 5. GitHub Actions

`.github/workflows/index-site.yml` runs on pushes to `main` and manually.

Create the repository Actions secret `GOOGLE_SEARCH_CONSOLE_KEY` containing the
raw service-account JSON. The old `INDEXING_KEY` secret remains a temporary
fallback and can be removed after the new secret is confirmed.

The workflow never commits the credential. It exposes the selected key only to
the API step as an environment variable.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `403` | Service account lacks access to the exact `sc-domain:valiantdoor.com` property, or the Search Console API is not enabled. |
| `invalid_grant` | The JSON key is invalid, disabled, or rotated. Replace it with a current service-account key. |
| Sitemap submission succeeds but a URL is not indexed | Inspection is reporting Google's state; it cannot force indexing. Confirm the URL is canonical, crawlable, internally linked, and present in the sitemap. |
| URL is skipped locally | It is not an exact canonical entry in `public/sitemap-pages.xml` or `public/sitemap-blog.xml`. |
