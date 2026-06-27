# Valiant Listings Control Center

Private NAP/listings tracker for Valiant Garage Door.

## Local dashboard

Open `/listings-admin/` and paste `LISTINGS_ADMIN_TOKEN`.


## Phone app / PWA install

The private listings dashboard is now an installable phone app at `/listings-admin/`.

- iPhone: open `https://www.valiantdoor.com/listings-admin/` in Safari, tap Share, then Add to Home Screen.
- Android: open the same URL in Chrome and use Install App when prompted.
- The app shell caches only static app assets. `/api/listings/*` calls remain network-only and still require `LISTINGS_ADMIN_TOKEN`.
- Use `Use This Session` for temporary phone access or `Save In Browser` only on a trusted device.

App files:

- `public/listings-admin/manifest.webmanifest`
- `public/listings-admin-sw.js`
- `public/assets/listings-app/valiant-listings-icon-192.png`
- `public/assets/listings-app/valiant-listings-icon-512.png`

## Private API endpoints

All endpoints require `Authorization: Bearer $LISTINGS_ADMIN_TOKEN`.

- `GET /api/listings/status` — canonical NAP, provider registry, credential readiness, sync-client readiness, and drift summary.
- `GET /api/listings/audit` — NAP/listings audit snapshot plus drift report.
- `GET /api/listings/credentials` — provider-by-provider API readiness without exposing secret values.
- `GET /api/listings/drift` — API/manual drift readiness report.
- `GET /api/listings/payloads` — Apple, Google, Bing, Yelp, and Yext payload previews.
- `GET /api/listings/payloads?provider=bing-places` — one provider payload preview.
- `POST /api/listings/sync` — dry-run by default. Use `{ "provider": "all", "commit": false }` or one provider ID.
- `GET /api/listings/export?format=json` — full control-center export.
- `GET /api/listings/export?format=csv` — provider summary CSV export.
- `GET /api/listings/apple-payload` — legacy Apple Business Connect payload preview.
- `POST /api/listings/apple-sync` — legacy Apple dry-run; production submit only when `APPLE_BUSINESS_DRY_RUN=false` and body is `{ "commit": true }`.

## Current tracked providers

- Apple Business Connect — API-managed, dry-run ready, live write requires approved Apple Business Connect API credentials.
- Google Business Profile — credential framework and payload ready, live write requires Google Business Profile OAuth credentials and location IDs.
- Bing Places — API-managed, dry-run ready, live write requires Bing Places API access or Yext fallback credentials.
- Yelp — read/check framework and payload ready, publishing remains limited by Yelp API capabilities.
- Yext — publisher framework and payload ready for organization/brand entity consistency.

## Required environment variables

Required for the private dashboard/API:

```env
LISTINGS_ADMIN_TOKEN=change-me
```

Apple Business Connect API values:

```env
APPLE_BUSINESS_API_BASE_URL=https://businessconnect.apple.com/api
APPLE_BUSINESS_PRIVATE_KEY_PATH=/Users/vm/.config/valiantdoor/apple-business/Valiant_API_Apple.pem
APPLE_BUSINESS_PRIVATE_KEY=
APPLE_BUSINESS_KEY_ID=
APPLE_BUSINESS_ISSUER_ID=
APPLE_BUSINESS_TEAM_ID=
APPLE_BUSINESS_CLIENT_ID=
APPLE_BUSINESS_CLIENT_SECRET=
APPLE_BUSINESS_TOKEN_URL=
APPLE_BUSINESS_TOKEN_AUDIENCE=businessconnect.apple.com
APPLE_BUSINESS_LOCATION_ID=
APPLE_BUSINESS_BRAND_ID=
APPLE_BUSINESS_LOCATION_GET_PATH=
APPLE_BUSINESS_LOCATION_UPDATE_PATH=
APPLE_BUSINESS_UPDATE_METHOD=PATCH
APPLE_BUSINESS_DRY_RUN=true
```

Google Business Profile values:

```env
GOOGLE_BUSINESS_API_BASE_URL=https://mybusinessbusinessinformation.googleapis.com/v1/
GOOGLE_BUSINESS_ACCESS_TOKEN=
GOOGLE_BUSINESS_CLIENT_ID=
GOOGLE_BUSINESS_CLIENT_SECRET=
GOOGLE_BUSINESS_REFRESH_TOKEN=
GOOGLE_BUSINESS_ACCOUNT_ID=
GOOGLE_BUSINESS_LOCATION_ID=
GOOGLE_BUSINESS_LOCATION_UPDATE_PATH=
GOOGLE_BUSINESS_UPDATE_METHOD=PATCH
GOOGLE_MAPS_PLACE_ID=
```

Bing Places values:

```env
BING_PLACES_API_BASE_URL=
BING_PLACES_API_KEY=
BING_PLACES_ACCESS_TOKEN=
BING_PLACES_ACCOUNT_ID=
BING_PLACES_BUSINESS_ID=
BING_PLACES_LOCATION_ID=
BING_PLACES_UPDATE_PATH=
BING_PLACES_UPDATE_METHOD=PATCH
```

Yelp values:

```env
YELP_API_BASE_URL=https://api.yelp.com/v3/
YELP_API_KEY=
YELP_BUSINESS_ID=
YELP_BUSINESS_UPDATE_PATH=
YELP_UPDATE_METHOD=PATCH
```

Yext values:

```env
YEXT_API_BASE_URL=https://api.yextapis.com/v2/
YEXT_API_KEY=
YEXT_OAUTH_TOKEN=
YEXT_ACCOUNT_ID=
YEXT_ORGANIZATION_ENTITY_ID=1475786971410026793
YEXT_BRAND_ENTITY_ID=2444398385712081416
YEXT_ENTITY_UPDATE_PATH=
YEXT_UPDATE_METHOD=PATCH
```

## Bing Places tracked values

- Business ID: `796146`
- Status: tracked for dry-run/readiness; live API write still requires Bing Places auth or Yext fallback credentials.

## Yext tracked entities

- Organization entity ID: `1475786971410026793`
- Brand entity ID: `2444398385712081416`
- Organization record link: `https://www.yext.com/s/4677669/entity/edit3?entityIds=2056457832`
- Social profiles tracked: X, Facebook, Instagram, LinkedIn, Pinterest, TikTok, YouTube.

## Canonical files

- `data/listings/canonical-nap.json`
- `data/listings/listings-registry.json`
- `data/listings/apple-location-payload.json`

## Safety behavior

The dashboard only exposes dry-run buttons. Live write calls require a direct API update path, credentials, and a manual API request with `commit: true`.

## Real native iPhone app

A native SwiftUI iOS app project now lives at:

```text
apps/valiant-listings-ios/ValiantListings.xcodeproj
```

The native app opens the private listings control center inside a `WKWebView` and keeps the admin token out of source code. It loads:

```text
https://www.valiantdoor.com/listings-admin
```

Validation command:

```bash
python3 scripts/validate_ios_listings_app.py
```

Build/install requirements:

1. Install full Xcode.
2. Select it with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
3. Open `apps/valiant-listings-ios/ValiantListings.xcodeproj`.
4. Select the `ValiantListings` scheme.
5. Set your Apple Team under Signing & Capabilities for a physical iPhone.
6. Run on Simulator or your connected iPhone.

Current machine blocker: this Mac is using Command Line Tools only, so simulator builds fail until full Xcode is installed/selected.

