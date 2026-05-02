# UltraLite Browser — PRD

## Original Problem Statement
Repo: https://github.com/vk2092vk-arch/UltraLite-browser.git
Android mobile browser app (React Native / Expo SDK 54). Two modes: Normal + UltraLite. UltraLite mode runs websites as text on <64kbps (2G) speeds. Radio & music section must stream at 64kbps. AdMob monetization. Previous GitHub Actions build was failing at CMake. Strictly avoid web-preview and EAS build. Don't break existing working behavior.

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- expo-router · react-native-webview · expo-av · expo-sqlite · expo-file-system 19
- react-native-google-mobile-ads 16.3.3
- react-native-reanimated 4.1.1 + react-native-worklets 0.8.1 (new arch)
- CI: GitHub Actions → APK + AAB artifacts

## Core Requirements (static)
- Browser with two modes (Normal / UltraLite true pure-text)
- Strict SafeSearch for all search queries
- Radio / Music (radio-browser.info directory, ≤ 48 kbps for 2G)
- AdMob: App-Open (on foreground), Banner (per screen), Interstitial (10/15), Rewarded (per-channel)
- Android tablet + landscape support
- Local-only storage (SQLite + AsyncStorage) — no server
- AdMob & Play Store policy compliance
- Per-channel radio favorites

## Session 3 Log (2026-01) — Pure-Text Engine + Favorites + History UX

User reported: "UltraLite and Chrome looked identical, images blurred wasn't enough". Requested true Opera-Mini-grade on-device rendering + many UI/feature upgrades.

### Changes

**UltraLite Engine — TRUE Pure-Text mode (new `src/utils/ultraliteFetch.ts`)**
- For non-login URLs: RN `fetch()` (no CORS) → strip `<script>/<style>/<iframe>/<video>/<audio>/<canvas>/<svg>/<picture>/<link>/<object>` → replace every `<img>` with empty X-box span → strip all inline event handlers and `style=""` attrs → inject B&W serif-font CSS via `<base href>` + `<style>` → render via `WebView source={{ html, baseUrl }}`.
- `javaScriptEnabled={false}` for these HTML-rendered pages — literally zero scripts load, no ads/trackers/analytics possible.
- For login URLs (detected via regex covering `/login`, `/signin`, `accounts.google.com`, `m.facebook.com/login`, `instagram.com/accounts/*`, `/auth`, `/oauth`, `/sso`, etc.): fall back to normal WebView with JS on + light CSS injection to hide cookie/GDPR popups and blur large images — so Facebook/Instagram login keeps working.
- Mobile Chrome UA → sites serve lightweight mobile builds.
- Sub-navigation intercept: clicking links in pure-text mode re-triggers fetch+filter (no WebView navigation).
- 12s timeout + friendly error page with "Open in Normal Mode" hint.

**Home screen redesign (`app/home.tsx`)**
- History card REMOVED from home (still accessible from menu → History).
- New **Top Apps grid** (4 × N) replaces it — 10 defaults seeded on first run (Instagram, Facebook, YouTube, Google, News, Wikipedia, X, Reddit, ESPN, Gmail). Icons from Google favicon service. Long-press any tile → confirm → delete. "+" tile opens modal to add custom name+URL.
- Normal mode: white body, maroon header only (no gray surfaces on home cards). UltraLite mode keeps current look.
- Pure-text loading overlay with progress bar + "Stripping ads & heavy content for 2G…" message.

**Radio features (`app/radio.tsx` + service + db)**
- **Heart icon on every station** → toggle favorite → saved in SQLite `radio_favorites`.
- New **Favorites category** (first tab, red ❤ label) — data from local DB only, works offline.
- New **India regional** filter row in filters sheet — tags: Punjab, J&K, Bollywood, Bhajan, Tamil/Telugu/Kannada/Malayalam/Marathi/Bengali/Gujarati/Assamese/Odia/Haryanvi/Rajasthani.
- **Stricter bitrate** cap: 24–48 kbps (was 32–64) for real 2G performance, with client-side re-filter.
- Android `MediaPlayer` implementation (better buffer for low-bandwidth) + 1-second progress interval.
- Expanded COUNTRIES list: India, Pakistan, Bangladesh, Nepal, Sri Lanka, UAE, Saudi Arabia, + existing.
- Expanded LANGUAGES: Hindi, Punjabi, Kashmiri, Urdu, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati + existing.

**AdMob logic updates (`src/constants/ads.ts` + `AdManager.native.ts`)**
- Interstitial: **load at 10 clicks, show at 15 clicks** (per user).
- App Open: strict `AppState` listener — on every `background → active` transition, if ready → show; if not → preload for next time. Cold start skipped (splash handles that).
- Splash time reduced to ~2s; `initAds()` + `preloadAppOpen()` now fire in parallel with `hydrate()`.

**History redesign (`app/history.tsx`)**
- Grouped sections: **Today / Yesterday / Older** with per-group count badges.
- **Long-press any item → enters multi-select mode** → tap to toggle, maroon checkmark indicator, "N selected" header with close + trash buttons.
- "Clear all" still available in non-select mode.

**Settings copy cleanup (`app/settings.tsx`)**
- Removed all "Opera Mini" / Facebook Basic / r.jina.ai / DuckDuckGo brand mentions.
- Rewrote About section to describe the new on-device pure-text engine without copyrighted names.

**DB schema additions (`src/storage/db.ts`)**
- `shortcuts(id, name, url, icon, order_idx, created_at)` — seeded with 10 defaults on first run.
- `radio_favorites(uuid, name, country, language, bitrate, codec, url, url_resolved, created_at)`.
- New helper `removeHistoryByIds(ids[])` for multi-select delete.

## What's been implemented (cumulative)
- [x] Session 1: Build fix (worklets 0.8.1) · tablet/landscape · per-channel rewarded · banners per screen
- [x] Session 2: Initial data-saver (blur/ad-block) · Downloads feature · chip text fix
- [x] Session 3: **True pure-text engine** · **radio favorites + regional India** · **home apps grid** · **history by date + multi-select** · **interstitial 10/15** · **AppState-driven App Open** · Opera Mini branding removed

## Next Action Items
1. **Click "Save to Github"** → Actions auto-builds APK + AAB.
2. Download artifacts, install on real Android phone + tablet.
3. Real-device tests:
   - Open any news site in UltraLite → should render as plain B&W text with X-boxes instead of images, ads/banners gone
   - Open instagram.com in UltraLite → detects login, shows proper login form (not raw markdown anymore)
   - Home → long-press Instagram tile → Delete works
   - Home → tap "+" → add "Quora" / `quora.com` → new tile appears
   - Radio → tap ❤ on 3 stations → switch to "❤ Favs" tab → all 3 appear offline
   - Radio filters → scroll to "India regional" → tap "Punjab / Punjabi" → list updates
   - History → long-press an item → multi-select N items → trash icon → confirm → gone
   - Background app → return → App Open ad fires reliably

## Files changed (Session 3)
- `/app/frontend/app/home.tsx` (full rewrite)
- `/app/frontend/app/radio.tsx` (favorites + region)
- `/app/frontend/app/history.tsx` (full rewrite)
- `/app/frontend/app/settings.tsx` (copy cleanup)
- `/app/frontend/app/index.tsx` (splash timing)
- `/app/frontend/src/utils/ultraliteFetch.ts` (NEW — engine)
- `/app/frontend/src/storage/db.ts` (shortcuts + favorites tables)
- `/app/frontend/src/services/radioBrowser.ts` (searchByTag + regional tags + strict bitrate)
- `/app/frontend/src/constants/ads.ts` (10/15 rule)
- `/app/frontend/src/ads/AdManager.native.ts` (AppState listener)
