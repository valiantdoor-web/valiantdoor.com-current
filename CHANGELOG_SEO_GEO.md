# SEO / GEO Changelog

## 2026-03-27

### Homepage mobile layout fixes
- removed mobile homepage horizontal overflow at common phone widths
- forced the homepage founder section into a true single-column stack on phone widths
- tightened the homepage hero CTA lockup sizing and spacing for phones without redesigning the visual style
- reduced the mobile review stack footprint by lowering the Housecall Pro iframe height and tightening the map card footprint
- regenerated `public/css/styles.min.css` after the source CSS changes

### Structured data / GEO
- upgraded `/blog` to a richer graph with `WebSite`, `CollectionPage`, `Blog`, FAQ, and breadcrumb relationships
- upgraded `/faq` to a richer graph with page-level FAQ relationships tied back to the site entity
- upgraded `/service-areas` to a richer graph with `WebSite`, `CollectionPage`, FAQ, and breadcrumb relationships
- expanded `llms.txt` and `llms-full.txt` with more canonical service and city pages for AI citation paths
- kept local audit guardrails aligned with the approved business-description variants now used in JSON-LD

### Performance / CWV
- added an aspect ratio to the homepage featured video to reduce layout instability before the video paints
- removed the Google Maps web-component library from the homepage head and moved it into demand-loaded JS tied to the service-area map section
- regenerated `public/js/main.min.js` after the source JS changes

### Verification
- reran the local SEO audit successfully
- reran local page guardrail checks with `29` pages and `0` title/meta/canonical/H1 issues
- verified the homepage mobile fixes headlessly at `360×800`, `375×812`, `390×844`, and `430×932`
- verified in a fresh headless browser context that the Google Maps component library is absent before scrolling to the service-area map and loads after the map section is brought into view

### Deploy / live validation
- deployed the updated site to Vercel production and aliased it to `https://www.valiantdoor.com`
- confirmed live `200` responses for `/`, `/services`, `/robots.txt`, and `/sitemap.xml`
- confirmed live trailing-slash cleanup on `/services/` → `/services`
- confirmed live homepage HTML no longer includes the Google Maps component library in the head
- confirmed the live production `main.min.js` includes the demand-loader for the homepage map
- expanded the Semrush Position Tracking campaign from `1` tracked keyword to `11` tracked keywords on the existing US desktop campaign

## 2026-03-26

### Technical SEO
- added preferred-host redirect for `valiantdoor.com` → `www.valiantdoor.com`
- added trailing-slash normalization in `vercel.json`
- converted the flat sitemap into a sitemap index
- added dedicated page/blog/image sitemaps
- removed redirected and low-value URLs from sitemap coverage
- added `noindex, follow` to utility pages (`/thank-you`, `/site-map`)

### On-page SEO
- shortened homepage title to `Pleasanton Garage Door Repair | Valiant Garage Door`
- shortened services title to `Pleasanton Garage Door Services | Valiant Garage Door`
- aligned OG/Twitter title tags with the updated branded titles
- standardized additional priority titles to use `Valiant Garage Door` instead of `Valiant`
- shortened overlong repair/opener/emergency descriptions for cleaner snippets

### Structured data / GEO
- expanded homepage JSON-LD into a richer business/entity graph
- expanded services page JSON-LD with `Service`, `OfferCatalog`, `WebPage`, and `BreadcrumbList`
- corrected services schema so it no longer references a redirecting installation URL
- added visible `Last updated` metadata to blog posts for freshness and answer-engine clarity
- expanded `llms.txt` key-page coverage for installation, emergency, commercial, and Fremont

### Performance / accessibility
- added width/height attributes to 164 raster image tags across the site
- changed Housecall Pro chat loading from eager page-load to user-intent lazy loading
- regenerated minified CSS/JS assets after source changes

### Information architecture / internal linking
- reactivated `/garage-door-installation` as a live landing page route
- redirected `/services/installations` to `/garage-door-installation`
- redirected `/services/emergency` to `/emergency-garage-door-repair`
- added direct service deep links from `/services` to canonical money pages
- added direct homepage links to all city pages, including Fremont
- added footer navigation to the homepage
- replaced duplicate emergency sitemap/site-map entries with the canonical installation page

### Baseline signals
- Semrush project confirmed for `valiantdoor.com`
- Position Tracking currently contains only 1 keyword
- Semrush organic/rank checks currently show no measurable US visibility baseline for the domain
