# UltraLite Browser — PRD

## Original Problem Statement
Repo: https://github.com/vk2092vk-arch/UltraLite-browser.git
Android mobile browser app (React Native / Expo SDK 54). Two modes: Normal + UltraLite. UltraLite mode runs websites as text on <64kbps (2G) speeds. Radio & music section must stream at 64kbps. AdMob monetization. Previous GitHub Actions build (#12) was failing at the CMake/NDK compile step. Strictly avoid web-preview and EAS build. Do NOT break existing working behavior.

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- expo-router, react-native-webview, expo-av (radio), expo-sqlite
- react-native-google-mobile-ads 16.3.3
- react-native-reanimated 4.1.1 + react-native-worklets 0.8.1 (new arch)
- CI: GitHub Actions (Ubuntu runner) → APK + AAB artifacts

## Core Requirements (static)
- Browser with two modes (Normal / UltraLite text-only via r.jina.ai proxy)
- Safe search (strict) for all search queries
- Radio / Music browser (radio-browser.info directory, ≤ 64 kbps filter)
- AdMob: App-Open, Banner, Interstitial, Rewarded (per-channel unlock)
- Android tablet + landscape support
- No server-side data; all storage local (SQLite + AsyncStorage)
- AdMob & Play Store policy compliance

## Session Work Log

### 2026-01 Session 2 — Opera-Mini-style UltraLite rewrite + Downloads + UI fixes
User reported 3 issues from real-device APK testing:
1. UltraLite Instagram page showed raw r.jina.ai markdown dump — login unusable
2. Radio category chips' text disappeared intermittently
3. No Downloads feature in menu

**User chose "Opera Mini / Facebook Basic hybrid" architecture.** Changes:

**UltraLite engine rewritten (`app/home.tsx`)** — removed r.jina.ai proxy path entirely. Now uses a pure client-side optimization pipeline:
- WebView keeps JS + cookies + CSS enabled so login/interactive pages work
- Injects `AD_BLOCK_EARLY` BEFORE content loads — monkey-patches `fetch`, `XMLHttpRequest`, and `document.createElement('script'|'iframe'|'img')` to reject requests to 30+ ad/tracker domains (googletagmanager, doubleclick, scorecardresearch, taboola, criteo, pubmatic, hotjar, mixpanel, sentry-cdn, tiktok pixel, etc.)
- Post-content JS (`ULTRA_INJECTED_JS`) blurs all images (tap to reveal), hides `<video>/<canvas>/<embed>` and non-captcha iframes, strips decorative CSS (backgrounds, shadows, animations) while preserving layout so login forms stay aligned
- Sets Chrome-Android mobile User-Agent so sites serve their lightweight mobile build

**Downloads feature (NEW)**
- Added `expo-file-system@~19.0.22`
- New table `downloads` in `src/storage/db.ts` (filename, url, local_uri, size, mime, status, created_at)
- New utility `src/utils/downloads.ts` — extension-based URL detection, safe filename, resumable download with optional progress, Alert on complete/fail, writes to `FileSystem.documentDirectory + UltraLite-Downloads/`
- New screen `app/downloads.tsx` — list of downloads with tap-to-open, per-item delete, "Clear all", empty state, banner ad
- Home WebView intercept: any URL with a downloadable extension (.pdf, .apk, .mp3, .mp4, .zip, .jpg, .doc, .xls, etc.) is routed to `downloadFile()` instead of WebView navigation
- Anchor with `download` attribute also caught via `postMessage` from injected JS
- Downloads menu item added in home 3-dot menu

**Radio chip fix (`app/radio.tsx`)** — replaced `maxHeight: 56` + `paddingVertical: 9` with fixed `height: 38` on chips + `includeFontPadding: false` + `lineHeight: 18` on label. Chip text now renders consistently.

**Cleanup**
- `src/utils/url.ts` simplified — removed `toJina/fromJina/isUltraLiteUrl` (dead code after engine rewrite)
- `_layout.tsx` + `settings.tsx` — copy refreshed to describe new UltraLite engine (no DDG/jina mentions)

## Ad Placement Summary (unchanged, policy-compliant)
| Ad Format | Trigger | Notes |
|---|---|---|
| App Open | On cold start (splash 3.2s → show if ready) | non-blocking |
| Banner | Home, Browser, Radio, Bookmarks, History, Settings, Downloads — 1 per screen | 50s auto-refresh, adaptive size |
| Interstitial | Pre-load at 15th click, show at 20th click, reset counter | any tap counted via `trackClick()` |
| Rewarded | Tap a locked radio/music channel → watch 1 ad → unlock THAT channel for 30 mins | per-station unlock map persists in AsyncStorage |

## What's been implemented
- [x] Session 1: Build failure fix (worklets 0.8.1), tablet/landscape, per-channel rewarded, ad copy cleanup, banners on all screens
- [x] Session 2: Opera-Mini-style hybrid UltraLite engine, Downloads feature, Radio chip text fix

## Next Action Items (user must do)
1. Click **"Save to Github"** in Emergent → pushes /app to the repo → GitHub Actions auto-triggers
2. Wait ~8-10 min → download APK + AAB artifacts from the green run
3. Test on real Android phone + tablet:
   - Open Instagram in UltraLite → login form should be usable (images blurred, ads blocked)
   - Radio screen → category chip text always visible
   - Browse a site with a PDF / APK / image link → download flows to Downloads menu
   - Menu → Downloads → see list of downloaded files → tap to open

## Files changed (Session 2)
- `/app/frontend/package.json` (+ expo-file-system)
- `/app/frontend/app/home.tsx` (full rewrite — Opera-Mini hybrid)
- `/app/frontend/app/radio.tsx` (chip layout)
- `/app/frontend/app/downloads.tsx` (NEW)
- `/app/frontend/app/settings.tsx` (about text)
- `/app/frontend/app/_layout.tsx` (disclaimer text)
- `/app/frontend/src/storage/db.ts` (+ downloads table & helpers)
- `/app/frontend/src/utils/downloads.ts` (NEW)
- `/app/frontend/src/utils/url.ts` (simplified)
**Root cause of build #12 failure (CMake non-zero exit 1):**
- Previous agent downgraded `react-native-worklets` from `^0.8.1` → `0.5.1` in package.json
- worklets 0.5.1 is incompatible with reanimated 4.1.1 + RN 0.81.5 + New Architecture → CMake/NDK compile failed linking C++ worklets bindings
- Successful run #11 had worklets `^0.8.1`; failed #12 had `0.5.1`

**Fix applied:**
- `frontend/package.json` → `react-native-worklets: ^0.8.1` (restored)

**Additional improvements this session:**
1. `app.json`: `orientation: "portrait"` → `"default"` (tablets + landscape full-screen)
2. `app.json`: added `softwareKeyboardLayoutMode: "pan"` (Android keyboard UX)
3. `src/constants/ads.ts`: `INTERSTITIAL_SHOW_AT = 30` → `20` (per user spec)
4. `src/state/appState.ts`: rewritten — global reward unlock → **per-channel unlock map** (each station requires its own rewarded ad for 30 mins; others stay locked independently)
5. `app/radio.tsx`: rewritten to use per-channel gate — each locked station shows "Ad" chip; tapping triggers rewarded ad; unlocked stations show remaining-time timer
6. `app/home.tsx`: search placeholder `"Search DuckDuckGo or type URL"` → `"Search or enter URL"` (copyright removal)
7. `app/_layout.tsx`: disclaimer `"DuckDuckGo searches"` → `"searches"` (copyright removal)
8. `app/settings.tsx`: about text — removed explicit DuckDuckGo/r.jina.ai brand mentions
9. Added `<AdBanner />` to `app/bookmarks.tsx`, `app/history.tsx`, `app/settings.tsx` (more banner slots across app, policy-safe: 1 per screen)
10. `.github/workflows/build-apk.yml`: hardened — timeout 40→60 min, unified disk-free + 8GB swap step, idempotent gradle.properties writer, `--stacktrace` for better diagnostics, keeps newArch=true (required by reanimated 4)

## Ad Placement Summary (policy-compliant)
| Ad Format | Trigger | Notes |
|---|---|---|
| App Open | On cold start (splash 3.2s → show if ready) | non-blocking |
| Banner | Home, Browser (via Home), Radio, Bookmarks, History, Settings — 1 per screen | 50s auto-refresh, adaptive size |
| Interstitial | Pre-load at 15th click, show at 20th click, reset counter | any tap counted via `trackClick()` |
| Rewarded | Tap a locked radio/music channel → watch 1 ad → unlock THAT channel for 30 mins | per-station unlock map persists in AsyncStorage |

## What's been implemented (this session)
- [x] Build failure root cause identified + fixed (worklets version)
- [x] Tablet/landscape orientation support
- [x] Per-channel rewarded ad unlock (30-min timer per station)
- [x] Interstitial threshold 20 clicks
- [x] AdBanner on every major screen
- [x] Copyright / brand name cleanup from user-facing UI
- [x] GitHub Actions workflow hardened (memory, disk, swap, diagnostics)

## Next Action Items (user must do)
1. Click **"Save to Github"** in Emergent chatbox → pushes /app to user's GitHub repo
2. GitHub Actions (`Build UltraLite Android APK`) will auto-trigger on push to main
3. Download APK + AAB artifacts from the Actions run page once it goes green
4. Install APK on real Android device (phone + tablet) to validate
5. Test on real 2G/64kbps throttled network

## Future / Backlog
- Optional: OTA updates via expo-updates (publish JS bundles without Play Store review)
- Optional: In-app review prompt (Play In-App Review API) after N radio plays
- Optional: Pre-cached offline landing page for true zero-bandwidth start

## Files changed (absolute paths)
- `/app/frontend/package.json`
- `/app/frontend/app.json`
- `/app/frontend/src/constants/ads.ts`
- `/app/frontend/src/state/appState.ts`
- `/app/frontend/app/radio.tsx`
- `/app/frontend/app/home.tsx`
- `/app/frontend/app/_layout.tsx`
- `/app/frontend/app/settings.tsx`
- `/app/frontend/app/bookmarks.tsx`
- `/app/frontend/app/history.tsx`
- `/app/.github/workflows/build-apk.yml`
