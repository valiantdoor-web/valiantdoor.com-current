# Valiant Production Source of Truth

Every agent must read this file before pushing or deploying anything related to Valiant production.

## Main website
- Live domain: https://www.valiantdoor.com/
- Website repository: https://github.com/valiantdoor-web/valiantdoor.com-current.git
- Local website repo: /Users/vm/Code/valiantdoor-live-edit-deploy
- Vercel project: 2026-01-26-website
- Vercel output directory: public

## Separate projects that must not be mixed with the main website
- Service app: valiant-service-app.vercel.app
- Service app credentials, Supabase keys, tables, app logic, and technician app wording belong only to the service app unless Valentino explicitly says to wire them into the main website.
- Listings / command center / iOS app files are not main website production changes unless Valentino explicitly says so.

## Required production gate
Before any production push or deploy:
1. Confirm the target is the main website repo above, not the service app or another Vercel project.
2. Confirm `.vercel/project.json` shows projectName `2026-01-26-website` for website deploys.
3. Run a repo status check and do not include app/editor/user-state files in a website production commit.
4. Verify navigation, sitemap, linked sections, and affected pages if a change is described as sitewide or global.
5. Do not expose, print, or commit API keys or secrets.
6. Do not push or deploy until the exact target project is confirmed.

## Bot image source
- Static website bot image path: /public/assets/valiant-bot-widget-static-shield-20260629.png
- Static website bot image URL: /assets/valiant-bot-widget-static-shield-20260629.png?v=bot-lock-20260702
- Current requested source image: /Users/vm/Pictures/image-download-2.png
- The bot label under the image should read: Valiant AI Assistant
