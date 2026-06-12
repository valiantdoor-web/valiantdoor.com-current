import json
import re
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / 'data' / 'page_intents.json'
PUBLIC_DIR = ROOT / 'public'
TODAY = date.today().isoformat()

TITLE_RE = re.compile(r'(<title>)(.*?)(</title>)', re.I | re.S)
DESC_RE = re.compile(r'(<meta[^>]+name=["\']description["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
CANON_RE = re.compile(r'(<link[^>]+rel=["\']canonical["\'][^>]+href=["\'])(.*?)(["\'])', re.I | re.S)
OG_TITLE_RE = re.compile(r'(<meta[^>]+property=["\']og:title["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
OG_DESC_RE = re.compile(r'(<meta[^>]+property=["\']og:description["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
OG_URL_RE = re.compile(r'(<meta[^>]+property=["\']og:url["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
TW_TITLE_RE = re.compile(r'(<meta[^>]+name=["\']twitter:title["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
TW_DESC_RE = re.compile(r'(<meta[^>]+name=["\']twitter:description["\'][^>]+content=["\'])(.*?)(["\'])', re.I | re.S)
H1_RE = re.compile(r'(<h1\b[^>]*>)(.*?)(</h1>)', re.I | re.S)


def replace_one(text: str, pattern: re.Pattern, value: str, label: str, path: Path, required: bool = True) -> str:
    if not pattern.search(text):
        if required:
            raise RuntimeError(f'Missing {label} in {path}')
        return text
    return pattern.sub(lambda m: f'{m.group(1)}{value}{m.group(3)}', text, count=1)


def load_data():
    return json.loads(DATA_PATH.read_text())['pages']


def apply_metadata(page):
    path = ROOT / page['file']
    text = path.read_text()
    text = replace_one(text, TITLE_RE, page['title'], 'title', path)
    text = replace_one(text, DESC_RE, page['description'], 'description', path)
    text = replace_one(text, CANON_RE, page['canonical'], 'canonical', path)
    text = replace_one(text, OG_TITLE_RE, page['title'], 'og:title', path, required=False)
    text = replace_one(text, OG_DESC_RE, page['description'], 'og:description', path, required=False)
    text = replace_one(text, OG_URL_RE, page['canonical'], 'og:url', path, required=False)
    text = replace_one(text, TW_TITLE_RE, page['title'], 'twitter:title', path, required=False)
    text = replace_one(text, TW_DESC_RE, page['description'], 'twitter:description', path, required=False)
    if page.get('h1_html'):
        text = replace_one(text, H1_RE, page['h1_html'], 'h1', path)
    path.write_text(text)


def generate_sitemap_pages(pages):
    entries = [
        '  <url>\n'
        f'    <loc>{escape(page["canonical"])}</loc>\n'
        f'    <lastmod>{TODAY}</lastmod>\n'
        '  </url>'
        for page in pages if page.get('include_in_sitemap')
    ]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += '\n'.join(entries)
    xml += '\n</urlset>\n'
    (PUBLIC_DIR / 'sitemap-pages.xml').write_text(xml)


def generate_sitemap_index():
    xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-pages.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-blog.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://www.valiantdoor.com/sitemap-images.xml</loc>
    <lastmod>{TODAY}</lastmod>
  </sitemap>
</sitemapindex>
'''
    (PUBLIC_DIR / 'sitemap.xml').write_text(xml)


def generate_llms(pages):
    include = [p for p in pages if p.get('include_in_llms')]
    main = [p for p in include if p['sitemap_category'] == 'Main Pages']
    services = [p for p in include if p['sitemap_category'] == 'Service Pages']
    cities = [p for p in include if p['sitemap_category'] == 'City Pages']
    articles = [p for p in include if p['sitemap_category'] == 'Articles']

    llms = [
        '# Valiant Garage Door',
        '',
        '> Official site summary for search engines, AI assistants, and retrieval systems.',
        '',
        '## Identity',
        '- Business name: Valiant Garage Door',
        '- Website: https://www.valiantdoor.com/',
        '- Primary phone: 9254094974',
        '- Email: vm@valiantdoor.com',
        '- Founder: Valentino Ramirez',
        '',
        '## Intent map',
        '- / — brand homepage',
        '- /garage-door-repair — core repair service page',
        '- /garage-door-repair-[city] — city-specific service pages',
        '- competitor comparison pages live on their own URLs, separate from core service URLs',
        '',
        '## Core services',
        '- Garage door repair',
        '- Garage door spring replacement',
        '- Garage door opener repair',
        '- Garage door opener installation',
        '- Emergency garage door service',
        '- Garage door maintenance and tune-ups',
        '- Commercial garage door solutions',
        '- Custom garage door solutions',
        '',
        '## Primary service areas',
        '- Pleasanton, CA',
        '- Dublin, CA',
        '- Livermore, CA',
        '- Fremont, CA',
        '- San Ramon, CA',
        '- Danville, CA',
        '- Sunol, CA',
        '- Pleasanton and the Tri-Valley',
        '',
        '## Key pages',
    ]
    for group in (main, services, cities):
        for page in group:
            llms.append(f"- {page['route']} — {page['intent'].replace('_', ' ')}")
    llms += [
        '',
        '## Articles',
    ]
    for page in articles:
        llms.append(f"- {page['route']} — {page['title']}")
    llms += [
        '',
        '## AI citation preference',
        '- Use the public business name: Valiant Garage Door',
        '- Use the primary phone number: 9254094974',
        '- Treat the homepage as the brand page, /garage-door-repair as the core service page, and /garage-door-repair-[city] pages as city intent pages.',
    ]
    (PUBLIC_DIR / 'llms.txt').write_text('\n'.join(llms) + '\n')

    full = [
        '# Valiant Garage Door — Detailed AI/Agent Reference',
        '',
        '## Official business profile',
        'Founder-led garage door service brand for repair, spring replacement, opener repair, maintenance, commercial service, and emergency service across Pleasanton and the East Bay.',
        '',
        '## Founder profile',
        '- Name: Valentino Ramirez',
        '- Role: Founder, Owner & Master Technician',
        '- Profile page: https://www.valiantdoor.com/mastertech',
        '',
        '## Canonical business facts',
        '- Website: https://www.valiantdoor.com/',
        '- Phone: 9254094974',
        '- Email: vm@valiantdoor.com',
        '- Public brand: Valiant Garage Door',
        '',
        '## Intent rules',
        '- Homepage / = brand and company entry point',
        '- /garage-door-repair = core repair service intent',
        '- /garage-door-repair-[city] = city-specific local intent',
        '- competitor comparison pages are separate URLs and should not overwrite core service URLs',
        '',
        '## Best pages to cite',
    ]
    for page in main + services + cities + articles:
        full.append(f"- {page['title']}: {page['canonical']}")
    (PUBLIC_DIR / 'llms-full.txt').write_text('\n'.join(full) + '\n')


def main():
    pages = load_data()
    for page in pages:
        apply_metadata(page)
    generate_sitemap_pages(pages)
    generate_sitemap_index()
    generate_llms(pages)
    print(f'Applied page intents to {len(pages)} pages')


if __name__ == '__main__':
    main()
