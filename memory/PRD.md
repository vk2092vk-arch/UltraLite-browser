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

## Session 5 Log (2026-01) — CRITICAL FIX: True 64kbps engine via r.jina.ai proxy

User reported (after testing latest APK): UltraLite still stuck on "Loading…" forever even on full speed internet. URL bar showed "about:blank". Root cause: 2 critical bugs.

### Critical bugs found

**Bug #1 — `about:blank` infinite loop**
WebView always briefly renders "about:blank" when mounting `source={{ html, baseUrl }}`. My `onShouldStartLoadWithRequest` was treating `about:blank` as a real URL → calling `openUrl('about:blank')` → fetch failed → re-render with stub HTML containing the url → about:blank loops forever. **Fix**: explicitly skip non-http schemes from interception and reject `about:blank` at openUrl entry.

**Bug #2 — Wrong architecture for true 64kbps**
Session 3-4 used on-device fetch+strip of full HTML. But original site HTML is itself often 1-3 MB → at 64 kbps that's a 2-6 minute download BEFORE we even strip. So "Loading…" was technically correct but cripplingly slow. The ENTIRE point of Opera Mini / Facebook Basic was that the heavy lifting happens on a fast cloud server, not on the slow client.

**Fix**: Switched to `r.jina.ai` reader-proxy. Hits the proxy with the target URL, server fetches + strips + returns ~10-30 KB clean **markdown** (vs 1-3 MB original HTML). At 64 kbps that's a 1-4s load — finally rocket speed. We then convert the markdown to a styled B&W HTML page on-device with a tiny in-app markdown→HTML converter (~120 lines of regex).

### Implementation (`src/utils/ultraliteFetch.ts` rewritten)
- POST `https://r.jina.ai/{url}` → markdown body
- Markdown→HTML converter handles: headings (h1-h6), bold, italic, code, links, images→X-box, lists (ul/ol), blockquotes, hr, paragraphs, fenced code blocks
- Output HTML wrapped in B&W stylesheet (Georgia serif, black-on-white, no colors/shadows/animations)
- 12s timeout with friendly error page + "Open in Normal mode" hint
- Login URLs (Facebook/Instagram/Google accounts/etc.) bypass the proxy and use normal WebView

### UX improvement (`app/home.tsx`)
- **Removed full-screen loading overlay**. WebView now mounts INSTANTLY with a small "Fetching lite version… {url}" stub HTML, then asynchronously updates content when the proxy responds. Users always see SOMETHING immediately, never a blank "Loading…" page.
- Progress bar at top still shows during fetch.
- `about:blank` and any non-http scheme now correctly pass through `onShouldStartLoadWithRequest`.

### Files changed (Session 5)
- `/app/frontend/src/utils/ultraliteFetch.ts` (rewritten — proxy + markdown→HTML)
- `/app/frontend/app/home.tsx` (instant-stub render + about:blank guards)

---

## Session 4 Log (2026-01) — Browser UI redesign + Radio auto-unlock + Banner reliability

User reported (based on APK from Session 2 build, pre-pure-text engine):
1. UltraLite still looked like Chrome — pages loaded with full colors/images
2. Banner ads missing at bottom — no App Open, no Interstitial firing
3. Bottom nav bar taking space needed for banner — wants it merged into top
4. Radio rewarded doesn't always load → user gets stuck

### Note on UltraLite:
Session 3 code (on-device HTML fetch+strip pure-text engine) wasn't pushed yet when user tested. Session 3 engine fully addresses issue #1. This session ships it plus the UI/ad fixes below.

### Changes this session

**Browser UI redesign (`app/home.tsx`)** — bottom nav bar REMOVED, everything merged into top maroon toolbar:
- When on home: [🔍 Search or enter URL] pill (same as before)
- When browsing: `[ < ] [ 🏠 ] [ 🔄 current-url-text ]` all in a single compact row inside the maroon header
  - Back and Home icons are circular buttons on the left side (outside URL box, semi-transparent white)
  - URL pill shows reload icon on left + page title/URL text — tapping pill returns to search input mode
  - Reload icon flips to `close` while loading
- Bottom area now dedicated to banner ad — much more vertical space for it to render properly

**Radio 10-click auto-unlock (`app/radio.tsx`)** — per-station click counter:
- Each locked station tracks failed-ad attempts in an in-memory `Map<stationuuid, count>`
- If user taps a locked station and rewarded ad isn't ready: counter++ and user sees "Tries: N/10 — auto-unlock at 10"
- On 10th failed tap: station auto-unlocks for 30 min as goodwill, counter resets
- Ensures users are never stuck because of AdMob fill-rate issues

**Banner reliability (`src/components/AdBanner.native.tsx`)**
- Removed forced `minHeight: 50` — lets adaptive banner pick its own ideal size (50/90/100 px depending on device)
- White background (was gray) so banner blends cleanly with the pages
- Added `onAdFailedToLoad` auto-retry in 15s by bumping the key

### AdMob behavior notes
- App Open: AppState listener already wired in Session 3 (fires on every background→active). Note: freshly installed APK needs 2-3 mins for the first few ad requests to start filling — Google's initial cache warmup.
- Interstitial 10/15 rule already in Session 3.
- Banner IDs are production (`ca-app-pub-9675798593675825/6025593730`) with test device ID whitelisted.

## Next Action Items
1. **Click "Save to Github"** → builds fresh APK with ALL session-3+4 changes
2. Install APK, try these:
   - UltraLite + open news.google.com → should now render as pure B&W text with X-box images (NOT full color)
   - Browsing toolbar → only top bar (no bottom nav) + banner at bottom
   - Lock a radio station → tap 10 times without ad → auto-unlocks for 30 min
   - Background app → return → App Open fires

## Files changed (Session 4)
- `/app/frontend/app/home.tsx` (toolbar merge)
- `/app/frontend/app/radio.tsx` (10-click auto-unlock)
- `/app/frontend/src/components/AdBanner.native.tsx` (reliability)

---

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
- [x] Session 4: Pure-Legacy URL mapping · Indian FM roster · Global Radio Unlock (2-ad / 30-min + 10-retry network grant) · 64kbps strict cap · AAC codec preference
- [x] Session 5 (2026-02): **9-bug build #21 fixes** — Strict image/media block (injectedJavaScriptBeforeContentLoaded) · Aggressive junk-strip · New-Tab race-condition guard (openSeq) · DDG redirect unwrap · radio screen flutter (memoised renderItem + 30-s tick gated on unlock) · radio search fuzzy fallback (token-split + tag) · 15-s stream timeout · white-label "third-party radio providers" · banner ad min-height 60 + border

## Next Action Items
1. **Click "Save to Github"** → Actions auto-builds APK + AAB.
2. Download artifacts, install on real Android phone + tablet.
3. Build #21 verification:
   - UltraLite + facebook.com → mbasic.fb opens, NO images load (X-marks only)
   - UltraLite + DDG search → tapping a result opens the real article (no loop)
   - Radio → search "92.7 FM" → results appear (token-split fallback)
   - Radio → tap a known-broken station → "too slow" alert within 15 s
   - Radio → start a station → list above doesn't visibly shift
   - Radio → wait 60 s on locked screen → no flutter / re-render
   - Banner ads → visible on Home, Radio, Settings, Bookmarks, History, Downloads
   - Settings/About → no "radio-browser.info" anywhere; says "third-party radio providers"
4. Tap **New Tab** in menu while a slow page is loading → home appears, stale fetch cannot overwrite

## Files changed (Session 5)
- `/app/frontend/app/home.tsx` (Linking import added; STRICT_MEDIA_BLOCK already in place)
- `/app/frontend/app/radio.tsx` (memoised renderItem · 15-s timeout · attribution white-labeled · fixed bar height)
- `/app/frontend/app/settings.tsx` (white-label "third-party radio providers")
- `/app/frontend/app/_layout.tsx` (white-label disclaimer)
- `/app/frontend/src/services/radioBrowser.ts` (fuzzyHelper + token-split + tag fallback)
- `/app/frontend/src/state/appState.ts` (30-s tick gated on `isRadioUnlocked()`)
- `/app/frontend/src/components/AdBanner.native.tsx` (minHeight 60, border, prevents 0-height collapse)
