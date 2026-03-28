# Brand presence audit — March 23, 2026

## Canonical public brand
- Business name: **Valiant Garage Door**
- Website: **https://www.valiantdoor.com/**
- Primary phone: **(925) 409-4974**
- Do not use in customer-facing branding: **Valiant Garage Door LLC**

## Public pages verified headlessly
### Clean / aligned
- Website homepage: `https://www.valiantdoor.com/`
  - shows **Valiant Garage Door**
  - shows **(925) 409-4974**
- Yelp profile URL: `https://www.yelp.com/biz/valiant-garage-door-pleasanton`
  - URL slug is aligned with the canonical brand

### Mismatches found
- TikTok profile: `https://www.tiktok.com/@valiantdoor`
  - public title observed headlessly: **Valiant Garage Door LLC (@valiantdoor) | TikTok**
  - target display name: **Valiant Garage Door**
- Nextdoor page: `https://nextdoor.com/pages/valiant-garage-door-san-leandro-ca`
  - public title observed headlessly: **Valiant Garage Door LLC - Nextdoor**
  - page slug also uses **san-leandro-ca**, which does not match the primary Pleasanton/Tri-Valley positioning
  - target display name: **Valiant Garage Door**

## Authenticated edit blockers found in headless mode
- Google Business Profile dashboard redirected to Google sign-in
- Housecall Pro redirected to sign-in
- Yelp Biz redirected to sign-in
- Thumbtack business-info edit page returned account authorization error

## Website actions completed in this repo
- Removed TikTok profile links from site navigation until the profile display name is corrected
- Removed TikTok from the quote page `sameAs` structured data
- Added Yelp as a `sameAs` reference on the homepage structured data

## Next manual fixes once logged in
1. TikTok display name → **Valiant Garage Door**
2. Nextdoor business name → **Valiant Garage Door**
3. Nextdoor service area/location branding → Pleasanton / Tri-Valley aligned
4. Thumbtack business name → **Valiant Garage Door**
5. Google Business Profile public name stays **Valiant Garage Door**
6. Housecall Pro customer-facing brand name stays **Valiant Garage Door**
