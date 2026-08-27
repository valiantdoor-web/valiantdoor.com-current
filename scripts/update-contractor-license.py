#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
LICENSE_NO = "1160068"
DISPLAY = f"CA Contractor License #{LICENSE_NO}"

meta = f'<meta name="contractor-license" content="{DISPLAY}">'
footer_line = (
    f'<p class="contractor-license" style="margin:12px auto 0;text-align:center;'
    f'font-size:.78rem;letter-spacing:.06em;color:#b7b1a6">{DISPLAY}</p>'
)

for path in sorted(PUBLIC.rglob("*.html")):
    text = path.read_text(encoding="utf-8")
    original = text

    # Normalize the formerly hyphenated display everywhere before adding the
    # sitewide footer/meta treatment.
    text = text.replace("CSLB License #116-0068", DISPLAY)
    text = text.replace("CSLB license: 116-0068", f"California contractor license: {LICENSE_NO}")

    if path.name != "google74cfcfa1c4e5b929.html" and "</head>" in text and meta not in text:
        text = text.replace("</head>", f"{meta}\n</head>", 1)

    if '<footer class="site-footer"' in text:
        footer_start = text.find('<footer class="site-footer"')
        footer_end = text.find("</footer>", footer_start)
        if footer_end == -1:
            raise RuntimeError(f"Unclosed site footer: {path}")
        footer_html = text[footer_start:footer_end]
        if DISPLAY not in footer_html:
            text = text[:footer_end] + footer_line + text[footer_end:]

    if text != original:
        path.write_text(text, encoding="utf-8")

# Public pages that intentionally use a custom layout rather than site-footer.
standalone_public_pages = [
    "404.html",
    "COMMUNITY-PROJECT/index.html",
    "business-card/index.html",
    "new-garage-door-installation/index.html",
    "nextdoor-emergency-repair/index.html",
    "privacy/index.html",
    "services/PLEASANTON-BROKEN-SPRING-REPAIR/index.html",
    "terms/index.html",
]
standalone_footer = (
    f'<footer class="contractor-license-footer" style="padding:16px;text-align:center;'
    f'background:#0b0b0c;color:#b7b1a6;font:600 .78rem/1.4 Inter,system-ui,sans-serif;'
    f'letter-spacing:.06em">{DISPLAY}</footer>'
)
for rel in standalone_public_pages:
    path = PUBLIC / rel
    text = path.read_text(encoding="utf-8")
    if DISPLAY not in text and "</body>" in text:
        text = text.replace("</body>", f"{standalone_footer}\n</body>", 1)
        path.write_text(text, encoding="utf-8")

# Add authoritative license identity to the primary LocalBusiness schema.
home = PUBLIC / "index.html"
text = home.read_text(encoding="utf-8")
schema_anchor = '      "telephone": "9254094974",\n'
schema_license = (
    '      "identifier": "CA Contractor License #1160068",\n'
    '      "hasCredential": {\n'
    '        "@type": "EducationalOccupationalCredential",\n'
    '        "credentialCategory": "Contractor license",\n'
    '        "name": "California Contractor License #1160068",\n'
    '        "recognizedBy": {\n'
    '          "@type": "Organization",\n'
    '          "name": "California Contractors State License Board"\n'
    '        }\n'
    '      },\n'
)
if schema_license not in text:
    if schema_anchor not in text:
        raise RuntimeError("Homepage LocalBusiness schema anchor not found")
    text = text.replace(schema_anchor, schema_anchor + schema_license, 1)
    home.write_text(text, encoding="utf-8")

# Keep AI/entity discovery surfaces aligned.
for rel in ["llms.txt", "llms-full.txt", "geo.md"]:
    path = PUBLIC / rel
    text = path.read_text(encoding="utf-8")
    text = text.replace("- CSLB license: 116-0068\n", f"- California contractor license: {LICENSE_NO}\n")
    line = f"- California contractor license: {LICENSE_NO} (displayed as {DISPLAY}).\n"
    anchor = "## Entity clarification\n"
    if line not in text:
        if anchor not in text:
            raise RuntimeError(f"Entity clarification anchor missing: {path}")
        text = text.replace(anchor, anchor + line, 1)
    path.write_text(text, encoding="utf-8")

agents = PUBLIC / "agents.json"
text = agents.read_text(encoding="utf-8")
# Remove an obsolete duplicate block if a prior run created it; the canonical
# field is the existing top-level "license" object.
text = re.sub(
    r'  "contractor_license": \{\n'
    r'    "jurisdiction": "California",\n'
    r'    "agency": "Contractors State License Board",\n'
    r'    "number": "1160068",\n'
    r'    "display": "CA Contractor License #1160068"\n'
    r'  \},\n',
    "",
    text,
)
text = text.replace('"number": "116-0068"', '"number": "1160068"')
text = text.replace('"display": "CSLB License #116-0068"', f'"display": "{DISPLAY}"')
agents.write_text(text, encoding="utf-8")

print(f"Updated contractor license to {LICENSE_NO}")
