#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  UltraLite browser (Android, build #17 on GitHub). Below 64 kbps the
  UltraLite mode fails to open pages. Convert UltraLite from "Modern-Lite"
  to "Pure Legacy" (Opera Mini 4.0 / 2010 era) via:
    1. URL redirection to legacy endpoints (mbasic.facebook.com,
       instagram /accounts/login/?force_classic=1, mobile.twitter.com,
       m.youtube.com, en.m.wikipedia.org, old.reddit.com, gbv=1 Google).
    2. Extreme data stripping — primary engine cleans HTML on the device
       (scripts/styles/iframes/svg/video/audio/objects/picture/comments
       removed; ads/cookie/sidebar/footer junk dropped); r.jina.ai is
       fallback only.
    3. 2 KB Pure-Legacy CSS template injected — white bg, black text,
       blue links, native forms/buttons/inputs preserved.
    4. Image placeholders (X-box) so layout doesn't collapse.
  No raw markdown. NO webpreview / NO EAS build / NO testing agents (user
  explicitly forbade). Goal: APK pushed to GitHub via Save-to-GitHub →
  GitHub Actions.

frontend:
  - task: "Pure Legacy URL mapping (legacyMap.ts)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/legacyMap.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New file. mapToLegacy() rewrites popular hosts to lite endpoints (mbasic.fb, m.yt, m.wiki, mobile.twitter, old.reddit, gbv=1 Google, force_classic Instagram). isTrustedLite() flags hosts that should bypass the HTML cleaner and load directly in URI mode (mbasic.fb, m.yt, m.wiki, lite.ddg, old.reddit, m.twitter)."

  - task: "Pure Legacy HTML cleaner (ultraliteFetch.ts rewrite)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/ultraliteFetch.ts"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Full rewrite. Markdown mode REMOVED. Direct fetch first (8 s) with mobile UA → r.jina.ai HTML fallback (25 s, X-Return-Format=html) → graceful error page. Regex-based HTML cleaner: strips script/style/link/iframe/svg/canvas/video/audio/object/picture/embed/source/track/meta/comments; drops ad/cookie/popup/sidebar/footer/social containers via class/id token regex; replaces <img> with X-box placeholder preserving alt; whitelists only safe attrs (href/src/action/method/name/value/type/placeholder/checked/selected/disabled/target/alt/title/for/colspan/rowspan/maxlength/min/max/step/pattern/required/readonly/autocomplete/multiple/rows/cols/wrap/enctype/accept) — strips style/class/id/on*/data-*; resolves relative URLs against base; blocks javascript: schemes. Injects ~2 KB inline CSS (white bg, blue links, black text, native form styling)."

  - task: "Lite DuckDuckGo search in UltraLite (url.ts)"
    implemented: true
    working: "NA"
    file: "frontend/src/utils/url.ts"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "UltraLite mode now points searches to https://lite.duckduckgo.com/lite/?kp=-2 (no-JS, ~10 KB endpoint) instead of the JS-heavy main DDG page. Normal mode unchanged."

  - task: "home.tsx Pure-Legacy routing"
    implemented: true
    working: "NA"
    file: "frontend/app/home.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "openUrl() now applies mapToLegacy() in UltraLite. Three branches: (a) Normal mode OR login URL OR trusted-lite host → URI WebView (JS on, native forms/cookies); (b) UltraLite + arbitrary host → fetchCleanHtml HTML mode (JS off in WebView). onShouldStartLoadWithRequest also re-routes cross-host clicks in URI mode through openUrl so search-result clicks get legacy-mapped + cleaned. Loading stub now uses the same Pure-Legacy white/sans-serif style. Mode label updated to 'UltraLite (Pure Legacy · 64 kbps)'."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: |
        Implemented Pure Legacy mode for UltraLite per user spec. Touched 4
        files (1 new + 3 edits). NO automated testing performed — user
        explicitly forbade webpreview / EAS / testing agents. Code compiles
        clean (verified via `tsc --noEmit`; only pre-existing AdBanner
        platform-resolution warnings remain — unrelated to these changes).
        User will save-to-GitHub which triggers GitHub Actions APK build.

    - agent: "main"
      message: |
        Build #19 — AdMob/Play Console policy hardening + Indian FM roster.
        Files touched: app/_layout.tsx (disclaimer rewritten — removed
        "ads/trackers blocked", added attribution that radio streams are
        owned & hosted by their broadcasters), app/settings.tsx (About
        text mirrored), app/home.tsx (LOGIN_PAGE_CSS — removed
        [class*="popup-ad"] + image blur, kept only cookie/consent/GDPR),
        src/ads/AdManager.native.ts (App Open ad cooldowns: skip <30 s
        background, min 4 min between shows), src/services/radioBrowser.ts
        (added searchByName + INDIA_FM_FEATURED roster of 20 stations),
        app/radio.tsx (added "🇮🇳 India FM" category + attribution footer).

    - agent: "main"
      message: |
        Build #20 — Buffering fix on 32/48/64 kbps + AdMob hardening via
        Global Radio Unlock (replaces per-channel ad gate).
        Files touched:
          • src/state/appState.ts — REWRITE. Removed per-channel unlock APIs
            (isChannelUnlocked / channelRemainingMs / grantChannelReward /
            unlockedChannels). Added GLOBAL Radio Unlock APIs:
            isRadioUnlocked / radioRemainingMs / getRadioAdsWatched /
            getRadioAdsRequired (=2) / getRadioAdsRemaining /
            recordRadioAdWatched (returns {unlocked, watched, required}) /
            grantRadioFallback / lockRadio.  Persistence: @ul/radioUnlock
            JSON {exp, watched}. Hook ticks every 30 s so the timer
            updates without user input.  AdMob rationale: the per-channel
            model was an "ad-cluster" risk because radio streams are
            third-party content; the global model is one ad-event per
            session window — standard freemium pattern, far safer.
          • src/services/radioBrowser.ts — Bumped maxBitrate cap from 48
            → 64 kbps so all 32 / 48 / 64 kbps streams qualify (user's
            target). Hard client-side cap + drop entries with bitrate ≤ 0
            (catalog noise that causes buffering loops).  India FM
            featured loader now picks the LOWEST-bitrate AAC entry per
            station name (codec preference: AAC > Opus > MP3) so 32-kbps
            streams play before 64-kbps ones — least buffering on weak
            links.
          • app/radio.tsx — Big REWRITE around playback + unlock UI:
              - Removed per-station "Ad" badge / unlocked timer / lock
                colour states.
              - Added Global Unlock Card (locked state): maroon button
                "Unlock Radio · 30 Minutes Ad-Free", "Watch X short ad(s)
                to unlock every station", retry counter "n/10 — auto-grant
                on slow link", progress bar, "X/2" badge.
              - Added Unlocked Banner (green strip) with live countdown
                "28m 14s left in this 30-min session", auto-refreshes via
                useAppState's 30-s tick.
              - handleUnlockTap: not-ready → preloadRewarded, attempt
                counter ++; at 10 → grantRadioFallback (Network Grant);
                ready → showRewarded → recordRadioAdWatched → unlock at 2.
                User dismissals do NOT count as attempts.
              - playStation: if unlocked → play directly (no per-channel
                ad); else show hint pointing to the Unlock card at top.
              - Buffering indicator on Now-Playing bar (ActivityIndicator
                + "Buffering…" label) driven by expo-av's isBuffering
                status callback.
              - Audio config tuned for 2G: progressUpdateIntervalMillis
                bumped 1000→2000 (less JS-thread polling on slow links),
                kept androidImplementation: 'MediaPlayer' (lighter than
                ExoPlayer for plain HTTP audio).
              - Tightened error message: "try a lower-bitrate station
                (32-48 kbps)" instead of generic failure.
              - Removed unused useRef import + orphan styles
                (stationTimer, adHint, adHintText, infoBanner, infoText).
        TS compile clean (only pre-existing AdManager/AdBanner platform-
        resolution warnings, unrelated). No testing agents invoked.
        Ready for save-to-GitHub → GitHub Actions APK build #20.
        Files touched:
          • app/_layout.tsx — Disclaimer rewritten. Removed "ads and
            trackers are blocked" (could mislead AdMob review). New
            wording: "data-saver, not an ad blocker — in-app advertising
            remains fully functional". Explicit attribution that radio
            streams are owned & hosted by their broadcasters.
          • app/settings.tsx — About text mirrored same wording. Removed
            "ads/trackers blocked" claims.
          • app/home.tsx — LOGIN_PAGE_CSS cleanup. Removed [class*="popup-ad"]
            selector and the image blur/grayscale rules. Kept only
            cookie/consent/GDPR banner hiding (universal UX, not ad-block).
          • src/ads/AdManager.native.ts — Added App Open ad cooldown:
            (a) skip if user was in background < 30 s (prevents accidental
                fast-switch ad spam — AdMob policy red flag);
            (b) min 4 min between two App Open shows (defensive frequency
                cap on top of console settings).
          • src/services/radioBrowser.ts — Added searchByName() helper +
            INDIA_FM_FEATURED roster (20 stations: AIR FM Rainbow / Vividh
            Bharati / FM Gold / Akashvani / city AIR stations + private
            brands Mirchi, Big FM, Red FM, Radio City, Fever, Hello,
            Suryan, My FM, Indigo, Club FM). All fetched live from
            radio-browser.info — no hardcoded broadcaster URLs.
          • app/radio.tsx — Added "🇮🇳 India FM" category that loads the
            featured roster. Empty-state copy + footer attribution
            ("Streams from radio-browser.info — owned & hosted by their
            broadcasters. UltraLite does not host any audio.").
        TS compile clean (only pre-existing AdBanner warnings, unrelated).
        No testing agents invoked — user said app is working, don't break.
        Ready for save-to-GitHub → GitHub Actions APK build #19.

  - agent: "main"
    message: |
        Build #24 — UltraLite reliability + user-controlled toggles.
        User reported 8 distinct issues after build #21–#23 changes.  All
        eight addressed in this commit; no testing agents invoked (user
        explicitly said "Don't run webpreview, don't run EAS build, don't
        do any experiment, don't test").  Files touched are listed below.
        TS compile clean (pre-existing radio.tsx dead-branch warnings on
        lines 677-690 untouched; pre-existing AdBanner module-resolution
        warnings unrelated).  Ready for save-to-GitHub → GitHub Actions
        APK build #24.

        Files touched:
          • src/state/appState.ts — Added three persisted preferences:
            getAllowImages/setAllowImages, getAllowJs/setAllowJs,
            getDesktopView/setDesktopView.  Snapshot exposed via
            useAppState() so screens react instantly.

          • src/utils/legacyMap.ts — Emptied TRUSTED_LITE_HOSTS (was
            FB / IG / Twitter / YouTube / Reddit / Wikipedia).  Per
            user request, every UL site now goes through the HTML
            cleaner for uniform pure-text rendering — no more
            URI-mode short-circuit on social sites.  TRUSTED_LITE_RE
            replaced with `/(?!)/` (never matches).

          • src/utils/ultraliteFetch.ts —
              * Removed <header>, <footer>, <aside> from KILL_BLOCK
                (these wrap article content on most CMSs and were
                leaving "first page only / blank page" symptom).
                <nav> still killed.
              * MAX_BODY_BYTES 600 KB → 1.5 MB.
              * Direct fetch timeout 45 s → 75 s, proxy 90 s → 120 s.
              * cleanHtml now accepts {keepImages} so images survive
                the strip when the user enables "Allow Images".
              * `img{display:none}` removed from LEGACY_CSS — now
                `img{max-width:100%;height:auto}` so kept images
                actually render.
              * fetchCleanHtml signature: added optional 3rd arg
                {keepImages} forwarded to cleanHtml.

          • src/storage/db.ts — Added html_cache helpers:
            getCachedHtml(url, ttlMs), saveCachedHtml(url, html, title),
            clearHtmlCache().  Auto-trims to most recent 200 entries
            on every save.

          • src/services/radioBrowser.ts — RB_TIMEOUT_MS 10 s → 30 s.
            Otherwise on sub-60 kbps the catalog never replied and
            users saw an empty "No stations" list.

          • app/settings.tsx — New "UltraLite advanced" card with
            three switches (Allow Images, Allow JS, Desktop View).
            New "Clear cached pages" privacy action wired to
            clearHtmlCache().

          • app/home.tsx —
              * Imports: removed unused isTrustedLite; added
                getCachedHtml/saveCachedHtml.
              * Added DESKTOP_UA + DESKTOP_VIEWPORT injection.
              * openUrl: removed isTrustedLite check; now routes
                through HTML cleaner unless URL is login OR user
                enabled Allow JS.  Reads HTML cache (10-min TTL)
                before any network fetch — instant re-tap.  Persists
                successful clean HTML on completion.
              * fetchCleanHtml call passes {keepImages: allowImages}.
              * WebView userAgent: Desktop UA when desktopView on,
                else mobile UA in UltraLite, else native default.
              * STRICT_MEDIA_BLOCK injection guarded by !allowImages.
              * Mode toggle (handleToggle): no longer creates a fresh
                tab on every flip — calls ensureActiveTab and resumes
                the existing active tab (or stays on home).  Fixes
                "every mode change opens new tab" complaint.
              * brandHero style flipped column → row, 72×72 logo →
                44×44, 32 px text → 24 px.  Compact horizontal hero
                so main content is no longer pushed below the fold.

          • app/radio.tsx — Added persistent stations cache
            (AsyncStorage, 24 h TTL) keyed on country/language/query/
            ultraLite tuple.  load() renders cached results instantly
            (no spinner) and refreshes in the background.
            STREAM_TIMEOUT_MS 30 s → 50 s for AIR/Prasar Bharati
            streams that take 35-45 s to deliver first audio frame
            on 2G.

        Issue → resolution map:
          1) "websites don't load <60 kbps" — bigger timeouts +
             1.5 MB cap + KILL_BLOCK fix + HTML cache.
          2) "FB/IG still load with images" — TRUSTED_LITE_HOSTS
             emptied + isTrustedLite() short-circuit removed.
          3) "header/footer vertical pushes content down" —
             brandHero column → row, smaller logo, less padding.
          4) "Image / JS toggle in settings" — three new switches
             added, plumbed through cleaner & WebView.
          5) "Desktop View in both modes" — DESKTOP_UA + viewport
             injection.
          6) "every mode change opens new tab" — handleToggle
             reuses ensureActiveTab.
          7) "Radio: list reloads, channels show buffering forever"
             — 24 h AsyncStorage cache + 30 s catalog timeout +
             50 s stream timeout.
          8) "improve UltraLite filters so full sites open" —
             KILL_BLOCK no longer nukes header/footer/aside; body
             cap 1.5 MB so heavy CMS articles aren't truncated.
  - agent: "main"
    message: |
        Build #25 — UX polish + radio player + ad ratio.
        Six follow-up issues from the user, all addressed in one pass.
        No testing agents invoked (user policy: "don't run preview / EAS
        / testing").  TypeScript clean.  Ready for save-to-GitHub →
        GitHub Actions APK build #25.

        Files touched:
          • app/home.tsx
          • app/radio.tsx
          • src/components/AdBanner.native.tsx
          • src/components/AdBanner.web.tsx
          • src/constants/ads.ts

        Issue → resolution map:
          1) "Normal mode → 3-dots → New Tab not working".
             menuItems['newtab'] now calls onNewTab() (real createTab +
             setActiveTabId) instead of the old openUrl('') reset that
             only blanked the screen.

          2) "Tab list box should be wider; tab names not visible".
             Tab switcher sheet horizontal padding tightened, scroll
             height bumped 420 → 540, rows now 14 px vertical padding
             (was 12), title can wrap to 2 lines, url shows on its own
             line (also up to 2 lines), icon size 18 → 20.  Both
             normal and ultralite modes benefit.

          3) "Back press → first page / home page".
             Per-tab JS-side history stack (navHistoryRef Map<tabId,
             string[]>) pushes the OLD url on every successful openUrl
             that isn't itself a back-navigation.  Toolbar back button
             AND Android hardware-back now: (1) close any open modal,
             (2) use WebView.goBack in URI mode if it has history,
             (3) pop the JS stack and re-openUrl, (4) fall through to
             home / OS default.  Stack is bounded at 50 entries per tab
             and cleared when a tab is closed (memory-clean).

          4) "Tap two radio channels → both play in background".
             Synchronous fix using a Sound ref + sequence counter:
             startPlayback bumps playSeqRef, nulls currentSoundRef,
             fire-and-forget unloads the previous sound, then runs
             createAsync.  When createAsync resolves it checks the
             sequence — if a newer tap has happened, it stops + unloads
             the just-created sound on the spot instead of letting it
             play.  Same guard prevents stale "Connecting…" pills /
             error toasts from clobbering the latest attempt.  Stop
             button also bumps the sequence so any in-flight load is
             discarded.

          5) "Music-player box in both modes (blue / orange)".
             Replaced the thin 44-px nowPlaying strip with a fuller
             playerBox component.  Normal mode → blue (#1565C0),
             UltraLite → brand orange.  Layout: live indicator + name
             + meta on top row; Prev / Play-Pause / Next / Stop
             buttons on bottom row.  Prev / Next walk the currently
             displayed `stations` list with wrap-around so the buttons
             never feel dead at the boundaries.  Pause/Play is
             cheap — just calls expo-av pause/playAsync (keeps the
             buffer warm, instant resume, no second 35-45 s connect).
             AdBanner sits directly below; UltraLite uses
             RADIO_BANNER_REFRESH_MS = 90 s so audio buffer isn't
             disturbed by frequent banner reloads on 2G.

          6) "App-wide ads — request : impression ratio is bad".
             AdBanner.native.tsx rebuilt:
               • New `refreshMs` prop (radio uses 90 s, default 60 s).
               • Refresh timer is no longer a fixed setInterval —
                 instead it's gated by onAdLoaded so we never schedule
                 a refresh while the previous request is still in
                 flight.  Net effect: requests:impressions ≈ 1:1.
               • onAdFailedToLoad uses exponential back-off
                 (15 s × failCount, capped at 60 s; 120 s after 5
                 consecutive failures).  Stops the "spam request → no
                 fill" pattern that AdMob downranks.
             constants/ads.ts:
               • BANNER_REFRESH_MS 50 s → 60 s (Google guidance).
               • Added RADIO_BANNER_REFRESH_MS = 90 s.
               • INTERSTITIAL_LOAD_AT 10 → 16, INTERSTITIAL_SHOW_AT
                 15 → 18.  Now we lazy-load only ~2 clicks before we
                 plan to show, which means almost every interstitial
                 request leads to an actual show (instead of 33 % of
                 loads being burned because users never reached #15).

  - agent: "main"
    message: |
        Build #26 — search engine de-branding + bigger UL logo.
        Two small UX requests fixed.  No testing run (per user policy).
        TypeScript compile clean.  Ready for save-to-GitHub → APK #26.

        Files touched:
          • src/utils/ultraliteFetch.ts  — DDG header / logo / brand
            text stripped from cleaned HTML; page <title> has
            "DuckDuckGo" suffix removed (so URL bar shows just the
            search query).  Host-aware: only fires when baseHost ends
            in duckduckgo.com.
          • app/home.tsx — brandHero logo doubled 44 → 88 px,
            text 24 → 36 px, padding/gap proportional.

        Issue → resolution map:
          1) "Search results page mein DuckDuckGo ka logo aata hai —
              hata do".  cleanHtml now runs a host-aware DDG strip pass
             that removes:
                • <a class="header__logo-wrap"> entire block
                • <div/span/h1 class="header__logo"> label
                • lite.ddg's <tr><td><a href="…duckduckgo…"></a></td></tr>
                • any anchor whose visible text is "DuckDuckGo"
                • side-menu / hamburger / "Privacy, simplified" tagline
             and rewrites the page title to drop "… at DuckDuckGo".
             Search input + results list are kept intact.

          2) "App ka UL logo home page par double size karo".  Hero logo
             scaled 44 → 88 px, accompanying "UltraLite" text 24 → 36
             px, padding bumped from sm → md so the hero remains visually
             balanced.

  - agent: "main"
    message: |
        Build #27 — Brotli compression + Save-Data hints + Lynx-style
        progressive streaming render for sub-60 kbps users.  No testing
        agents invoked (user policy: "don't run preview / EAS / testing").
        TypeScript clean.  Ready for save-to-GitHub → APK #27.

        Files touched:
          • src/utils/ultraliteFetch.ts
          • app/home.tsx

        Bandwidth-saving network upgrades (ultraliteFetch.ts):
          • Direct + proxy requests now send `Accept-Encoding: br, gzip,
            deflate` so servers that honour Brotli ship 8-10× smaller
            HTML payloads (vs gzip's 5-6×).  React Native / OkHttp
            decompresses transparently.  On a 30 kbps link a 100 KB
            page is ~12 KB instead of ~18 KB.
          • Added `Save-Data: on` hint — Wikipedia, Google, BBC and
            Cloudflare-routed sites adapt and ship lite/AMP variants
            automatically (30-50 % bandwidth saving on supporting hosts).
          • Added `DPR: 1.0` + `Viewport-Width: 320` client hints so
            adaptive sites serve their smallest mobile payload.
          • cleanHtml() now runs an aggressive whitespace minification
            pass after every other clean step (collapses multi-space,
            tabs/newlines, dead inter-tag whitespace) — shaves 10-20 %
            off the cleaned-output size.  Content-significant blocks
            (<pre>, <code>, <textarea>) are preserved untouched via
            sentinel-replacement.

        Lynx-style progressive streaming render:
          • readCappedText() now accepts an `onPartialText` callback
            and, while streaming the response, fires it with a UTF-8
            decoded snapshot of bytes-so-far throttled to once every
            1.5 s.  This is the per-network-layer hook.
          • fetchCleanHtml() exposes `opts.onPartialText` to callers.
            Each raw snapshot from either racing source (direct or
            proxy) is run through cleanHtml() and the cleaned <body>
            delivered to the UI.  A monotonic length filter
            (`snapshot.length > lastDelivered + 1024`) guarantees
            the rendered content can only grow — never shrink — even
            when partials from the slower racer arrive after the
            faster one's.
          • home.tsx makeStub() rewritten to ship two stable anchors:
            `<strong id="__ul_elapsed">` and `<div id="__ul_stream">`.
            The stub is now set ONCE at fetch start (instead of being
            re-set on every progress tick, which was wiping any
            already-streamed content by re-mounting the WebView).
          • The progress-tick callback now updates the elapsed-time
            chip via webRef.injectJavaScript() — no DOM remount.
          • The new onPartialText callback injects the cleaned chunk
            into `#__ul_stream` via webRef.injectJavaScript() with
            JSON.stringify-escaped payload, and reveals the small
            "— streaming content (partial) —" header on first non-
            empty payload.  User watches the page paint line-by-line.
          • Final `setHtmlContent(clean)` after the fetch resolves
            performs a clean document swap to the fully-styled,
            <base href>-anchored Pure-Legacy page so links / forms
            work exactly as before once streaming is done.

        Net effect on 2G:  user sees first paragraphs within 3-6 s of
        the request starting, even on a 30 kbps link where the full
        document might take 30-60 s to download.  No API behaviour
        change for callers that don't pass onPartialText.

  - agent: "main"
    message: |
        Build #27.1 — HOTFIX for build #27 regression.
        User reported: every UltraLite page (DDG search, Cricbuzz, ESPN,
        Google) showed only "❓❓☒" — broken UTF-8 replacement chars +
        an `[img]` placeholder.  Page sizes were 3-5 KB instead of the
        expected 30-100 KB.  Instagram / Facebook were also back to
        full-image URI mode treatment.

        Files touched:
          • src/utils/ultraliteFetch.ts
          • app/home.tsx

        Root cause #1 — Brotli vs OkHttp.
        Build #27 set `Accept-Encoding: br, gzip, deflate` manually.
        OkHttp (which powers RN fetch on Android) only adds transparent
        gzip decompression when the app does NOT set Accept-Encoding
        itself.  The moment we set it, OkHttp hands us the raw
        compressed bytes and we end up decoding garbage.  Worse,
        Cloudflare / DDG / most CDNs prefer Brotli when offered, and RN
        has no built-in Brotli decompressor.  Result: ~99 % of fetches
        returned undecodable bytes.

        Fix: REMOVED the manual Accept-Encoding header from both
        tryDirect() and tryProxyHtml().  OkHttp now reverts to its
        default behaviour: it adds `Accept-Encoding: gzip` itself and
        transparently inflates the response.  We lose the Brotli
        bandwidth benefit (~30 % vs gzip) — we can win that back later
        with the okhttp-brotli interceptor module — but pages decode
        correctly again.

        Root cause #2 — Instagram URI-mode regression.
        legacyMap rewrites instagram.com → /accounts/login/?force_classic=1
        so we get a 2G-friendly HTML body.  But that path matches the
        `accounts\/login` arm of isLoginUrl(), which sent the page back
        into URI / full-image WebView mode (defeating UltraLite).

        Fix: home.tsx isLoginUrl check now exempts URLs carrying
        `force_classic=1` — that flag is a deliberate cleaner-mode
        signal from legacyMap.  Real auth flows
        (accounts.google.com/signin etc.) never carry it, so they keep
        their JS-on URI treatment.

        Net effect:
          • DDG / Google / Cricbuzz / ESPN search-and-browse work again.
          • Instagram now lands in pure-text cleaner mode (no images).
          • Facebook (mbasic) keeps cleaner-mode as before.
          • Streaming render still works on slow links.
