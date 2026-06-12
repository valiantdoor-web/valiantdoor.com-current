#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
HTML_FILES = sorted(PUBLIC.rglob('*.html'))
SCRIPT_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.I | re.S)
TITLE_RE = re.compile(r'<title>(.*?)</title>', re.I | re.S)
H1_RE = re.compile(r'<h1\b', re.I)
BUSINESS_NAME = 'Valiant Garage Door'
BUSINESS_URL = 'https://www.valiantdoor.com/'
BUSINESS_PHONE = '9254094974'
BUSINESS_DESCRIPTIONS = {
    'Founder-led garage door service for repair, spring replacement, opener repair, maintenance, commercial service, and emergency response across Pleasanton and nearby East Bay communities.',
    'Valiant Garage Door Is Pleasanton-Based, Serving Danville, Fremont, Sunol and Surrounding Areas With Expert Garage Door Repair, Emergency Service, Spring Replacement,Openers,Complex Systems, And Precision System Upgrades. We’re Known For Fast Response, Honest Pricing, Clear Long-Term Solutions, And Repair-First Service.',
}


def title_of(text: str) -> str:
    match = TITLE_RE.search(text)
    if not match:
        return '(missing)'
    return ' '.join(match.group(1).split())


def flatten_jsonld_items(parsed):
    if isinstance(parsed, list):
        for item in parsed:
            yield from flatten_jsonld_items(item)
        return
    if isinstance(parsed, dict) and '@graph' in parsed:
        for item in parsed.get('@graph', []):
            yield from flatten_jsonld_items(item)
        return
    if isinstance(parsed, dict):
        yield parsed


def iter_jsonld(text: str):
    for match in SCRIPT_RE.finditer(text):
        raw = match.group(1).strip()
        yield raw, json.loads(raw)


def main() -> int:
    errors: list[str] = []
    titles: dict[str, list[str]] = defaultdict(list)

    for path in HTML_FILES:
        rel = path.relative_to(ROOT).as_posix()
        text = path.read_text(encoding='utf-8')
        title = title_of(text)
        titles[title].append(rel)

        if rel != 'public/google74cfcfa1c4e5b929.html':
            if title == '(missing)':
                errors.append(f'{rel}: missing <title>')
            if len(title) > 60:
                errors.append(f'{rel}: <title> longer than 60 characters ({len(title)})')
            if not H1_RE.search(text):
                errors.append(f'{rel}: missing <h1>')

        if '/css/styles.css' in text or '/js/main.js' in text:
            errors.append(f'{rel}: still references non-minified local assets')

        for raw, parsed in iter_jsonld(text):
            for item in flatten_jsonld_items(parsed):
                types = item.get('@type')
                type_list = types if isinstance(types, list) else [types]
                is_business = item.get('@id') == 'https://www.valiantdoor.com/#business' or any(
                    t in {'LocalBusiness', 'HomeAndConstructionBusiness', 'GarageDoorService'} for t in type_list
                )
                if any(t == 'GarageDoorService' for t in type_list):
                    errors.append(f'{rel}: invalid custom structured data type GarageDoorService still present')
                if is_business and 'serviceType' in item:
                    errors.append(f'{rel}: business markup still uses serviceType; keep it on Service objects only')
                if is_business:
                    if item.get('name') != BUSINESS_NAME:
                        errors.append(f"{rel}: business name mismatch ({item.get('name')!r})")
                    if item.get('url') != BUSINESS_URL:
                        errors.append(f"{rel}: business url mismatch ({item.get('url')!r})")
                    if item.get('telephone') != BUSINESS_PHONE:
                        errors.append(f"{rel}: business phone mismatch ({item.get('telephone')!r})")
                    if item.get('description') not in BUSINESS_DESCRIPTIONS:
                        errors.append(f"{rel}: business description mismatch ({item.get('description')!r})")
                    contact_point = item.get('contactPoint', [])
                    if isinstance(contact_point, dict):
                        contact_points = [contact_point]
                    elif isinstance(contact_point, list):
                        contact_points = [cp for cp in contact_point if isinstance(cp, dict)]
                    else:
                        contact_points = []
                    for cp in contact_points:
                        if cp.get('telephone') != BUSINESS_PHONE:
                            errors.append(f"{rel}: contactPoint phone mismatch ({cp.get('telephone')!r})")

    for title, paths in sorted(titles.items()):
        if len(paths) > 1:
            errors.append(f'duplicate <title>: {title} -> {", ".join(paths)}')

    if errors:
        print('SEO audit failed:')
        for error in errors:
            print(f'- {error}')
        return 1

    print('SEO audit passed: titles, H1s, minified asset references, and structured-data guardrails look clean.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
