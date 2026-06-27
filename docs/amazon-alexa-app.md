# Amazon and Alexa App Plan for Valiant Garage Door

## Deliverable created

A custom Alexa skill package and live-site endpoint were added for Valiant Garage Door.

- Skill package: `amazon/alexa-valiant/skill-package/`
- Endpoint code: `api/alexa-valiant.js`
- Public support/how-to page: `public/amazon-alexa/index.html`
- Privacy page: `public/privacy/index.html`
- Terms page: `public/terms/index.html`

## Skill purpose

The Valiant Garage Door Alexa skill gives customers fast, voice-accessible answers for Valiant customers. The public pages also cover 800.com-powered messaging and call communications for service requests, appointment coordination, and support.

The Alexa skill gives answers for:

- Emergency garage door repair safety steps
- Broken spring warnings
- Phone number
- Service areas
- Booking/estimate URL
- Current availability instructions
- Website and support page

It intentionally does not:

- Open or close garage doors
- Diagnose a door as safe
- Collect personal information
- Process payment
- Sell in-skill products

## Amazon Developer Console next steps

ASK CLI is not installed on this machine, so submission must be done through Amazon Developer Console or after installing/configuring ASK CLI.

1. Create a new Alexa custom skill.
2. Skill name: `Valiant Garage Door`.
3. Invocation name: `valiant garage door`.
4. Endpoint: `https://www.valiantdoor.com/api/alexa-valiant`.
5. Certificate type: trusted.
6. Privacy policy URL: `https://www.valiantdoor.com/privacy`.
7. Terms of use URL: `https://www.valiantdoor.com/terms`.
8. Paste the interaction model from `amazon/alexa-valiant/skill-package/interactionModels/custom/en-US.json`.
9. Use publishing details from `amazon/alexa-valiant/skill-package/skill.json`.
10. Test the skill in the Alexa simulator.
11. Once Amazon provides the Skill ID, set `ALEXA_SKILL_ID` in Vercel and redeploy to lock the endpoint to that skill.

## Test prompts

- Alexa, open Valiant Garage Door.
- Ask Valiant Garage Door for emergency help.
- Ask Valiant Garage Door about broken springs.
- Ask Valiant Garage Door for the phone number.
- Ask Valiant Garage Door what cities they serve.
- Ask Valiant Garage Door how to book service.

## Alexa store icon assets

- Small icon: `https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-108.png`
- Large icon: `https://www.valiantdoor.com/assets/alexa/valiant-alexa-icon-512.png`

These URLs are wired into `amazon/alexa-valiant/skill-package/skill.json`.

## Local validation

Run this before Amazon submission:

```bash
python3 scripts/validate_alexa_package.py
```

Expected result: `Alexa package validation passed`.

## Upload package artifact

Generated ZIP for Amazon skill package upload or archive:

```text
amazon/alexa-valiant/dist/valiant-alexa-skill-package.zip
```

Regenerate it with:

```bash
python3 scripts/package_alexa_skill.py
```
