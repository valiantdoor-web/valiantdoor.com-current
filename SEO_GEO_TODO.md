# SEO / GEO TODO

## 1) Validate the homepage map on production
**Files:**
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/js/main.js`

The homepage map library is now demand-loaded instead of being loaded in the HTML head.
Manual live check after deploy:
- confirm the map still initializes on `https://www.valiantdoor.com/`
- confirm address lookup works
- confirm there are no Google Maps referrer or API-key issues on the production host

## 2) Domain-level redirect cleanup
Current live behavior is acceptable for canonical resolution, but `http://valiantdoor.com/` still double-hops through the apex HTTPS host before landing on `https://www.valiantdoor.com/`.
If you want a single-hop canonical redirect, handle it at the domain/platform level.

## 3) Validate in external tools after deploy
- Google Search Console URL Inspection
- Bing Webmaster Tools URL inspection
- Rich Results Test
- Schema validator
- PageSpeed Insights / Lighthouse
- Semrush Site Audit rerun

## 4) Decide whether to retire the dormant installations template
**Files:**
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/garage-door-installation/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/public/services/installations/index.html`
- `/Users/vm/Code/valiantdoor-live-edit-deploy/vercel.json`

Next step:
- confirm production routing after deploy
- inspect Search Console coverage for `/garage-door-installation`
- retire `/public/services/installations/index.html` if it is no longer needed as a dormant fallback template

## 5) Manual content / trust additions only if approved and accurate
Priority opportunities:
- visible breadcrumbs on `/services`
- stronger trust modules for warranties, certifications, licensing, and partnerships
- before/after proof on service pages
- stronger answer-first intros on the top money pages
- deeper local topical clusters for repair, opener, spring, emergency, commercial, and city pages

## 6) Review schema only if fully policy-compliant
Do not add review or aggregate-rating markup unless:
- the content is visibly present on the page
- the source is legitimate
- the markup complies with Google policy
