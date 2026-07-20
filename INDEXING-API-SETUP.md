# Google Indexing API — Setup Guide

Submit `valiantdoor.com` URLs to Google for instant re-crawling using
`index-site.js`.

> **Heads-up on scope:** Google officially supports the Indexing API for pages
> with `JobPosting` or `BroadcastEvent` (livestream) structured data. It often
> works for other pages, but is not guaranteed. Keep your XML sitemaps as the
> primary indexing signal — treat this script as a supplementary "nudge" after
> meaningful content updates.

---

## 1. Prerequisites (Google Cloud Console)

1. Create (or reuse) a Google Cloud project — you already have
   `valiant-door-indexing`.
2. **APIs & Services → Library →** enable the **Indexing API**.
3. **APIs & Services → Credentials → Create credentials → Service account.**
   - You already created `valiant-site-indexer@valiant-door-indexing.iam.gserviceaccount.com`.
4. On that service account, **Keys → Add key → Create new key → JSON**, and
   download it.

## 2. Grant the service account access in Search Console

This is the step everyone forgets — without it, every request returns
**403 Permission denied**.

1. Open [Google Search Console](https://search.google.com/search-console) for
   the `valiantdoor.com` property.
2. **Settings → Users and permissions → Add user.**
3. Add the service-account email
   `valiant-site-indexer@valiant-door-indexing.iam.gserviceaccount.com`
   as an **Owner** (Owner is required by the Indexing API, not just Full).

## 3. Place the credentials locally (never commit them)

1. Rename the downloaded key to **`service-account.json`** and put it in the
   project root (next to `index-site.js`).
2. It is already listed in `.gitignore`, so git will not track it. **Confirm:**
   ```bash
   git check-ignore service-account.json   # should print: service-account.json
   ```
3. Alternatively, for CI/servers, skip the file and set an env var instead:
   ```bash
   export GOOGLE_INDEXING_KEY="$(cat service-account.json)"
   ```

> **Security:** If a key is ever pasted into chat, email, or a commit, treat it
> as compromised — revoke it in **Cloud Console → IAM → Service Accounts →
> Keys** and generate a fresh one.

## 4. Install & run

```bash
npm install googleapis      # already added to package.json
node index-site.js          # or: npm run index:site
```

### Expected output

```
[index] Authenticating as valiant-site-indexer@valiant-door-indexing.iam.gserviceaccount.com
[index] OK      https://www.valiantdoor.com/  (URL_UPDATED @ 2026-07-19T...Z)
[index] OK      https://www.valiantdoor.com/mastertech  (URL_UPDATED @ ...)
[index] OK      https://www.valiantdoor.com/garage-door-repair  (URL_UPDATED @ ...)
[index] OK      https://www.valiantdoor.com/short-repair-videos  (URL_UPDATED @ ...)

[index] Done. 4 succeeded, 0 failed, 4 total.
```

## 5. Editing the URL list

Open `index-site.js` and edit the `URLS` array. Use `URL_UPDATED` for
new/changed pages; switch `ENDPOINT_TYPE` to `URL_DELETED` only to notify
Google of removed pages.

> **Do NOT add retired pages** (e.g. `/amazon-alexa`, `/authority-dashboard`,
> `/search-atlas-growth`) — they return 410 by design and must never be
> submitted for indexing.

## Quotas & troubleshooting

| Symptom | Cause / Fix |
| --- | --- |
| `403 Permission denied` | Service account not added as **Owner** in Search Console (Step 2), or Indexing API not enabled. |
| `429 Too many requests` | Default quota is **200 URLs/day**, 600 requests/min. Wait and retry. |
| `400 ... invalid` | URL not in the verified property, or malformed. Must be `https://www.valiantdoor.com/...`. |
| `Invalid JWT / invalid_grant` | Bad or rotated key. Download a fresh JSON key. |
