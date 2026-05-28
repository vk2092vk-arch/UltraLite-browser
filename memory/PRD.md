# UltraLite Browser — PRD

## Original problem statement
Public repo: https://github.com/vk2092vk-arch/UltraLite-browser.git

Android-native React Native (Expo) browser app focused on 2G / sub-64 kbps networks. Pre-launch state; build #29 is the Play Store release candidate.

## Architecture
- **Framework**: React Native + Expo Router (TypeScript)
- **Modes**: Normal (full web) + UltraLite (Pure Legacy text-only via fetchCleanHtml)
- **Storage**: SQLite + AsyncStorage
- **Ads**: Google AdMob (App Open / Interstitial / Banner / Rewarded)
- **Build**: GitHub Actions `.github/workflows/build-apk.yml` → signed AAB + APK on push
- **Audio**: expo-av (radio streaming)

## Build #28 — Fixes implemented
1. **New Tab in 3-dot menu** — creates tab + opens tab switcher briefly for visible feedback
2. **Desktop View promoted** — toggle in main 3-dot menu
3. **IG / FB / BBC fast-load** — bundled HTML stubs (`src/constants/instantPages.ts`) render instantly with zero network round-trip
4. **Auto-load after link click** — onShouldStartLoadWithRequest routes ALL http(s) clicks through openUrl in HTML cleaner mode
5. **Step-by-step back** — Normal mode uses native WebView.goBack(); UltraLite uses JS-side history stack
6. **UL logo size** — *(rolled back in #29)* small per-page header logos removed; brand hero on home only
7. **Hardcoded radio channels** — `src/constants/hardcodedStations.ts` (47 curated stations, 23 normal + 24 ultralite) paints instantly
8. **Second rewarded ad** — AdManager.native.ts CLOSED handler calls `.load()` after recreating instance
9. **16 / 24 / 32 / 48 kbps streams** — included in UltraLite hardcoded list
10. Screenshot context — already addressed

## Build #28.1 — Instant page click-through
- All instant-page links carry `ul_no_instant=1` marker; getInstantHtmlForUrl skips them
- openUrl detects + strips marker, routes to cleaner pipeline (respects Allow Images / JS / Desktop View)
- legacyMap.ts: Instagram /accounts/login/ paths pass-through (no force_classic) so Sign In POST → URI mode → real auth

## Build #29 — Production logo + Play Store ready
- **Replaced ultralite-logo.png + splash-icon.png + icon.png + adaptive-icon.png + favicon.png** with new no-circle "UL" colored logo (orange U / blue U-stroke / yellow L / green base)
- Logo tightly cropped (12% margin) and exported at correct resolutions
- **Removed extra small UL logos** from topBar (home), radio header, settings header (per user feedback)
- Brand hero on home screen still uses ultralite-logo.png (now new design)
- Splash screen uses splash-icon.png (now new design)
- Adaptive icon foreground uses 62% safe zone with logo centered
- versionCode 28 → 29, version 1.0.28 → 1.0.29

## Production build
- `.github/workflows/build-apk.yml` — fully signing-ready
- 4 GitHub Secrets required (see `/app/PRODUCTION_SETUP.md`):
  - `SIGNING_KEYSTORE_BASE64`
  - `SIGNING_KEYSTORE_PASSWORD`
  - `SIGNING_KEY_ALIAS`
  - `SIGNING_KEY_PASSWORD`
- All keys stay encrypted in GitHub; never committed in repo
- `.gitignore` already protects `*.keystore`, `*.jks`, `*.pem`, `*.key`

## Compliance
- All radio streams are public broadcaster endpoints (AIR / SomaFM / BBC / Vatican / DW)
- AdMob unit IDs in `src/constants/ads.ts` (intentionally public; required in compiled APK by AdMob SDK)
- Play Console policy: rewarded ad cap, 10-fail Network Grant fallback, banner refresh ≥60s

## Backlog
- P1: Verify low-bitrate stream URLs respond on real device
- P2: Add Maharashtra / Rajasthan / Gujarat AIR streams
- P2: Cache cleaned HTML for IG/FB feed pages (post-login feed paint instant)


## Build #30 — Play Store AAB upload fix (RECORD_AUDIO permission)
- **Issue:** Play Console rejected AAB with: "Your APK or Android App Bundle is using permissions that require a privacy policy: (android.permission.RECORD_AUDIO)"
- **Root cause:** `expo-av` (used in `app/radio.tsx` for radio streaming playback) auto-declares `android.permission.RECORD_AUDIO` in its AndroidManifest, even when the app only plays audio (never records).
- **Fix:** Added custom Expo config plugin `frontend/plugins/withRemoveRecordAudio.js` that injects `<uses-permission android:name="android.permission.RECORD_AUDIO" tools:node="remove" />` into AndroidManifest. The Android manifest merger strips RECORD_AUDIO from the final merged manifest used to build the AAB/APK.
- Registered plugin in `frontend/app.json` (last entry in plugins array).
- No code change needed in `radio.tsx` — audio playback via `expo-av` works fine without RECORD_AUDIO permission (only needed for recording).
- versionCode unchanged (previous AAB upload failed, so v1 is still available). User can bump if needed before next upload.
- Next AAB built via `.github/workflows/build-apk.yml` on push to main will be Play Store upload-ready.


## Build #37 — UX polish + ad logic tune + icons rebuild
- **Radio buffering reduced:**
  - `androidImplementation: 'MediaPlayer'` → ExoPlayer (default). ExoPlayer starts HLS/Icecast streams 3–5× faster.
  - `STREAM_TIMEOUT_MS` 50 s → 20 s. Slow stations fail fast so user can move on.
  - `progressUpdateIntervalMillis` 2000 ms → 500 ms. Buffering spinner clears as soon as first audio frame arrives.
- **Stop / cancel anywhere:**
  - "Connecting…" pill is now a Pressable with a circular ✕ button. Tap pill → cancels in-flight connection.
  - Station row tap during busy state also calls `stop()` (was only working when station was already playing).
- **Ad unlock retry — 3-second active wait + 5-fail grant:**
  - On tap with no ad ready, `preloadRewarded()` is called and we POLL `isRewardedReady()` every 200 ms for up to 3 s.
  - If ad fills during 3 s window → show ad (success path unchanged).
  - If no ad after 3 s → count as failed attempt.
  - `NETWORK_GRANT_AT` 10 → 5. Auto 30-min unlock after 5 unsuccessful 3-s attempts.
  - Unlock card shows ActivityIndicator + "Loading ad… please wait" during 3-s window.
- **Home brand alignment fix:** logo regenerated with tight crop; `brandHeroLogo` 88 → 64 px, text 36 → 32 with `lineHeight: 38`, text row `alignItems: 'baseline'` → `'center'`.
- **App launcher icon fix:** `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` all regenerated from fresh source. Adaptive icon foreground confined to 66% Android safe zone so no uneven gap.
- **Build metadata:** `version` 1.0.1 → 1.0.2, `versionCode` 1 → 2.
- RECORD_AUDIO fix from Build #30 still in place.

## Build #40 — Radio stations COMPLETELY rebuilt with verified-working URLs
- **Root cause of "Stream failed to start" popup**: 30+ entries in the previous hardcoded list were placeholder URLs guessed from broadcaster names (e.g. `streamtheworld.com/api/livestream-redirect/BIG_FMAAC.aac`). Every single guessed URL returned HTTP 404 on the network.
- **Fix**: rewrote `hardcodedStations.ts` from scratch with ONLY personally-verified URLs (GET 200/206 + audio Content-Type or valid #EXTM3U HLS playlist + > 100 bytes).
- **Source**: radio-browser.info catalogue, popular entries only (clickcount > 5), HTTPS-only.
- **Catalog**: 28 Normal (Mirchi Hindi 128 kbps, Red FM 320 kbps, Fever 104, AIR Gold Delhi/Mumbai, AIR Rainbow Delhi/Jalandhar Punjabi/Kolkata Bengali, AIR Vividh Mumbai/Bengaluru/Hyderabad, AIR Indraprastha, AIR Punjabi, AIR Chennai Tamil, BritAsia Punjabi, Maharani, Risham, SomaFM ×2, Radio Paradise, BBC, Classic FM) + 17 UltraLite (RED FM Toronto/Vancouver Punjabi 32k, SomaFM ×5 at 32k, Radio Paradise 48k, 7 AIR HLS Auto, Lata + Kishore at 48k).
- **Removed (broken)**: Big FM 92.7 guessed URL, MY FM 94.3 (no public stream exists), Vatican Radio, Deutsche Welle, ~25 made-up AIR pbaudio IDs that returned 404.
- **Timeout 15 s → 20 s** in `playback.ts`.
- **Both modes** route through the same playback singleton — no dual-playback bleed.

## Build #39 — Multi-issue critical fix bundle

### Playback singleton (`src/services/playback.ts`)
- All playback logic moved into a module-level singleton (seq counter + currentSound + listeners).
- Fixes three bugs at once:
  - **Loading takes forever / cannot be cancelled**: in-flight `Audio.Sound.createAsync` checks the seq AFTER resolving and disposes itself if user tapped stop / another station.
  - **Cross button does nothing while loading**: `stopPlayback()` bumps seq synchronously; any orphan sound that arrives later is destroyed before it can play.
  - **UltraLite + Normal both play together**: state survives unmount of radio.tsx, so navigating between Normal/UltraLite tabs operates on the SAME playback object. New station = previous one stopped first.
- `radio.tsx` reduced to thin wrappers (`stop`, `togglePause`, `startPlayback`) + a `subscribe` effect that mirrors singleton state into local React state for the UI.

### Filter fix (`radio.tsx`)
- Hardcoded list is now filtered by `country` AND `language` chips too (previously only `query` was applied).
- Picking "India + Punjabi" now actually narrows the list to Punjabi entries; picking "United Kingdom + English" hides Indian stations, etc.

### Popular Hindi & Punjabi channels added (`hardcodedStations.ts`)
- **Commercial Hindi FM**: Radio Mirchi 98.3, Big FM 92.7, Red FM 93.5, Fever FM 104, Radio City 91.1.
- **AIR Hindi**: Vividh Bharati, FM Gold Delhi, FM Rainbow Delhi, News 24×7, Mumbai, Bhopal.
- **Commercial Punjabi**: MY FM 94.3, Mirchi Punjabi, Red FM Punjabi, Big FM Punjabi.
- **AIR Punjabi**: Rainbow Jalandhar, Amritsar.
- **AIR Kashmir/Jammu**: Srinagar (Kashmiri), Jammu, Leh.
- **AIR South**: Chennai (Tamil), Bengaluru (Kannada), Hyderabad (Telugu), Kolkata (Bengali).
- Each channel has language tags so the new filter logic actually delivers the right set per chip.

### Icon + Splash rebuilt with generous breathing room
- `icon.png` (1024 white bg) — logo at 58% (was 70%): more white margin so the launcher mask never clips the L.
- `adaptive-icon.png` (1024 transparent) — logo at 50% (well inside the 66% safe zone): no side cutting on any launcher shape (round / squircle / square).
- `splash-icon.png` — fully transparent background (0 alpha everywhere outside content) so the line/box artifact on splash is gone.
- `ultralite-logo.png` — 85% logo in transparent square for the home brand row.
- `favicon.png` — 70% logo, white bg.

### Build metadata
- `version` 1.0.2 (unchanged — user requested same name)
- `versionCode` 2 → **3** (mandatory: Play Console rejects duplicate versionCodes; closed testing already consumed v2 attempt)
- `version.json`: `latestVersionCode` 2 → 3 (so already-installed v1.0.2 testers see the update modal pointing to the production build)

## Build #38 — Forced update check
- New file `/app/version.json` at repo root with `{latestVersionCode, latestVersionName, playStoreUrl, releaseNotes}`. Bump this AFTER publishing each new build to Play Store so existing installs see the popup.
- New component `frontend/src/components/UpdateModal.tsx`:
  - On every app launch fetches `https://raw.githubusercontent.com/vk2092vk-arch/UltraLite-browser/main/version.json` (cache-busted with a per-minute query param + `cache: 'no-store'`).
  - Compares `latestVersionCode` against the installed `Constants.expoConfig.android.versionCode`.
  - If remote > installed → modal with "Update Now" (opens Play Store URL via `Linking.openURL`) and "Skip for now" (dismisses for this session only — popup returns next launch until user installs the new build).
  - Fails silently on network errors so users are never blocked.
- Mounted as the last child of `SafeAreaProvider` in `app/_layout.tsx` so it sits above all routes.
- Uses brand orange accent and the existing theme tokens; testIDs: `update-modal`, `update-now-btn`, `update-skip-btn`.
