#!/usr/bin/env python3
from __future__ import annotations

import json
import plistlib
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'apps' / 'valiant-listings-ios'
PROJECT = APP / 'ValiantListings.xcodeproj'
PBX = PROJECT / 'project.pbxproj'
SCHEME = PROJECT / 'xcshareddata' / 'xcschemes' / 'ValiantListings.xcscheme'
SRC = APP / 'ValiantListings'
INFO = SRC / 'Info.plist'
APPICON = SRC / 'Assets.xcassets' / 'AppIcon.appiconset'

REQUIRED_SWIFT = [
    SRC / 'AppConfig.swift',
    SRC / 'ValiantListingsApp.swift',
    SRC / 'ContentView.swift',
    SRC / 'ListingsWebView.swift',
]

REQUIRED_ICON_SIZES = {
    'icon-40.png': (40, 40),
    'icon-58.png': (58, 58),
    'icon-60.png': (60, 60),
    'icon-80.png': (80, 80),
    'icon-87.png': (87, 87),
    'icon-120.png': (120, 120),
    'icon-180.png': (180, 180),
    'icon-1024.png': (1024, 1024),
}


def png_size(path: Path) -> tuple[int, int]:
    raw = path.read_bytes()
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path.relative_to(ROOT)} is not a PNG')
    return struct.unpack('>II', raw[16:24])


def main() -> int:
    errors: list[str] = []

    for path in [PROJECT, PBX, SCHEME, INFO, APPICON / 'Contents.json', *REQUIRED_SWIFT]:
        if not path.exists():
            errors.append(f'missing {path.relative_to(ROOT)}')

    if not errors:
        pbx_text = PBX.read_text(errors='ignore')
        for name in ['ValiantListingsApp.swift', 'ContentView.swift', 'ListingsWebView.swift', 'AppConfig.swift', 'Assets.xcassets', 'com.valiantdoor.listings']:
            if name not in pbx_text:
                errors.append(f'project.pbxproj missing reference to {name}')

        try:
            info = plistlib.loads(INFO.read_bytes())
            if info.get('CFBundleDisplayName') != 'Valiant Listings':
                errors.append('Info.plist CFBundleDisplayName must be Valiant Listings')
            if info.get('LSRequiresIPhoneOS') is not True:
                errors.append('Info.plist LSRequiresIPhoneOS must be true')
        except Exception as exc:
            errors.append(f'Info.plist invalid: {exc}')

        try:
            ET.parse(SCHEME)
        except Exception as exc:
            errors.append(f'xcscheme XML invalid: {exc}')

        try:
            icon_json = json.loads((APPICON / 'Contents.json').read_text())
            if not icon_json.get('images'):
                errors.append('AppIcon Contents.json has no images')
        except Exception as exc:
            errors.append(f'AppIcon Contents.json invalid: {exc}')

        for filename, expected in REQUIRED_ICON_SIZES.items():
            path = APPICON / filename
            if not path.exists():
                errors.append(f'missing app icon {filename}')
                continue
            try:
                actual = png_size(path)
                if actual != expected:
                    errors.append(f'{filename} size {actual}, expected {expected}')
            except Exception as exc:
                errors.append(str(exc))

        app_config = (SRC / 'AppConfig.swift').read_text(errors='ignore')
        if 'https://www.valiantdoor.com/listings-admin' not in app_config:
            errors.append('AppConfig.swift must point at live listings admin URL')

        webview = (SRC / 'ListingsWebView.swift').read_text(errors='ignore')
        for needle in ['WKWebView', 'allowsContentJavaScript', 'LISTINGS', 'UIApplication.shared.open']:
            if needle == 'LISTINGS':
                continue
            if needle not in webview:
                errors.append(f'ListingsWebView.swift missing {needle}')
        if 'LISTINGS_ADMIN_TOKEN' in ''.join(path.read_text(errors='ignore') for path in REQUIRED_SWIFT):
            errors.append('Native app must not hard-code LISTINGS_ADMIN_TOKEN')

    if errors:
        print('iOS listings app validation failed:')
        for error in errors:
            print(f'- {error}')
        return 1

    print('iOS listings app validation passed: project files, scheme, app metadata, icons, WebView URL, and no hard-coded admin token look correct.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
