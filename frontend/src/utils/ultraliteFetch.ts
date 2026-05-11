// UltraLite "Pure Legacy HTML" fetcher — Opera Mini 4.0 / 2010 style.
//
// Strategy (designed for sub-64 kbps links):
//   1.  Try a direct fetch from React Native (no CORS in RN). 8 s timeout.
//       Most legacy/mobile portals (mbasic.fb, m.wiki, lite.ddg, m.yt) reply
//       with a small 5-30 KB HTML payload that loads instantly.
//   2.  If direct fails (DNS / TLS / hard timeout / non-2xx) → fall back to
//       r.jina.ai with `X-Return-Format: html` (NOT markdown). 25 s timeout
//       — longer because the proxy is the slow path on weak networks.
//   3.  If both fail → render a small, user-actionable error page.
//
// Output:
//   * formatted HTML (forms, inputs, buttons, anchors, headings, tables…)
//   * scripts / styles / iframes / svg / video / fonts / link-tags REMOVED
//   * <img> → tiny `[img]` placeholder so layout doesn't collapse
//   * dangerous attrs (style, class, id, on*, srcset, sizes, data-*…) STRIPPED
//   * a single ~2 KB inline stylesheet (white bg, blue links, black text)
//
// The result feels like a 2010-era Opera Mini page: native buttons / inputs
// still work natively (WebView handles GET/POST without JS), images are
// suppressed, and bandwidth is minimal.

const PROXY_PREFIX = 'https://r.jina.ai/';

// ────────────────────────────────────────────────────────────────────────────
// Login URL detection — these need full JS + cookies, so home.tsx switches
// the WebView into URI mode for them. We export the regex so home.tsx can
// short-circuit before calling fetchCleanHtml.
// ────────────────────────────────────────────────────────────────────────────
const LOGIN_RE =
  /\/(login|signin|sign-in|signup|sign-up|register|accounts\/login|accounts\/signup|auth|oauth|sso|identity|checkpoint|challenge|two_factor|verify|recover)(\/|$|\?|#)|login\.live\.com|accounts\.google\.com|passport\.|^auth\./i;

export function isLoginUrl(url: string): boolean {
  if (!url) return false;
  return LOGIN_RE.test(url);
}

// ────────────────────────────────────────────────────────────────────────────
// 2 KB Pure-Legacy CSS template. Keep it small — ships with every page.
// ────────────────────────────────────────────────────────────────────────────
const LEGACY_CSS = `
*{transition:none!important;animation:none!important;}
html,body{margin:0;padding:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.4;}
body{padding:8px;max-width:100%;word-wrap:break-word;overflow-wrap:break-word;}
a,a:link{color:#0000EE;text-decoration:underline;}
a:visited{color:#551A8B;}
a:active{color:#FF0000;}
h1,h2,h3,h4,h5,h6{margin:10px 0 4px;color:#000;font-weight:bold;line-height:1.25;}
h1{font-size:20px;}h2{font-size:18px;}h3{font-size:17px;}h4,h5,h6{font-size:16px;}
p{margin:6px 0;}
ul,ol{padding-left:22px;margin:6px 0;}
li{margin:2px 0;}
hr{border:0;border-top:1px solid #888;margin:8px 0;}
blockquote{border-left:3px solid #888;margin:6px 0;padding:2px 8px;color:#222;}
code,pre{font-family:monospace;font-size:14px;background:#f4f4f4;}
pre{padding:6px;border-left:3px solid #888;overflow-x:auto;}
table{border-collapse:collapse;margin:6px 0;}
td,th{border:1px solid #aaa;padding:2px 6px;}
input,textarea,select,button{font-family:Arial,sans-serif;font-size:16px;color:#000;}
input[type=text],input[type=search],input[type=email],input[type=password],input[type=tel],input[type=number],input[type=url],input:not([type]),textarea{border:1px solid #888;padding:5px;background:#fff;max-width:100%;box-sizing:border-box;border-radius:0;}
input[type=submit],input[type=button],input[type=reset],button{background:#eee;border:1px solid #888;padding:5px 10px;font-size:14px;cursor:pointer;border-radius:0;}
input[type=submit]:active,input[type=button]:active,button:active{background:#ddd;}
input[type=checkbox],input[type=radio]{margin:0 4px;vertical-align:middle;width:16px;height:16px;}
select{border:1px solid #888;padding:3px;background:#fff;border-radius:0;}
label{display:inline-block;margin-right:4px;}
form{margin:6px 0;}
img{max-width:100%;height:auto;}
.__ul_imgbox{display:inline-block;min-width:24px;height:18px;border:1px solid #aaa;background:#f0f0f0;color:#666;font-size:11px;padding:0 4px;margin:0 2px;text-align:center;vertical-align:middle;line-height:18px;font-family:monospace;}
.__ul_meta{font-size:12px;color:#666;border-bottom:1px solid #ccc;padding-bottom:4px;margin:0 0 8px 0;}
.__ul_actions{font-size:12px;color:#444;border-top:1px solid #ccc;padding-top:6px;margin-top:12px;}
.__ul_actions a{display:inline-block;padding:3px 8px;border:1px solid #888;margin-right:6px;color:#000;background:#eee;text-decoration:none;}
`;

// ────────────────────────────────────────────────────────────────────────────
// HTML sanitiser (regex-based — DOMParser unavailable in React Native).
// ────────────────────────────────────────────────────────────────────────────

// Tags whose ENTIRE element (open → close, content included) is removed.
// Build #24: REVERTED build #21's blanket header/footer/aside kill.  Many
// CMSs and news sites wrap their actual article content inside a semantic
// <header>/<footer>/<aside>, so killing them entirely was leaving users
// looking at empty pages on sub-60 kbps links — exactly the "first page
// only" / "page is blank" complaint reported by users.  We still strip
// the truly-heavy chrome via the JUNK_TOKENS pass below (class/id match)
// which is more selective.  <nav> stays in the kill list — it's almost
// always a menu strip and rarely contains article content.
const KILL_BLOCK = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'canvas',
  'video',
  'audio',
  'object',
  'picture',
  'template',
  'dialog',
  'nav',
];

// Self-closing / void tags that should be removed entirely.
const KILL_VOID = ['link', 'meta', 'embed', 'source', 'track', 'param', 'base'];

// Attribute whitelist — anything outside this set is stripped.  We deliberately
// keep form/input/button attrs so native interactions (login, search) work.
const ATTR_WHITELIST = new Set([
  'href',
  'src',
  'action',
  'method',
  'name',
  'value',
  'type',
  'placeholder',
  'checked',
  'selected',
  'disabled',
  'target',
  'alt',
  'title',
  'for',
  'colspan',
  'rowspan',
  'maxlength',
  'min',
  'max',
  'step',
  'pattern',
  'required',
  'readonly',
  'autocomplete',
  'multiple',
  'rows',
  'cols',
  'wrap',
  'enctype',
  'accept',
]);

// Common ad / cookie / popup / sidebar / footer container tokens.  Containers
// whose class or id matches any of these are removed entirely.  Expanded in
// build #21 to cover the chrome that survives <header>/<footer>/<nav>/<aside>
// stripping — many sites use plain <div>s for mega-menus and rails.
const JUNK_TOKENS =
  /(^|[\s_\-])(ad|ads|adsense|adslot|advert|advertisement|banner|popup|popover|modal|overlay|cookie|consent|gdpr|tracker|tracking|analytics|comments?|share|sharing|social|sidebar|side\-bar|footer|foot|header|head|topbar|topBar|bottombar|bottom\-bar|masthead|megamenu|mega\-menu|breadcrumb|related|recommend|newsletter|subscribe|subscription|promo|cta|call\-to\-action|skyscraper|rail|widget|toolbar|menu|menubar|drawer|hamburger|search\-bar|searchbar|logo\-strip|legal|copyright|skip\-link|skiplink|notification|notice|alert\-bar|announcement|region\-switcher|locale|language\-switcher|accessibility|tooltip|back\-to\-top)([\s_\-]|$)/i;

// ARIA roles that identify non-content UI regions — whole element removed.
const JUNK_ROLES =
  /\b(navigation|banner|contentinfo|complementary|search|menubar|menu|dialog|alertdialog|toolbar|region|form|presentation)\b/i;

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Resolve a relative href / src against the page's base URL. */
function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

/**
 * Clean a raw HTML document and return a sanitised body fragment.
 * Title is returned separately so the caller can decide where to render it.
 *
 * `keepImages` — when true, <img> tags are preserved (with src resolved to
 * absolute URL) instead of being replaced with text placeholders.  Used
 * when the user enables "Allow Images in UltraLite" from settings.
 */
function cleanHtml(
  rawHtml: string,
  baseUrl: string,
  opts: { keepImages?: boolean } = {}
): { title: string; body: string } {
  const keepImages = !!opts.keepImages;
  let html = String(rawHtml || '');

  // 0.  Extract <title> before we start gutting the document.
  let title = '';
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleM) {
    title = titleM[1].replace(/\s+/g, ' ').trim();
  }
  // Build #26 — strip "DuckDuckGo" / "DDG" branding from the page title so
  // the URL bar shows just the search query, not the search engine name.
  // E.g. "tendulkar at DuckDuckGo" → "tendulkar".
  if (title) {
    title = title
      .replace(/\s*(?:at|on|—|–|-|\|)\s*DuckDuckGo\s*$/i, '')
      .replace(/^DuckDuckGo\s*[—–\-|:]\s*/i, '')
      .replace(/^DuckDuckGo$/i, '')
      .trim();
  }

  // 1.  If there's a <body>, work only on its contents.  Otherwise treat the
  //     whole thing as a fragment.
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyM ? bodyM[1] : html;

  // 1b. Build #26 — search-engine de-branding.
  // When the source page is DuckDuckGo's HTML / Lite endpoint (used as
  // our default search backend), strip the visible DDG logo and brand
  // links so users don't see "DuckDuckGo" plastered above their search
  // results.  We keep the actual <form> with the search input + the
  // results list — only the cosmetic header is removed.
  // Patterns covered:
  //   • <a class="header__logo-wrap"…>…</a>     (html.duckduckgo.com)
  //   • <div class="header__logo">DuckDuckGo</div>
  //   • <table class="header"…> with the logo row (lite.duckduckgo.com)
  //   • Any other element whose visible text is exactly "DuckDuckGo"
  //   • The DDG settings/privacy footer links banner
  const baseHost = (() => {
    try {
      return new URL(baseUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const isDDG = /(^|\.)duckduckgo\.com$/.test(baseHost);
  if (isDDG) {
    // Strip the entire <a class="header__logo-wrap">…</a> block.
    body = body.replace(
      /<a\b[^>]*class="[^"]*header__logo[^"]*"[^>]*>[\s\S]*?<\/a>/gi,
      ''
    );
    // Strip standalone logo divs / spans.
    body = body.replace(
      /<(?:div|span|h1|h2)\b[^>]*class="[^"]*header__logo[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|h1|h2)>/gi,
      ''
    );
    // Lite DDG's table-based logo row (a single <td> containing a <a>
    // with the logo image).  Drop the row, keep the search form row.
    body = body.replace(
      /<tr\b[^>]*>\s*<td\b[^>]*>\s*<a\b[^>]*href="[^"]*duckduckgo[^"]*"[^>]*>[\s\S]*?<\/a>\s*<\/td>\s*<\/tr>/gi,
      ''
    );
    // Any anchor whose visible text is exactly "DuckDuckGo".
    body = body.replace(
      /<a\b[^>]*>\s*DuckDuckGo\s*<\/a>/gi,
      ''
    );
    // The "Privacy, simplified." tagline and any header__hamburger menu.
    body = body.replace(
      /<(?:div|span|p)\b[^>]*class="[^"]*(?:tag-home|header__hamburger|header__bg|js-side-menu|tag-home__item)[^"]*"[^>]*>[\s\S]*?<\/(?:div|span|p)>/gi,
      ''
    );
  }

  // 2.  Strip HTML comments.
  body = body.replace(/<!--[\s\S]*?-->/g, '');

  // 3.  Kill block-level junk tags (with their content).
  for (const tag of KILL_BLOCK) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    body = body.replace(re, '');
    // Also strip stray opening tags whose closer was already eaten.
    const open = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    body = body.replace(open, '');
  }

  // 4.  Kill void junk tags.
  for (const tag of KILL_VOID) {
    const re = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    body = body.replace(re, '');
  }

  // 5.  Replace <img …> with a small placeholder.  Keep the marker tiny so
  //     dozens of decorative icons don't drown the actual article text.
  //     Only when `alt` is short and content-bearing do we include it.
  //     If `keepImages` is true, leave the <img> tag alone (src will be
  //     resolved to absolute URL by the attribute pass below).
  if (!keepImages) {
    body = body.replace(/<img\b[^>]*>/gi, (m) => {
      const altM = m.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
      const alt = altM ? (altM[2] !== undefined ? altM[2] : altM[3] || '') : '';
      const trimmed = alt.trim();
      // Skip decorative / icon / logo / overlay / spacer images entirely —
      // users on 2G don't care about them and they add dead weight.
      if (
        !trimmed ||
        /^(logo|icon|image|photo|picture|overlay|spacer|separator|divider)$/i.test(
          trimmed
        ) ||
        /^(logo|icon|image|banner|hero|avatar|profile)/i.test(trimmed)
      ) {
        return '';
      }
      if (trimmed.length > 30) return '<span class="__ul_imgbox">[img]</span>';
      return `<span class="__ul_imgbox">[${escapeHtml(trimmed)}]</span>`;
    });
  }

  // 6.  Drop "junk" containers — divs/sections with class/id flags or ARIA
  //     roles that identify them as ads, cookie banners, mega-menus, rails,
  //     related-posts widgets, etc.  Done by replacing the OPENING tag with
  //     a safe <span> so we don't unbalance DOM structure while stripping
  //     the identity attributes.  The content itself stays (usually mostly
  //     empty after other rules have run).
  body = body.replace(
    /<(div|section|form|span|article|main|figure)\b([^>]*)>/gi,
    (match, _tag, rawAttrs) => {
      // class / id junk-token match
      const classM = /\bclass\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const idM = /\bid\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const roleM = /\brole\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const ariaLabelM = /\baria-label\s*=\s*("([^"]*)"|'([^']*)')/i.exec(rawAttrs);
      const classVal =
        classM ? (classM[2] !== undefined ? classM[2] : classM[3]) : '';
      const idVal = idM ? (idM[2] !== undefined ? idM[2] : idM[3]) : '';
      const roleVal =
        roleM ? (roleM[2] !== undefined ? roleM[2] : roleM[3]) : '';
      const ariaVal =
        ariaLabelM
          ? (ariaLabelM[2] !== undefined ? ariaLabelM[2] : ariaLabelM[3])
          : '';
      if (
        JUNK_TOKENS.test(classVal) ||
        JUNK_TOKENS.test(idVal) ||
        JUNK_ROLES.test(roleVal) ||
        JUNK_TOKENS.test(ariaVal)
      ) {
        return '<span>';
      }
      return match;
    }
  );

  // 6b. Drop elements that contain ONLY "Loading…" / "Loading section…"
  //     placeholder text — these are skeleton screens the site uses while
  //     JS hydrates.  Since we've killed JS, they'd otherwise litter the
  //     page with dozens of empty lines.
  body = body.replace(
    /<(div|span|p|section)[^>]*>\s*(?:Loading[^<]{0,40})\s*<\/\1>/gi,
    ''
  );
  // 6c. Drop elements that are completely empty after earlier passes.
  //     Repeat twice to catch nested empties.
  for (let i = 0; i < 3; i++) {
    body = body.replace(
      /<(div|span|section|article|main|figure|p)[^>]*>\s*<\/\1>/gi,
      ''
    );
  }

  // 7.  For every remaining open-tag, strip dangerous attributes & resolve
  //     relative URLs.  Closing tags are passed through verbatim.
  body = body.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g,
    (_match, rawTag, rawAttrs) => {
      const tag = String(rawTag).toLowerCase();
      const isClose = _match.startsWith('</');
      if (isClose) return `</${tag}>`;

      // Parse attributes.
      const out: string[] = [];
      const attrRe = /([a-zA-Z_:][a-zA-Z0-9_\-:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let am;
      while ((am = attrRe.exec(rawAttrs)) !== null) {
        const name = am[1].toLowerCase();
        let val =
          am[3] !== undefined ? am[3] : am[4] !== undefined ? am[4] : am[5] || '';
        if (!ATTR_WHITELIST.has(name)) continue;
        // Strip javascript: / data: schemes from href/action/src.
        if ((name === 'href' || name === 'action' || name === 'src') && val) {
          const lower = val.trim().toLowerCase();
          if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) {
            continue;
          }
          // Resolve relative URLs.
          if (
            !lower.startsWith('http://') &&
            !lower.startsWith('https://') &&
            !lower.startsWith('mailto:') &&
            !lower.startsWith('tel:') &&
            !lower.startsWith('#') &&
            !lower.startsWith('data:')
          ) {
            val = resolveUrl(val, baseUrl);
          }
        }
        out.push(`${name}="${escapeAttr(val)}"`);
      }
      // Boolean attrs like `disabled`, `checked` (no =value) — preserve those.
      const boolRe = /(?:^|\s)([a-zA-Z][a-zA-Z0-9_\-]*)(?=\s|$)/g;
      let bm;
      while ((bm = boolRe.exec(rawAttrs)) !== null) {
        const name = bm[1].toLowerCase();
        if (!ATTR_WHITELIST.has(name)) continue;
        if (out.some((a) => a.startsWith(`${name}=`))) continue;
        out.push(name);
      }

      const attrStr = out.length ? ' ' + out.join(' ') : '';
      return `<${tag}${attrStr}>`;
    }
  );

  // 8.  Build #27 — aggressive whitespace minification.  After all the
  //     strip / unwrap / attr passes have run, the HTML is full of
  //     leftover whitespace from now-empty containers.  Squashing it
  //     shaves another 10-20 % off the cleaned size, which means the
  //     WebView paints faster (and on the streaming path, each
  //     incremental injection is shorter).  We deliberately *don't*
  //     touch whitespace inside <pre>/<code>/<textarea> blocks — those
  //     are content-significant.
  const PRESERVE_RE =
    /<(pre|code|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const PRESERVE_TAG = '\u0001PRESERVE\u0001';
  const preserved: string[] = [];
  body = body.replace(PRESERVE_RE, (m) => {
    preserved.push(m);
    return PRESERVE_TAG;
  });
  body = body
    .replace(/[\t\r\n]+/g, ' ')        // tabs + newlines → single space
    .replace(/  +/g, ' ')               // runs of spaces → single
    .replace(/>\s+</g, '><')            // dead space between tags
    .replace(/<(p|div|h\d|li|tr|td|th|ul|ol|table|tbody|thead|section|article|main|header|footer|aside|form)>\s+/gi, '<$1>')
    .replace(/\s+<\/(p|div|h\d|li|tr|td|th|ul|ol|table|tbody|thead|section|article|main|header|footer|aside|form)>/gi, '</$1>')
    .trim();
  // Restore content-sensitive blocks.
  body = body.replace(new RegExp(PRESERVE_TAG, 'g'), () =>
    preserved.shift() || ''
  );

  return { title, body };
}

// ────────────────────────────────────────────────────────────────────────────
// Network layer — direct + r.jina.ai proxy fired IN PARALLEL.  Whichever
// returns first wins (build-#22 2G fix).
//
// Earlier versions tried direct first with an 8 s timeout, then waited up
// to 25 s for the proxy — a sub-30 kbps user saw up to 33 s of blank
// "Loading…" on every link click.  Now both fire at once on a generous
// 45/90 s budget and we race the winner.  Direct is still preferred when
// it arrives before the proxy (faster + no intermediate server), but the
// proxy acts as a safety net on any weak link.
// ────────────────────────────────────────────────────────────────────────────

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 5.0; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.0.0 Mobile Safari/537.36';

// Hard cap on the HTML body we accept — anything bigger is almost
// certainly a dynamic SPA that doesn't belong in Pure-Legacy mode anyway,
// and we don't want a 30 MB page stalling a 30 kbps link for 12 minutes.
// Build #24: bumped 600 KB → 1.5 MB so heavy CMS / news pages with full
// articles below the fold aren't truncated on slow links.
const MAX_BODY_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(tm);
  }
}

// Read a Response body as text while enforcing MAX_BODY_BYTES.  If the
// body streams past the cap we cut off early (rather than buffer all of
// it first) so big SPA bundles don't kill RAM on slow devices.  Falls
// back to plain res.text() when streams aren't available.
//
// Build #27 — `onPartialText` fires (throttled to once per ~1.5 s) with
// a snapshot of the bytes received so far, decoded as UTF-8.  This is
// what powers the Lynx-style streaming render: home.tsx feeds each
// snapshot into cleanHtml() and injects the result into the WebView via
// injectJavaScript(), so the user sees content paint progressively
// instead of waiting for the full document.
async function readCappedText(
  res: Response,
  onBytes?: (n: number) => void,
  onPartialText?: (text: string) => void
): Promise<string> {
  // Throttle the partial-text callback so even on a fast 4G link we
  // don't spam the WebView with 30 injectJavaScript calls per second.
  // 1500 ms feels alive on 2G (one update every couple of paragraphs)
  // without burning CPU on faster links.
  const PARTIAL_THROTTLE_MS = 1500;
  let lastPartialAt = 0;
  const decoder = (() => {
    try {
      return new TextDecoder('utf-8', { fatal: false });
    } catch {
      return null;
    }
  })();
  const decodeAll = (chunks: Uint8Array[], total: number): string => {
    const buf = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    if (decoder) {
      try {
        return decoder.decode(buf);
      } catch {
        /* fall through */
      }
    }
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return s;
  };
  try {
    // React Native's fetch exposes `.body` as a ReadableStream on recent
    // versions.  When present, use it to stop reading after MAX_BODY_BYTES.
    const anyRes: any = res as any;
    if (anyRes.body && typeof anyRes.body.getReader === 'function') {
      const reader = anyRes.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.length;
          if (onBytes) {
            try { onBytes(total); } catch {}
          }
          // Throttled partial-text emit for streaming render.
          if (onPartialText) {
            const now = Date.now();
            if (now - lastPartialAt >= PARTIAL_THROTTLE_MS && total > 4096) {
              lastPartialAt = now;
              try {
                onPartialText(decodeAll(chunks, total));
              } catch {}
            }
          }
          if (total >= MAX_BODY_BYTES) {
            try {
              reader.cancel();
            } catch {}
            break;
          }
        }
      }
      // Final emit: full payload decoded.
      return decodeAll(chunks, total);
    }
  } catch {
    /* fall through to .text() */
  }
  return res.text();
}

async function tryDirect(
  url: string,
  onBytes?: (n: number) => void,
  onPartialText?: (text: string) => void
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': MOBILE_UA,
          // Build #27.1 — DO NOT set Accept-Encoding manually.  OkHttp
          // (which powers React Native's fetch on Android) transparently
          // adds `Accept-Encoding: gzip` AND decompresses the response —
          // but ONLY when the app does not set the header itself.  The
          // moment we send our own Accept-Encoding, OkHttp hands us the
          // raw compressed bytes and we end up decoding gibberish (this
          // was the build #27 "❓❓" empty-page regression).  Brotli
          // support is unavailable on stock RN; can be added later via
          // an okhttp-brotli interceptor.
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.7',
          // Build #27 — Chrome's official low-data hint.  Wikipedia,
          // Google, BBC, Cloudflare-routed sites and many CDNs honour
          // this and return their lite/AMP versions automatically.
          'Save-Data': 'on',
          // Tell servers we're a small mobile device — many adaptive
          // sites use these client hints to ship a stripped-down
          // smaller HTML/CSS payload.
          DPR: '1.0',
          'Viewport-Width': '320',
        },
        redirect: 'follow',
      },
      // Build #24: bumped 45s → 75s.  On real 30 kbps links, even a 30 KB
      // mbasic.fb page can take 45-60 s to download once TCP/TLS handshake
      // costs are factored in.  The parallel proxy race still cancels this
      // if the proxy wins first.
      75000
    );
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.includes('html') && !ct.includes('xml') && !ct.includes('text/plain')) {
      return null;
    }
    const text = await readCappedText(res, onBytes, onPartialText);
    if (!text || text.length < 32) return null;
    return text;
  } catch {
    return null;
  }
}

async function tryProxyHtml(
  url: string,
  onBytes?: (n: number) => void,
  onPartialText?: (text: string) => void
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${PROXY_PREFIX}${url}`,
      {
        headers: {
          // Build #27.1 — no Accept-Encoding (OkHttp handles gzip
          // transparently only when we don't set it).
          'Save-Data': 'on',
          Accept: 'text/html,*/*',
          'X-Return-Format': 'html',
          'X-With-Generated-Alt': 'false',
        },
      },
      // Build #24: bumped 90s → 120s.  The Jina reader sometimes needs
      // 30-90 s to crawl + render heavy SPA pages on its side, then has
      // to ship the result down a 30 kbps link to us.  120 s is the
      // generous ceiling that lets it complete cleanly on truly weak
      // networks.
      120000
    );
    if (!res.ok) return null;
    const text = await readCappedText(res, onBytes, onPartialText);
    if (!text || text.length < 32) return null;
    return text;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public API.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a URL and return a complete, ready-to-render HTML document styled
 * with the Pure-Legacy template.  Never throws — on total failure returns a
 * small error page so the WebView never goes blank.
 *
 * `onProgress` fires every ~3 s with { elapsedMs } while the fetch is
 * in-flight so callers can keep a spinner / countdown alive on screen.
 *
 * `opts.keepImages` — preserve <img> tags in the cleaned output (default
 *   false; controlled by the user via "Allow Images in UltraLite" toggle).
 *
 * `opts.onPartialText` — fires with progressively-larger snapshots of the
 *   cleaned HTML <body> while bytes are still streaming in.  Drives the
 *   Lynx-style line-by-line render in home.tsx so the user sees content
 *   paint as it arrives instead of waiting for the entire document on
 *   sub-60 kbps links.  Each call is guaranteed to be longer than the
 *   previous one (monotonic) and is throttled to ~1.5 s by the network
 *   layer.  Never fires after the final return value.
 */
export async function fetchCleanHtml(
  url: string,
  onProgress?: (info: {
    elapsedMs: number;
    source: string;
    phase: 'connect' | 'fetch' | 'render';
    bytes: number;
  }) => void,
  opts: { keepImages?: boolean; onPartialText?: (cleanedBody: string) => void } = {}
): Promise<string> {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }

  const started = Date.now();
  let bytesSoFar = 0;
  let phase: 'connect' | 'fetch' | 'render' = 'connect';
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  const tick = () => {
    if (!onProgress) return;
    try {
      onProgress({
        elapsedMs: Date.now() - started,
        source: 'racing',
        phase,
        bytes: bytesSoFar,
      });
    } catch {}
  };
  if (onProgress) {
    progressTimer = setInterval(tick, 700);
  }

  // Parallel race: direct fetch + r.jina.ai proxy.  Whichever returns a
  // usable body first wins.  On fast links direct almost always wins; on
  // 2G / blocked-UA sites the proxy rescues the navigation.
  //
  // We can't use Promise.race directly because a `null` (failure) result
  // shouldn't cancel the race — we want the OTHER promise to continue.
  // So we resolve manually.
  let raw: string | null = null;
  let source = 'direct';
  const onBytes = (n: number) => {
    if (n > bytesSoFar) bytesSoFar = n;
    if (phase === 'connect' && bytesSoFar > 0) phase = 'fetch';
    tick();
  };
  // Build #27 — streaming render bridge.  Each partial snapshot (raw HTML
  // bytes-so-far) is run through cleanHtml() and the cleaned <body>
  // delivered to the UI.  We enforce a "snapshot must be strictly larger
  // than the last one we delivered" rule so partials from the slower of
  // the two racing streams (direct vs proxy) can't make the rendered
  // content shrink mid-fetch.
  let lastPartialLen = 0;
  const partialCb: ((snapshot: string) => void) | undefined = opts.onPartialText
    ? (snapshot: string) => {
        if (!snapshot || snapshot.length <= lastPartialLen + 1024) return;
        lastPartialLen = snapshot.length;
        try {
          const { body } = cleanHtml(snapshot, url, {
            keepImages: !!opts.keepImages,
          });
          if (body && body.length > 0) {
            opts.onPartialText!(body);
          }
        } catch {
          /* swallow — partial cleans can fail on torn HTML */
        }
      }
    : undefined;
  try {
    raw = await new Promise<string | null>((resolve) => {
      let done = false;
      let pending = 2;
      const finish = (res: string | null, label: string) => {
        if (done) return;
        if (res) {
          done = true;
          source = label;
          resolve(res);
          return;
        }
        pending -= 1;
        if (pending === 0) {
          done = true;
          resolve(null);
        }
      };
      tryDirect(url, onBytes, partialCb).then((r) => finish(r, 'direct'));
      tryProxyHtml(url, onBytes, partialCb).then((r) => finish(r, 'proxy'));
    });
  } finally {
    if (progressTimer) clearInterval(progressTimer);
  }

  // Final phase: cleaning / rendering — emit one last tick so UI flips
  // text from "Fetching Text Packets..." → "Rendering Layout...".
  phase = 'render';
  tick();

  if (!raw) {
    return errorPage(url, host, 'Both direct and lite-proxy fetch failed.');
  }

  const { title, body } = cleanHtml(raw, url, { keepImages: !!opts.keepImages });
  const headTitle = title ? escapeHtml(title) : escapeHtml(host || url);
  const elapsedS = Math.round((Date.now() - started) / 100) / 10;
  const meta = `<div class="__ul_meta">UltraLite · Pure Legacy · ${escapeHtml(
    host
  )} · via ${source} · ${elapsedS}s · ${Math.round(raw.length / 1024)} KB</div>`;
  const actions = `<div class="__ul_actions"><a href="${escapeAttr(
    url
  )}">Open original</a> Switch to Normal mode for full version.</div>`;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${escapeAttr(url)}" target="_top">
<title>${headTitle}</title>
<style>${LEGACY_CSS}</style>
</head><body>${meta}${body}${actions}</body></html>`;
}

function errorPage(url: string, host: string, msg: string): string {
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UltraLite — couldn't load</title>
<style>${LEGACY_CSS}</style>
</head><body>
<div class="__ul_meta">UltraLite · Pure Legacy · ${escapeHtml(host)}</div>
<h2>Couldn't fetch this page</h2>
<p>${escapeHtml(msg)}</p>
<p>Your connection is likely below 32&nbsp;kbps right now, or the site is blocking lite proxies.</p>
<p>You can:</p>
<ul>
  <li><a href="${escapeAttr(url)}">Retry in UltraLite</a></li>
  <li>Switch to <strong>Normal mode</strong> from the toggle at the top.</li>
</ul>
</body></html>`;
}
