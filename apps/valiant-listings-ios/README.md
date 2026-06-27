# Valiant Listings iOS App

Native iPhone app for the private Valiant Garage Door listings control center.

## What this app is

This is a real iOS app project, not a PWA. It uses SwiftUI plus `WKWebView` to load the private listings control center at:

```text
https://www.valiantdoor.com/listings-admin
```

The private API remains protected by `LISTINGS_ADMIN_TOKEN`; the app does not hard-code or ship that token.

## App details

- App name: `Valiant Listings`
- Bundle ID: `com.valiantdoor.listings`
- Minimum iOS: 17.0
- Project: `ValiantListings.xcodeproj`
- Main endpoint: `https://www.valiantdoor.com/listings-admin`

## Build locally

Requires full Xcode selected, not only Command Line Tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
open apps/valiant-listings-ios/ValiantListings.xcodeproj
```

Then select the `ValiantListings` scheme and run on an iPhone simulator or your physical iPhone.

## Install on your iPhone

For direct device install, you need one of these:

1. Xcode with an Apple ID/team selected for signing.
2. Apple Developer Program membership for TestFlight/App Store distribution.
3. A local developer profile if you only want to run it on your own phone from Xcode.

Set your Apple Team in Xcode under Signing & Capabilities before building for a physical phone.
