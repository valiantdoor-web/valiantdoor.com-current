# Thumbtack OAuth Integration — Setup

This integration adds a secure server-side Thumbtack OAuth flow to the site.

## Endpoints

| Path | Method | Purpose |
| --- | --- | --- |
| `/api/auth/thumbtack/start` | GET | Generates a CSRF `state`, sets a secure cookie, redirects to Thumbtack's authorize URL. |
| `/api/auth/thumbtack/callback` | GET | Validates `state`, exchanges `code` for tokens, stores them encrypted, redirects to settings. |
| `/api/auth/thumbtack/status` | GET | Returns non-sensitive connection status (never tokens). |
| `/api/auth/thumbtack/disconnect` | POST | Deletes the stored encrypted tokens. |
| `/settings/integrations/thumbtack` | — | Settings UI (Connect / Connected / Disconnect). |

Production callback URL:

```
https://www.valiantdoor.com/api/auth/thumbtack/callback
```

## Environment variables to add in Vercel

Add these under **Vercel → Project → Settings → Environment Variables**
(Production, and Preview if you want to test on previews). In v0 you can also
add them under **Vars** in the top-right settings menu.

| Variable | Example / Value | Notes |
| --- | --- | --- |
| `THUMBTACK_CLIENT_ID` | `<your-thumbtack-client-id>` | From your Thumbtack developer/partner account. |
| `THUMBTACK_CLIENT_SECRET` | `<your-thumbtack-client-secret>` | **Secret.** Server-side only. |
| `THUMBTACK_REDIRECT_URI` | `https://www.valiantdoor.com/api/auth/thumbtack/callback` | Must match the callback exactly. |
| `THUMBTACK_OAUTH_AUTHORIZE_URL` | `<<INSERT OFFICIAL THUMBTACK AUTHORIZE URL>>` | **Placeholder — do not guess.** Get the real URL from Thumbtack's official OAuth docs. |
| `THUMBTACK_OAUTH_TOKEN_URL` | `<<INSERT OFFICIAL THUMBTACK TOKEN URL>>` | **Placeholder — do not guess.** Get the real URL from Thumbtack's official OAuth docs. |
| `THUMBTACK_TOKEN_ENC_KEY` | 32-byte key, hex or base64 | Encrypts tokens at rest. Generate with the command below. |

### Generate the encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example (generate your own — do not reuse this one):

```
729f9dc9045a7258519fee834d76195fb9a36a2ebecaee366c8cdd74d36e5989
```

## Important notes

- **Do not invent the Thumbtack authorize/token URLs.** `THUMBTACK_OAUTH_AUTHORIZE_URL`
  and `THUMBTACK_OAUTH_TOKEN_URL` are intentionally left as placeholders. Fill them
  in with the official URLs from Thumbtack's OAuth documentation once you have
  partner/API access. Until they are set, `/start` will bounce back to the
  settings page with `reason=not_configured`.
- The token exchange in `lib/thumbtack.js` uses the standard OAuth 2.0
  `authorization_code` grant with an `application/x-www-form-urlencoded` body. If
  Thumbtack requires HTTP Basic client authentication or different parameter
  names, adjust `exchangeCodeForTokens()` accordingly.
- Tokens are AES-256-GCM encrypted before being written to the private Vercel
  Blob store (`integrations/thumbtack/tokens.enc`). The client secret and tokens
  are never returned to the browser, written to URLs, or logged.
- Blob storage requires `BLOB_READ_WRITE_TOKEN` (already present via the
  project's Blob integration).

## Local / manual test

1. Set the env vars above.
2. Visit `/settings/integrations/thumbtack` and click **Connect Thumbtack**.
3. Approve on Thumbtack; you'll be redirected back to the callback, then to
   `/settings/integrations/thumbtack?connected=true`.
