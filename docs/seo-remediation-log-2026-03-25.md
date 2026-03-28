# SEO remediation log — 2026-03-25

## Scope
This pass addresses the SEMrush-style issues already identified for `valiantdoor.com`:

- duplicate `<title>` tags
- structured data fields/types that can trigger Google guideline warnings
- unminified local CSS and JavaScript assets
- pages missing an `<h1>`
- thin/local-intent content on high-value service pages
- homepage service-area map usability

## What changed

### 1) Duplicate title cleanup
- Updated the homepage title, Open Graph title, and Twitter title so the homepage no longer exactly matches `/garage-door-repair-pleasanton`.

### 2) Structured data cleanup
- Standardized the sitewide business entity to `HomeAndConstructionBusiness`.
- Removed the invalid custom `GarageDoorService` type from business markup.
- Removed `serviceType` from business entities and kept service-specific data on `Service` objects only.
- Added consistent business identity fields used by Google and schema consumers:
  - `image`
  - `logo`
  - `contactPoint`
  - normalized `sameAs`
- Preserved page-specific `Service`, `FAQPage`, `BlogPosting`, `BreadcrumbList`, `WebPage`, and related schema where present.

### 3) Minified asset delivery
- Added `public/css/styles.min.css`
- Added `public/js/main.min.js`
- Switched HTML pages to the minified local assets.
- Kept the original source files in place for maintenance.

### 4) On-page SEO content pass
- Added or restored visible `<h1>` usage across the pages most likely to trigger SEMrush warnings:
  - homepage
  - gallery
  - quote
  - services
  - thank-you
- Replaced generic service-page headlines with more search-intent-aligned versions on:
  - `/services/commercial`
  - `/services/emergency`
  - `/services/installations`
- Expanded crawlable copy with local service-area language on:
  - homepage
  - gallery
  - quote
  - services
  - commercial service
  - emergency service
  - installations service
- Updated several service/gallery meta descriptions and service titles to better match local search intent without changing the visual brand direction.

### 5) Homepage map upgrade
- Replaced the static embedded service-area iframe on the homepage with an interactive Google map + place picker experience.
- Kept the same site styling direction while allowing visitors to search an address before booking.
- Added the map initialization logic to `public/js/main.js` and delivered it through the minified build.

### 6) Competitive SEO inspiration (without copying design)
- Reviewed the public on-page SEO approach on `boulevardgaragedoors.com`.
- Borrowed only the *useful* ideas:
  - clearer local service-area wording
  - stronger repair/install/emergency keyword coverage
  - more explicit city/county service references
- Did **not** copy their layout or weaker technical patterns (for example, repeated page titles / inconsistent headings on their public pages).

## Helper scripts for coworkers

### Rebuild minified assets
```bash
./scripts/build-minified-assets.sh
```

### Re-run the local SEO guardrail audit
```bash
python3 scripts/seo_audit.py
```

The audit currently checks for:
- exact duplicate `<title>` tags
- missing `<title>` tags
- titles longer than 60 characters
- missing `<h1>` tags
- stale references to non-minified local CSS/JS
- invalid `GarageDoorService` business markup
- `serviceType` attached to business entities

## Recommended post-deploy validation
1. Deploy the updated static files.
2. Re-run SEMrush Site Audit after the next crawl.
3. Re-test key URLs in Google's Rich Results Test:
   - homepage
   - `/garage-door-repair-pleasanton`
   - `/quote`
   - `/blog/garage-door-repair-cost-guide`
4. Re-submit the sitemap if needed.

## Browser audit note
A full live SEMrush browser review is currently blocked by the SEMrush login page in the Playwright session. Once the account is signed in, continue with the site audit project for `valiantdoor.com` and compare any remaining issues against this remediation pass.
