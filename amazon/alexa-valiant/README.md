# Valiant Garage Door Alexa Skill Package

This folder contains the deploy-ready Alexa custom skill package for Valiant Garage Door.

## What the skill does

Invocation name: `valiant garage door`

Supported customer requests:

- Emergency garage door repair safety guidance
- Broken spring safety guidance
- Valiant Garage Door phone number
- Service areas
- Booking/estimate direction
- Current availability direction
- Website and Alexa support page

The skill does not collect personal information, does not sell anything inside Alexa, and does not open, close, or control garage doors. The public support, privacy, and terms pages also cover Valiant customer calls/messages handled through 800.com-powered communications where used.

## Files

- `skill-package/skill.json` — Alexa skill manifest metadata and endpoint.
- `skill-package/interactionModels/custom/en-US.json` — voice interaction model and sample utterances.
- Website endpoint: `https://www.valiantdoor.com/api/alexa-valiant`.
- Support page: `https://www.valiantdoor.com/amazon-alexa`.
- Privacy policy: `https://www.valiantdoor.com/privacy`.
- Terms of use: `https://www.valiantdoor.com/terms`.

## Manual Amazon Developer Console setup

1. Sign in to the Amazon Developer Console.
2. Create a new Alexa custom skill named `Valiant Garage Door`.
3. Set the invocation name to `valiant garage door`.
4. Choose a custom model and HTTPS endpoint.
5. Use endpoint `https://www.valiantdoor.com/api/alexa-valiant` with a trusted certificate.
6. Paste `skill-package/interactionModels/custom/en-US.json` into the Interaction Model JSON editor and build the model.
7. Copy the publishing/privacy fields from `skill-package/skill.json` into the skill distribution settings.
8. Test these utterances:
   - `Alexa, open Valiant Garage Door`
   - `emergency garage door help`
   - `broken spring help`
   - `what is your phone number`
   - `what cities do you serve`

## Optional security lock

After Amazon creates the skill, set this Vercel environment variable to restrict endpoint calls to that Alexa skill only:

```env
ALEXA_SKILL_ID=amzn1.ask.skill.your-skill-id
```

Without `ALEXA_SKILL_ID`, the endpoint accepts Alexa-formatted POST bodies for testing.

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
