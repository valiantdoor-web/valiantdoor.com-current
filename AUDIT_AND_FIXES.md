# Valiant Garage Door — Audit and Fixes

## Scope
This pass covered two phases for `valiantdoor.com`:
1. confirmed mobile homepage layout fixes first
2. safe codebase-wide SEO, GEO, and performance improvements after the mobile fixes

## Assumptions
- This is a static-site style codebase served through Vercel.
- Live-tool baselines that depend on third-party dashboards were not available inside the repo, so crawlability and structured-data findings were verified from code and local/headless runtime checks.
- Local Google Maps rendering on `127.0.0.1` is limited by Google referrer restrictions; production HTML/asset checks were completed after deploy, but Google Maps interaction should still be spot-checked in a live browser.

---

## 1) Confirmed implemented homepage mobile fixes

### Confirmed issues fixed
- Horizontal overflow on phone widths.
- Founder section staying in a two-column layout on the homepage because a homepage-specific selector overrode the generic mobile stack.
- Hero CTA lockup feeling too tall overall while the actionable CTA area became too small on phones.
- Review stack consuming too much vertical space on phones because the Housecall Pro iframe and map card were oversized.

### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/css/styles.css`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/css/styles.min.css`

### Mobile homepage changes made
#### Founder section
- forced `.page-home .founder-preview--hero-slot .founder-preview-grid` to a single-column phone layout
- ensured `.founder-preview-copy`, `.founder-preview-actions`, and `.founder-preview-highlights` use full width and wrap cleanly
- preserved the existing look, colors, borders, typography, and button styling

#### Hero section
- reduced homepage hero phone-height without redesigning the composition
- rebalanced `.page-home .hero-cta-panel`, `.hero-door-call`, and `.hero-door-cta` sizing for phone widths
- kept the same hero art and CTA lockup styling while improving fit and usability

#### Overflow / clipping
- clipped horizontal overflow in the mobile header stack without changing the visible nav design
- ensured homepage wrappers stay inside the viewport at common phone sizes
- preserved the sticky header, logo, hamburger menu, and mobile nav appearance

#### Reviews / map pacing
- reduced the mobile min-height of the Housecall Pro reviews iframe from the prior 920px footprint to 760px
- tightened the review map card padding and reduced the mobile `gmp-map` height
- kept the existing card design and copy intact

### Headless verification performed
Phone-width verification was run locally in a fresh headless browser context at:
- `360×800`
- `375×812`
- `390×844`
- `430×932`

#### Verified results
- no horizontal scroll remained at any tested phone width
- founder grid rendered as one column on the homepage mobile breakpoint
- hero height dropped into a cleaner mobile range while the CTA panel stayed readable
- mobile nav opened without creating extra page width
- review iframe held at `760px`
- map card height dropped to about `512px–538px` depending on viewport

Representative headless measurements:
- `390×844`: `root scrollWidth 375`, founder grid `320.797px` single column, hero height `514.796875`
- `430×932`: `root scrollWidth 415`, founder grid `357.594px` single column, hero height `567.59375`

---

## 2) Codebase-wide SEO / GEO / performance fixes made

### Crawlability and indexation
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/vercel.json`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/sitemap.xml`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/sitemap-pages.xml`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/sitemap-blog.xml`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/sitemap-images.xml`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/robots.txt`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/thank-you/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/site-map/index.html`

#### Changes made
- enforced preferred-host behavior for `valiantdoor.com` → `https://www.valiantdoor.com/`
- enforced trailing-slash cleanup for non-root URLs
- split the sitemap into page, blog, and image sitemap files behind a sitemap index
- removed redirected and low-value URLs from sitemap coverage
- marked utility pages like `/thank-you` and `/site-map` as `noindex, follow`

### On-page SEO and metadata
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/garage-door-repair/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/garage-door-opener-repair/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/garage-door-installation/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/commercial/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/emergency/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/mastertech/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/garage-door-maintenance-checklist/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/garage-door-opener-not-working-fix/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/garage-door-repair-cost-guide/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/how-long-garage-doors-last/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/why-garage-door-springs-break/index.html`

#### Changes made
- tightened homepage and services titles to cleaner branded SERP formats
- aligned OG and Twitter metadata with the stronger branded titles
- standardized more priority-page titles around `Valiant Garage Door`
- added visible `Last updated` copy to blog articles for readers and answer engines
- kept canonicals, descriptions, and H1 usage clean across indexable pages

### Structured data and GEO improvements
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/gallery/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/mission/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/commercial/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/blog/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/faq/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/service-areas/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/llms.txt`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/llms-full.txt`

#### Changes made
- expanded the homepage into a richer business/entity graph with `LocalBusiness`, `Brand`, `WebSite`, and `WebPage`
- expanded the services hub with `Service`, `OfferCatalog`, `WebPage`, and `BreadcrumbList`
- upgraded gallery, mission, and commercial pages with page-level schema and breadcrumb relationships
- upgraded blog, FAQ, and service-areas pages so they now expose stronger page/entity relationships in JSON-LD
- expanded `llms.txt` and `llms-full.txt` so AI systems have a cleaner list of key pages and city/service citations
- kept FAQ schema limited to pages where the FAQ content is visibly present

### Internal linking and information architecture
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/site-map/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/sitemap-pages.xml`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/llms.txt`

#### Changes made
- restored `/garage-door-installation` as a real landing page route
- redirected `/services/installations` to `/garage-door-installation`
- redirected `/services/emergency` to `/emergency-garage-door-repair`
- expanded direct internal links to canonical service and city pages, including Fremont
- reduced duplicate-path signals around emergency and installation service content

### Performance and Core Web Vitals
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/js/main.js`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/js/main.min.js`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/css/styles.css`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/css/styles.min.css`
- 29 HTML files across `/Users/vm/Code/valiantdoor-live-edit-deploy/public/**`

#### Changes made
- lazy-loaded the Housecall Pro chat widget on user intent instead of eager page load
- added missing `width` and `height` attributes to 164 raster images to reduce CLS risk
- added an explicit aspect ratio to the homepage featured video to reduce layout instability before media paint
- moved the homepage Google Maps web-component library out of the HTML head and into JS demand-loading tied to the service-area section

### Audit guardrails
#### Files changed
- `/Users/vm/Code/valiantdoor-live-edit-deploy/scripts/seo_audit.py`

#### Changes made
- kept the local SEO audit guardrails in place
- updated the structured-data description guardrail to allow the approved description variants now present across the site

### Headless verification performed
- local SEO audit script passed
- local guardrail script found `29` pages and `0` title/meta/canonical/H1 issues in the check run
- updated JSON-LD blocks parsed successfully on all changed pages checked in this pass
- in a fresh headless browser context, the homepage Google Maps component library was absent before scrolling to the service-area map and loaded only after the map section was brought into view
- production deploy completed on March 27, 2026 and aliased to `https://www.valiantdoor.com`
- live checks confirmed `https://www.valiantdoor.com/`, `/services`, `/robots.txt`, and `/sitemap.xml` are serving the updated assets and metadata
- Semrush Position Tracking was expanded from `1` tracked keyword to `11` tracked keywords on the existing US desktop campaign

---

## 3) Remaining manual recommendations

### Production follow-up still worth doing
- spot-check the homepage Google Maps interaction in a normal production browser session
- run Google Search Console and Bing Webmaster URL inspection on the live URLs
- rerun Rich Results Test, schema validation, and Lighthouse/PageSpeed on production URLs
- if you want a single-hop apex redirect, handle the current `http://valiantdoor.com` → `https://valiantdoor.com` → `https://www.valiantdoor.com/` chain at the domain/platform level

### Content / GEO follow-up that should stay manual
- add visible breadcrumbs to `/services` if approved visually
- add stronger trust modules only if the facts are verified: warranty details, certifications, licensing, partnerships, years-in-business proof, before/after proof
- build out topical clusters for repair, opener, spring, emergency, commercial, and city/service-area content
- add policy-compliant review schema only if the review content is directly visible and eligible

### Remaining lower-confidence items
- verify whether the dormant `/public/services/installations/index.html` template should be retired permanently after production checks
- expand answer-first intros on the highest-priority money pages only if the approved copy is available

---

## Estimated SEO impact
### Highest expected SEO impact
1. canonical host + trailing-slash normalization
2. sitemap cleanup and utility-page deindexing
3. stronger page titles and metadata on homepage, services hub, and priority templates
4. better internal linking to canonical money pages and city pages
5. lower CLS risk from image dimensions and featured-video ratio hardening

## Estimated GEO impact
### Highest expected GEO impact
1. richer homepage and services entity graphs
2. stronger blog / FAQ / service-area / gallery / mission / commercial page schema
3. clearer AI crawl paths through `llms.txt` and `llms-full.txt`
4. visible freshness signals on blog content
5. cleaner canonical signals for the main commercial and city/service pages

## Current baseline reality check
Semrush baseline remains weak in visibility, but tracked keyword coverage is no longer minimal: the existing Position Tracking campaign now contains `11` keywords. The codebase is materially cleaner, but rankings will still depend on:
- authority / backlinks / reviews
- local content depth
- post-deploy validation in live search tools
