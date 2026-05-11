// Build #28 — Bundled "fast-path" HTML for popular destinations.
//
// User feedback: "Instagram, Facebook, BBC website ko light aur clean
// karo taaki yeh bahut jaldi load ho jaye. Insta FB aur login page ko
// hard-coded karo jo app me jaldi load ho ya background me auto download
// hokar app me rahe taaki UltraLite mode me zyada time na lage."
//
// Build #28.1 — sub-page navigation fix.
//   The first build returned the same instant page for every URL on
//   the same host (instagram.com / facebook.com / bbc.com), so any
//   tap on a link inside the instant page silently re-rendered the
//   same screen — clicks looked dead.  Every navigation link now
//   carries an internal `ul_no_instant=1` marker.  When openUrl()
//   sees that marker, getInstantHtmlForUrl() returns null and the
//   regular UltraLite cleaner pipeline takes over so the next page
//   loads as a 2G-friendly cleaned text page (subject to the user's
//   "Allow Images" / "Allow JavaScript" / "Desktop View" toggles).
//
// Strategy:
//   • Each entry below ships with a fully-styled, pure-text HTML page
//     that renders instantly the moment the user taps the tile.
//     Zero network round-trip, zero parsing — just `setHtmlContent(stub)`.
//   • Every link inside an instant page is tagged with
//     `ul_no_instant=1` so subsequent navigations skip the instant
//     fast-path and run through the normal cleaner — the user can
//     freely browse onto Instagram's lite portal, mbasic.facebook.com
//     sub-pages, or any BBC News article without getting trapped.
//   • Form actions (Log In POST endpoints) stay UNMARKED so isLoginUrl
//     in home.tsx routes them through full-JS URI mode — which is the
//     only way authentication can complete.
//   • Bandwidth: each stub is < 4 KB so the entire bundle costs nothing
//     extra in the APK.

const LITE_CSS = `
*{transition:none!important;animation:none!important;}
html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.45;}
body{padding:10px;max-width:100%;word-wrap:break-word;}
a,a:link{color:#0a58ca;text-decoration:underline;}
a:visited{color:#6f42c1;}
h1,h2,h3{margin:8px 0 4px;font-weight:700;line-height:1.2;}
h1{font-size:22px;}h2{font-size:19px;}h3{font-size:17px;}
.brand{display:inline-block;padding:8px 14px;border-radius:6px;font-weight:800;font-size:18px;color:#fff;text-decoration:none;}
.brand-ig{background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);}
.brand-fb{background:#1877F2;}
.brand-bbc{background:#bb1919;}
.card{border:1px solid #ccc;border-radius:8px;padding:12px;margin:10px 0;background:#fafafa;}
.btn{display:inline-block;padding:10px 14px;border:1px solid #888;background:#eee;color:#000;text-decoration:none;border-radius:4px;font-weight:600;margin:4px 6px 4px 0;}
.btn-primary{background:#0a58ca;border-color:#0a58ca;color:#fff;}
input[type=text],input[type=email],input[type=password],input[type=tel]{display:block;width:100%;box-sizing:border-box;padding:10px;border:1px solid #888;border-radius:4px;font-size:16px;margin:6px 0;}
.muted{color:#666;font-size:13px;}
ul{padding-left:20px;}
li{margin:4px 0;}
form{margin:10px 0;}
.tag{display:inline-block;font-size:11px;padding:2px 6px;border-radius:3px;background:#e8f4ea;color:#1f6f3b;font-weight:700;margin-left:6px;vertical-align:middle;}
hr{border:0;border-top:1px solid #ddd;margin:10px 0;}
.hint{background:#fff8e1;border-left:4px solid #f0b400;padding:8px 10px;margin:10px 0;font-size:14px;}
`;

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>${LITE_CSS}</style>
</head><body>${body}</body></html>`;
}

// Internal marker query param appended to every navigation link inside
// the instant pages.  When openUrl() sees this, it skips the instant
// fast-path and routes the URL through the normal UltraLite cleaner.
const M = 'ul_no_instant=1';

// ──────────────────────────────────────────────────────────────────────
//  INSTAGRAM (login + classic mobile portal)
// ──────────────────────────────────────────────────────────────────────
const INSTAGRAM_HTML = shell(
  'Instagram · UltraLite',
  `<div style="text-align:center;margin:8px 0;">
    <span class="brand brand-ig">Instagram</span>
    <span class="tag">Lite Mode</span>
  </div>
  <div class="card">
    <h2 style="margin-top:0;">Sign in</h2>
    <form action="https://www.instagram.com/accounts/login/" method="post" accept-charset="utf-8">
      <input type="text" name="username" placeholder="Phone number, username or email" autocomplete="username" autocapitalize="none">
      <input type="password" name="password" placeholder="Password" autocomplete="current-password">
      <button class="btn btn-primary" type="submit" style="width:100%;padding:12px;font-size:16px;">Log In</button>
    </form>
    <p class="muted" style="text-align:center;margin-top:6px;">
      <a href="https://www.instagram.com/accounts/password/reset/?force_classic=1&${M}">Forgot password?</a>
    </p>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">Open Instagram</h3>
    <a class="btn" href="https://www.instagram.com/accounts/login/?force_classic=1&${M}">Classic mobile (lite)</a>
    <a class="btn" href="https://www.instagram.com/explore/?force_classic=1&${M}">Explore</a>
    <a class="btn" href="https://www.instagram.com/accounts/emailsignup/?force_classic=1&${M}">Create account</a>
  </div>
  <div class="hint">
    UltraLite shows a pure-text version. Sign in here to open your feed in
    Instagram's classic mobile mode (works on 64 kbps).
  </div>
  <p class="muted" style="text-align:center;">
    UltraLite Browser · Pure Legacy mode · no scripts, no images, no tracking.
  </p>`
);

// ──────────────────────────────────────────────────────────────────────
//  FACEBOOK (mbasic — text-only sign-in shell)
// ──────────────────────────────────────────────────────────────────────
const FACEBOOK_HTML = shell(
  'Facebook · UltraLite',
  `<div style="text-align:center;margin:8px 0;">
    <span class="brand brand-fb">facebook</span>
    <span class="tag">mbasic · Lite</span>
  </div>
  <div class="card">
    <h2 style="margin-top:0;">Log in</h2>
    <form action="https://mbasic.facebook.com/login/" method="post" accept-charset="utf-8">
      <input type="text" name="email" placeholder="Email or phone" autocomplete="username" autocapitalize="none">
      <input type="password" name="pass" placeholder="Password" autocomplete="current-password">
      <button class="btn btn-primary" type="submit" style="width:100%;padding:12px;font-size:16px;">Log In</button>
    </form>
    <p class="muted" style="text-align:center;margin-top:6px;">
      <a href="https://mbasic.facebook.com/recover/initiate/?${M}">Forgotten password?</a>
    </p>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">Open Facebook</h3>
    <a class="btn" href="https://mbasic.facebook.com/?${M}">mbasic Home</a>
    <a class="btn" href="https://mbasic.facebook.com/messages/?${M}">Messenger</a>
    <a class="btn" href="https://mbasic.facebook.com/notifications.php?${M}">Notifications</a>
    <a class="btn" href="https://mbasic.facebook.com/r.php?${M}">Create account</a>
  </div>
  <div class="hint">
    UltraLite routes Facebook through <strong>mbasic.facebook.com</strong> —
    Facebook's official 2G-friendly portal. Pages average 30-50 KB and
    open in 2-3 seconds on 64 kbps.
  </div>
  <p class="muted" style="text-align:center;">
    UltraLite Browser · Pure Legacy mode · no scripts, no images, no tracking.
  </p>`
);

// ──────────────────────────────────────────────────────────────────────
//  BBC NEWS (mobile lite portal)
// ──────────────────────────────────────────────────────────────────────
const BBC_HTML = shell(
  'BBC News · UltraLite',
  `<div style="text-align:center;margin:8px 0;">
    <span class="brand brand-bbc">BBC NEWS</span>
    <span class="tag">Lite</span>
  </div>
  <div class="card">
    <h2 style="margin-top:0;">Top sections</h2>
    <ul>
      <li><a href="https://www.bbc.com/news?${M}">Front page (mobile)</a></li>
      <li><a href="https://www.bbc.com/news/world?${M}">World</a></li>
      <li><a href="https://www.bbc.com/news/uk?${M}">UK</a></li>
      <li><a href="https://www.bbc.com/news/world/asia/india?${M}">India</a></li>
      <li><a href="https://www.bbc.com/news/business?${M}">Business</a></li>
      <li><a href="https://www.bbc.com/news/technology?${M}">Technology</a></li>
      <li><a href="https://www.bbc.com/news/science_and_environment?${M}">Science &amp; Environment</a></li>
      <li><a href="https://www.bbc.com/news/health?${M}">Health</a></li>
      <li><a href="https://www.bbc.com/sport?${M}">Sport</a></li>
      <li><a href="https://www.bbc.com/weather?${M}">Weather</a></li>
    </ul>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">Languages</h3>
    <a class="btn" href="https://www.bbc.com/hindi?${M}">हिन्दी</a>
    <a class="btn" href="https://www.bbc.com/punjabi?${M}">ਪੰਜਾਬੀ</a>
    <a class="btn" href="https://www.bbc.com/urdu?${M}">اردو</a>
    <a class="btn" href="https://www.bbc.com/tamil?${M}">தமிழ்</a>
    <a class="btn" href="https://www.bbc.com/news?${M}">English</a>
  </div>
  <div class="card">
    <h3 style="margin-top:0;">BBC Live</h3>
    <a class="btn" href="https://www.bbc.com/news/live?${M}">Live news</a>
    <a class="btn" href="https://www.bbc.com/sport/live?${M}">Live sport</a>
    <a class="btn" href="https://www.bbc.com/news/world_radio_and_tv?${M}">World Radio &amp; TV</a>
  </div>
  <div class="hint">
    UltraLite delivers BBC stories as pure text — typical article size is
    40-80 KB. Tap any heading above to fetch the cleaned full story.
  </div>
  <p class="muted" style="text-align:center;">
    UltraLite Browser · Pure Legacy mode · no scripts, no images, no tracking.
  </p>`
);

// ──────────────────────────────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * If the requested URL is one of the three "fast-path" destinations
 * (Instagram, Facebook, BBC News), return a fully-styled HTML stub
 * that can be rendered IMMEDIATELY without any network call.  Returns
 * null otherwise so the caller can fall through to the regular
 * UltraLite cleaner pipeline.
 *
 * Build #28.1 — when the URL carries the internal `ul_no_instant=1`
 * marker (added to every link inside an instant page), we always
 * return null so the normal cleaner can fetch the actual sub-page.
 * This is what makes click-through navigation from an instant page
 * actually load the target instead of looping back to itself.
 */
export function getInstantHtmlForUrl(url: string): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // Skip if the URL was generated by an instant-page link click.
  if (parsed.searchParams.get('ul_no_instant') === '1') return null;

  const host = parsed.hostname.toLowerCase();
  // Strip leading "www." / "m." / "mbasic." for matching.
  const base = host.replace(/^(www\.|m\.|mbasic\.|web\.)/, '');
  const path = parsed.pathname || '/';

  // Instagram: instant page only on root + the legacy-mapped login
  // landing.  Any other path (explore, profile, /accounts/emailsignup
  // etc.) skips the instant page so the cleaner can fetch it fresh.
  if (base === 'instagram.com') {
    if (path === '/' || path === '') return INSTAGRAM_HTML;
    if (
      (path === '/accounts/login/' || path === '/accounts/login') &&
      parsed.searchParams.get('force_classic') === '1' &&
      !parsed.searchParams.has('username') &&
      !parsed.searchParams.has('password')
    ) {
      return INSTAGRAM_HTML;
    }
    return null;
  }

  // Facebook: instant page only on root.  Any sub-path goes to cleaner.
  if (base === 'facebook.com' || base === 'fb.com') {
    if (path === '/' || path === '') return FACEBOOK_HTML;
    return null;
  }

  // BBC: instant page only on bbc.com root + the bare /news landing.
  if (base === 'bbc.com' || base === 'bbc.co.uk') {
    if (path === '/' || path === '' || path === '/news' || path === '/news/') {
      return BBC_HTML;
    }
    return null;
  }
  return null;
}

/** True if a URL has an instant-render stub available (skip cleaner). */
export function hasInstantHtml(url: string): boolean {
  return getInstantHtmlForUrl(url) !== null;
}

/**
 * Strip the internal `ul_no_instant` marker from a URL before sending
 * it on the wire to the broadcaster.  Most sites ignore unknown query
 * params but we strip defensively so URL-bar text and history entries
 * stay clean.
 */
export function stripInternalMarkers(url: string): string {
  if (!url || !url.includes('ul_no_instant')) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('ul_no_instant');
    const s = u.searchParams.toString();
    return `${u.protocol}//${u.host}${u.pathname}${s ? '?' + s : ''}${u.hash}`;
  } catch {
    return url;
  }
}
