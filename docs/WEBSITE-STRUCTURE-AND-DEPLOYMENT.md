# Valiantdoor.com Website Structure and Deployment

## Production source

- GitHub repository: `valiantdoor-web/valiantdoor.com-current-7e6ffe7f`
- Production branch: `main`
- Vercel project: `valiantdoor-prod`
- Vercel project ID: `prj_Uwn1hTTS8zzqJ6EuaZQD7Uo50OSW`
- Production domain: `https://www.valiantdoor.com`

The Vercel project is linked to the GitHub repository. A verified push to `main`
triggers the normal production deployment.

## Site structure

- `public/`: production static site files.
- `public/<page>/index.html`: route-specific HTML.
- `public/assets/`: images, fonts, and other media.
- `public/css/`: shared and route-specific stylesheets.
- `public/sitemap.xml`: page sitemap.
- `public/sitemap-images.xml`: image sitemap.
- `public/robots.txt`: crawler directives.
- `server.js`: local static development server.
- `scripts/`: reusable validation and maintenance scripts.

The before-and-after gallery is maintained in:

- `public/garage-door-before-after/index.html`
- `public/css/before-after.css`
- `public/assets/companycam-before-after/`
- `public/sitemap-images.xml`

Related service-area and service pages can also contain
`before-after-proof-card` modules that link to gallery anchors.

## Local validation

Run:

```bash
npm test
npm start
```

Before deployment, verify:

1. Every edited HTML page parses and every local image reference exists.
2. Gallery card count, filter labels, visible status text, and ItemList JSON-LD
   all report the same number.
3. `public/sitemap-images.xml` parses as XML and includes every new comparison
   image while excluding retired images.
4. Desktop and mobile views have no horizontal overflow.
5. Every comparison image loads at a nonzero natural width.
6. City filters return the expected cards.

## CompanyCam before-and-after workflow

CompanyCam API access uses the saved credential for
`api.companycam.com`. Never store or print the token in the repository.

The required source for premade comparisons is CompanyCam's own
`Before and After` tag. The tag ID used by the connected account is
`25545500`. Use CompanyCam's `list_photos` tool with that tag and then match
the returned photo's `project_id` to the correct project and city.

Rules:

1. Use the single comparison image CompanyCam already created.
2. Do not manually pair two field photos unless Valentino explicitly approves
   that pair.
3. Do not generate, stitch, crop, or reconstruct a new comparison.
4. WebP encoding for delivery is allowed only when it preserves the complete
   CompanyCam composition, labels, and watermark.
5. Confirm that both sides show the claimed completed condition. For opener
   replacements, both the old and new opener must be installed in the
   comparison.
6. If no premade comparison exists for a claimed city or service, remove the
   card rather than substituting an unrelated project.
7. Do not expose customer names, street addresses, phone numbers, or other
   private project metadata.

When a gallery card changes, update all of the following together:

- Gallery card markup and anchor.
- City/category filters and visible project count.
- ItemList/ImageObject JSON-LD.
- Open Graph image if the retired asset was used there.
- Related `before-after-proof-card` modules.
- Image sitemap entries.
- Retired image files and all references to them.

## Deployment

After tests and visual QA pass:

```bash
git add <reviewed-files>
git commit -m "<concise change summary>"
git push origin main
```

Then verify Vercel reports a successful production deployment and check the
live route on `https://www.valiantdoor.com`.
