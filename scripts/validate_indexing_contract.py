#!/usr/bin/env python3
"""Validate the maintenance page remains indexable and canonical.

This catches the exact class of issue from Search Console: typo/slash URLs,
robots blocks, and sitemap/canonical drift for the maintenance page.
"""
from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CANONICAL = "https://www.valiantdoor.com/services/garage-door-maintenance"
BAD_URLS = {
    "https://www.valiantdoor.com/services/garage-door-maintenance/",
    "https://www.valiantdoor.com/services/garage-door-maintenence",
    "https://www.valiantdoor.com/services/garage-door-maintenence/",
}
LOCAL_PATH = "/services/garage-door-maintenance"

errors: list[str] = []

def fail(message: str) -> None:
    errors.append(message)

html_path = PUBLIC / "services" / "garage-door-maintenance" / "index.html"
html = html_path.read_text(encoding="utf-8", errors="replace")
canonicals = re.findall(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
if canonicals != [CANONICAL]:
    fail(f"maintenance page canonical must be exactly {CANONICAL}; found {canonicals!r}")

robots_meta = re.findall(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
if not robots_meta or not any("index" in item.lower() and "follow" in item.lower() for item in robots_meta):
    fail("maintenance page must include robots index, follow meta")
if any("noindex" in item.lower() for item in robots_meta):
    fail("maintenance page must not include noindex")

robots_path = PUBLIC / "robots.txt"
robots = robots_path.read_text(encoding="utf-8", errors="replace") if robots_path.exists() else ""
if re.search(r"(?im)^\s*disallow:\s*/\s*$", robots):
    fail("robots.txt must not disallow the whole site")
if re.search(r"(?im)^\s*disallow:\s*/services/garage-door-maintenance/?\s*$", robots):
    fail("robots.txt must not block the maintenance page")
if "Sitemap: https://www.valiantdoor.com/sitemap.xml" not in robots:
    fail("robots.txt must point to the canonical sitemap")

xml_files = list(PUBLIC.glob("sitemap*.xml"))
seen_canonical = False
for xml_file in xml_files:
    text = xml_file.read_text(encoding="utf-8", errors="replace")
    for bad in BAD_URLS:
        if bad in text:
            fail(f"{xml_file.relative_to(ROOT)} contains non-canonical URL {bad}")
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        fail(f"{xml_file.relative_to(ROOT)} is not valid XML: {exc}")
        continue
    if CANONICAL in text:
        seen_canonical = True
if not seen_canonical:
    fail("canonical maintenance URL is missing from sitemap XML files")

# Internal links should point to the canonical no-slash path, not the typo or slash variant.
for path in PUBLIC.rglob("*.html"):
    rel = path.relative_to(ROOT)
    text = path.read_text(encoding="utf-8", errors="replace")
    if "/services/garage-door-maintenence" in text:
        fail(f"{rel} links to misspelled maintenance URL")
    if 'href="/services/garage-door-maintenance/"' in text or "href='/services/garage-door-maintenance/'" in text:
        fail(f"{rel} links to trailing-slash maintenance URL")

vercel_path = ROOT / "vercel.json"
config = json.loads(vercel_path.read_text(encoding="utf-8"))
redirects = config.get("redirects", [])
required_redirects = {
    "/services/garage-door-maintenence",
    "/services/garage-door-maintenence/",
    "/services/garage-door-maintenance/",
}
for source in required_redirects:
    match = next((r for r in redirects if r.get("source") == source), None)
    if not match:
        fail(f"vercel.json missing redirect from {source}")
    elif match.get("destination") != LOCAL_PATH or not match.get("permanent"):
        fail(f"vercel.json redirect for {source} must permanently target {LOCAL_PATH}")

headers = config.get("headers", [])
robots_header = False
for item in headers:
    if item.get("source") == LOCAL_PATH:
        for header in item.get("headers", []):
            if header.get("key", "").lower() == "x-robots-tag" and "index" in header.get("value", "").lower():
                robots_header = True
if not robots_header:
    fail("vercel.json should send X-Robots-Tag index, follow for the maintenance page")

if errors:
    print("Indexing contract failed:")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print("Indexing contract passed for maintenance page canonical, robots, redirects, and sitemap entries.")
