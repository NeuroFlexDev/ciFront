# Lernium mobile

Native React Native + Expo 58 client in the existing frontend repository. Expo Router owns all navigation. It shares the platform API, accounts and authorization; it does not embed the entire website in a WebView.

## Implemented workflows

- Owner: company dashboard, managers, personnel, positions and assignment of published regulations.
- Manager: team dashboard, employees/candidates, positions, published regulation assignment, review queue and criterion-based grading.
- Employee/candidate: assignments, materials, single/multiple/open answers, progress, results and feedback.
- All roles: password/MFA login, rotating mobile session, profile, durable notification inbox, server read state, per-category push preferences and quiet hours.
- Local answer drafts use SQLCipher with a device-only key in SecureStore. Drafts survive an expired session and are scoped by origin/company/user/version/assignment/question. Conflicts require an explicit choice; submitted responses use a stable idempotency key.

Course authoring, canvas and full operator administration remain on the web. This follows the mobile Figma annotations (mobile viewing/passing); those editors are not claimed as native features. Offline course downloads and enterprise SSO are not included in this first client. Mermaid/UML fences currently display source code, not rendered diagrams. Browser preview uses memory only for drafts/credentials and is not evidence of native encrypted persistence or push delivery.

## Design source

Figma file `mCBsEO0lXXeQTMSf7IgWEj`: notification screen `2158:73659`, learning `2126:74351`, staff dashboard `2126:72898`. Assets are copied from the web application's Figma exports. Days One / Golos Text, dark backgrounds, lime accents, rounded cards and floating navigation follow these screens. Final device visual acceptance is still required.

## Local checks

```sh
npm ci
npm run check
npx expo-doctor
npx expo export --platform all
npx expo prebuild --platform android --no-install
```

Expo Go is unsupported: SQLCipher and remote push require a development or standalone build. Never remove the `cipher_version` check or silently fall back to plaintext storage. The Android/iOS directories are generated and ignored. Native compilation/signing happens through EAS, not by hand-editing generated projects.

The client defaults to `https://dev.platform.lernium.ru`. Production is explicitly selected in `eas.json`. Only the fixed trusted HTTPS origins are accepted in release builds; a loopback test API is allowed in development builds only.

## Build and release prerequisites

1. Sign into an authorized Expo account with `npx eas-cli@latest login`. This app is already linked to [@nosignalx2k/lernium](https://expo.dev/accounts/nosignalx2k/projects/lernium), project `233a1359-9dc8-4ccf-adce-a74c0b64e44c`; do not reinitialize it or commit access tokens.
2. Android is registered as `ru.lernium.mobile` in Firebase project `lernium-mobile-233a1359`. EAS has its FCM v1 service account key and `GOOGLE_SERVICES_JSON` file secret for development/preview/production. The service account has only `roles/firebasecloudmessaging.admin`. Private keys stay outside Git and the source archive. Keep Firebase config and EAS push credentials on the same project.
3. iOS: enroll in Apple Developer, register the bundle ID, create signing/provisioning credentials and an APNs key through EAS. The owner must accept membership agreements and payments. No store memberships or purchases were made by this change.
4. Deploy the backend containing `mobile_0044`; validate migrations and PostgreSQL pgvector prerequisites first. Set a stable server encryption key and enable Expo delivery only after provider credentials are ready. Keep signing credentials/provider keys out of this repo.
5. `npx eas-cli@latest build --profile preview --platform android` creates an internal APK. For iOS development devices use the development profile/device registration; for TestFlight use the production profile with the appropriate API origin.
   `npx eas-cli@latest build --profile simulator --platform ios` validates native iOS compilation without Apple membership; its artifact is for the macOS iOS Simulator and cannot be installed on an iPhone. The root `.easignore` allows only the standalone mobile source/config/assets; use `eas build:inspect --platform android --profile preview --stage archive --output <new-directory>` to review uploads.
6. Test on physical iOS and Android devices: login/MFA, force close and reopen, airplane-mode answer preservation, duplicate submit, refresh/token expiry, four-role access, push in foreground/background/terminated state, tap after account switch, denied permission, quiet hours, revoked device and uninstall/reinstall.
7. Only after that acceptance: production build, store privacy/data-safety disclosures, review access account and submission. `eas submit` is not run automatically. Store review approval and background push delivery cannot be guaranteed.

## Verification status

Local type checking, lint, 9 auth concurrency tests, all-platform JavaScript/Hermes export, Expo Doctor (20/20) and Android prebuild have passed during implementation. GitHub CI also passed the full web suite (331 tests), native checks/export and SQLCipher prebuild. Expo/Firebase are connected and the first Android cloud build is in progress; physical-device push, iOS native compilation, visual acceptance and store submission are not yet accepted. No mobile app has been deployed to an app store.

`npm audit` has no high/critical findings after the compatible dependency overrides; remaining low findings are inherited build tooling. `markdown-it` and `linkify-it` overrides protect rendering of uploaded educational content. The Expo CLI Zod override is verified with export and prebuild.

The supplied `LICENSE.expo-template` applies to the Expo scaffold, not an authorization to relicense Lernium product code.
