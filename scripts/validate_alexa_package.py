#!/usr/bin/env python3
from __future__ import annotations

import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / 'amazon' / 'alexa-valiant' / 'skill-package' / 'skill.json'
MODEL = ROOT / 'amazon' / 'alexa-valiant' / 'skill-package' / 'interactionModels' / 'custom' / 'en-US.json'
SMALL_ICON = ROOT / 'public' / 'assets' / 'alexa' / 'valiant-alexa-icon-108.png'
LARGE_ICON = ROOT / 'public' / 'assets' / 'alexa' / 'valiant-alexa-icon-512.png'
EXPECTED_ENDPOINT = 'https://www.valiantdoor.com/api/alexa-valiant'
EXPECTED_PRIVACY = 'https://www.valiantdoor.com/privacy'
EXPECTED_TERMS = 'https://www.valiantdoor.com/terms'
EXPECTED_SMALL_ICON = 'https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-108.png'
EXPECTED_LARGE_ICON = 'https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-512.png'


def png_size(path: Path) -> tuple[int, int]:
    raw = path.read_bytes()
    if raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError(f'{path} is not a PNG')
    if raw[12:16] != b'IHDR':
        raise ValueError(f'{path} missing IHDR')
    return struct.unpack('>II', raw[16:24])


def main() -> int:
    errors: list[str] = []

    for path in [SKILL, MODEL, SMALL_ICON, LARGE_ICON]:
        if not path.exists():
            errors.append(f'missing required file: {path.relative_to(ROOT)}')

    if not errors:
        skill = json.loads(SKILL.read_text())
        manifest = skill.get('manifest', {})
        publishing = manifest.get('publishingInformation', {})
        locale = publishing.get('locales', {}).get('en-US', {})
        custom = manifest.get('apis', {}).get('custom', {})
        endpoint = custom.get('endpoint', {})
        regions = custom.get('regions', {})
        privacy_locale = manifest.get('privacyAndCompliance', {}).get('locales', {}).get('en-US', {})

        required_locale_fields = ['name', 'summary', 'description', 'examplePhrases', 'keywords', 'smallIconUri', 'largeIconUri']
        for field in required_locale_fields:
            if not locale.get(field):
                errors.append(f'skill.json en-US locale missing {field}')

        if locale.get('smallIconUri') != EXPECTED_SMALL_ICON:
            errors.append('skill.json smallIconUri does not match live Valiant asset URL')
        if locale.get('largeIconUri') != EXPECTED_LARGE_ICON:
            errors.append('skill.json largeIconUri does not match live Valiant asset URL')
        if endpoint.get('uri') != EXPECTED_ENDPOINT:
            errors.append('skill.json custom endpoint URI mismatch')
        if endpoint.get('sslCertificateType') != 'Trusted':
            errors.append('skill.json custom endpoint must use Trusted certificate')
        if regions.get('NA', {}).get('endpoint', {}).get('uri') != EXPECTED_ENDPOINT:
            errors.append('skill.json NA endpoint URI mismatch')
        if privacy_locale.get('privacyPolicyUrl') != EXPECTED_PRIVACY:
            errors.append('skill.json privacyPolicyUrl mismatch')
        if privacy_locale.get('termsOfUseUrl') != EXPECTED_TERMS:
            errors.append('skill.json termsOfUseUrl mismatch')

        model = json.loads(MODEL.read_text())
        language_model = model.get('interactionModel', {}).get('languageModel', {})
        if language_model.get('invocationName') != 'valiant garage door':
            errors.append('interaction model invocationName must be "valiant garage door"')
        intents = {intent.get('name'): intent for intent in language_model.get('intents', [])}
        for intent_name in [
            'GetEmergencyHelpIntent',
            'GetBrokenSpringAdviceIntent',
            'GetPhoneIntent',
            'GetServiceAreasIntent',
            'GetBookingIntent',
            'GetHoursIntent',
            'GetWebsiteIntent',
            'AMAZON.HelpIntent',
            'AMAZON.CancelIntent',
            'AMAZON.StopIntent',
            'AMAZON.FallbackIntent',
        ]:
            if intent_name not in intents:
                errors.append(f'interaction model missing intent {intent_name}')
        for intent_name in ['GetEmergencyHelpIntent', 'GetBrokenSpringAdviceIntent', 'GetPhoneIntent', 'GetServiceAreasIntent', 'GetBookingIntent']:
            if not intents.get(intent_name, {}).get('samples'):
                errors.append(f'interaction model intent {intent_name} must include samples')

        try:
            if png_size(SMALL_ICON) != (108, 108):
                errors.append('small Alexa icon must be 108x108 PNG')
        except Exception as exc:
            errors.append(str(exc))
        try:
            if png_size(LARGE_ICON) != (512, 512):
                errors.append('large Alexa icon must be 512x512 PNG')
        except Exception as exc:
            errors.append(str(exc))

    if errors:
        print('Alexa package validation failed:')
        for error in errors:
            print(f'- {error}')
        return 1

    print('Alexa package validation passed: manifest, interaction model, policy URLs, endpoint, and icon assets are submission-ready.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
