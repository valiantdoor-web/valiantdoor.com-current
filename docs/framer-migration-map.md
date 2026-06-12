# Framer Migration Map

## Goal
Rebuild the current Valiant website in Framer on a staging subdomain first, without touching the live domain until the rebuild is approved.

## Current site inventory
Total HTML routes in repo: 35

### Core web pages
- /
- /services/
- /garage-door-repair/
- /garage-door-opener-repair/
- /garage-door-openers/
- /garage-door-spring-replacement/
- /garage-door-installation/
- /emergency-garage-door-repair/
- /service-areas/
- /gallery/
- /faq/
- /mission/
- /mastertech/
- /quote/
- /thank-you/
- /site-map/
- /boulevard-garage-doors-alternative/

### Blog index + posts
- /blog/
- /blog/garage-door-maintenance-checklist/
- /blog/garage-door-opener-not-working-fix/
- /blog/garage-door-repair-cost-guide/
- /blog/how-long-garage-doors-last/
- /blog/why-garage-door-springs-break/

### City pages
- /garage-door-repair-pleasanton/
- /garage-door-repair-dublin-ca/
- /garage-door-repair-livermore/
- /garage-door-repair-san-ramon/
- /garage-door-repair-danville/
- /garage-door-repair-fremont/
- /garage-door-repair-sunol/

### Service child pages currently under /services/
- /services/garage-door-maintenance/
- /services/commercial/
- /services/emergency/  -> canonical points to /emergency-garage-door-repair
- /services/installations/ -> canonical points to /garage-door-installation

### Internal / utility
- /address-selection-hidden/

## Framer build structure

### Standard Framer pages
Create these as normal pages in Framer:
- Home (/)
- Services (/services)
- Garage Door Repair (/garage-door-repair)
- Garage Door Opener Repair (/garage-door-opener-repair)
- Garage Door Openers (/garage-door-openers)
- Garage Door Spring Replacement (/garage-door-spring-replacement)
- Garage Door Installation (/garage-door-installation)
- Emergency Garage Door Repair (/emergency-garage-door-repair)
- Service Areas (/service-areas)
- Gallery (/gallery)
- FAQ (/faq)
- Mission (/mission)
- Master Tech (/mastertech)
- Quote (/quote)
- Thank You (/thank-you)
- Site Map (/site-map)
- Competitor page (/boulevard-garage-doors-alternative)
- Blog index (/blog)

### Framer CMS collections

#### 1) Blog Posts collection
Fields:
- title
- slug
- meta_title
- meta_description
- canonical_url
- h1
- publish_date
- summary
- hero_image
- body_rich_text
- faq_json_or_rich_text (optional)

Use for:
- all 5 current blog post URLs

#### 2) City Pages collection
Fields:
- city_name
- slug
- meta_title
- meta_description
- canonical_url
- h1
- intro
- service_area_copy
- faq_content
- local_schema_fields
- hero_image (optional)

Use for:
- all 7 garage-door-repair-[city] pages

#### 3) Optional Service Pages collection
Only if you want easier duplication later.
Otherwise keep these as regular pages.

## SEO-critical items that must be preserved during migration
For every migrated URL:
- page title
- H1
- meta description
- canonical URL
- internal links
- indexability
- schema / JSON-LD where present
- final path slug

Framer supports:
- custom pages and CMS pages
- canonical URL configuration
- redirects
- sitemap generation
- custom 404 page

## Third-party items to recreate
Current site uses these external embeds/links:
- Housecall Pro booking links
- Housecall Pro lead form embed on home page
- Housecall Pro reviews widget on home page

These should be recreated in Framer using embeds/scripts.

## Recommended migration order
1. Home page
2. Core service page: /garage-door-repair
3. Quote page
4. Service Areas
5. Master Tech
6. Remaining fixed service pages
7. Blog index + blog CMS
8. City page CMS
9. FAQ / Gallery / Mission / Site Map / Thank You
10. Redirect review + final SEO review before domain cutover

## First Framer build target
Build these first before touching the domain:
- /
- /garage-door-repair
- /quote
- /service-areas
- /mastertech

## Notes
- Keep live Vercel production untouched until Framer staging is approved.
- Do not cut the domain until paths, metadata, embeds, and redirects are checked.
