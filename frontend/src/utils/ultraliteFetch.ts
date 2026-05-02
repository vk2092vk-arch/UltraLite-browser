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
img{display:none;}
.__ul_imgbox{display:inline-block;min-width:24px;height:18px;border:1px solid #aaa;background:#f0f0f0;color:#666;font-size:11px;padding:0 4px;margin:0 2px;text-align:center;vertical-align:middle;line-height:18px;font-family:monospace;}
.__ul_meta{font-size:12px;color:#666;border-bottom:1px solid #ccc;padding-bottom:4px;margin:0 0 8px 0;}
.__ul_actions{font-size:12px;color:#444;border-top:1px solid #ccc;padding-top:6px;margin-top:12px;}
.__ul_actions a{display:inline-block;padding:3px 8px;border:1px solid #888;margin-right:6px;color:#000;background:#eee;text-decoration:none;}
`;

// ────────────────────────────────────────────────────────────────────────────
// HTML sanitiser (regex-based — DOMParser unavailable in React Native).
// ────────────────────────────────────────────────────────────────────────────

// Tags whose ENTIRE element (open → close, content included) is removed.
// Build #21: added header/footer/nav/aside to this list.  On 64 kbps users
// want the article body; the site chrome (logo strip, mega-menu, legal
// footer, cookie nag, "Related posts" rail) is dead weight.  Buttons are
// intentionally NOT killed globally so native form-submit / search buttons
// on cleaned pages still work when tapped in the WebView.
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
  'header',
  'footer',
  'nav',
  'aside',
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
 */
function cleanHtml(rawHtml: string, baseUrl: string): { title: string; body: string } {
  let html = String(rawHtml || '');

  // 0.  Extract <title> before we start gutting the document.
  let title = '';
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleM) {
    title = titleM[1].replace(/\s+/g, ' ').trim();
  }

  // 1.  If there's a <body>, work only on its contents.  Otherwise treat the
  //     whole thing as a fragment.
  const bodyM = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyM ? bodyM[1] : html;

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

  // 8.  Collapse runs of whitespace between block tags so the payload is tiny.
  body = body
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ');

  return { title, body };
}

// ────────────────────────────────────────────────────────────────────────────
// Network layer — direct fetch first, r.jina.ai fallback.
// ────────────────────────────────────────────────────────────────────────────

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 5.0; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.0.0 Mobile Safari/537.36';

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

async function tryDirect(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      {
        headers: {
          'User-Agent': MOBILE_UA,
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.7',
        },
        redirect: 'follow',
      },
      8000
    );
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !ct.includes('html') && !ct.includes('xml') && !ct.includes('text/plain')) {
      return null;
    }
    const text = await res.text();
    if (!text || text.length < 32) return null;
    return text;
  } catch {
    return null;
  }
}

async function tryProxyHtml(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `${PROXY_PREFIX}${url}`,
      {
        headers: {
          Accept: 'text/html,*/*',
          'X-Return-Format': 'html',
          'X-With-Generated-Alt': 'false',
        },
      },
      25000
    );
    if (!res.ok) return null;
    const text = await res.text();
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
 */
export async function fetchCleanHtml(url: string): Promise<string> {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }

  // 1. Direct fetch first (RN bypasses CORS).
  let raw = await tryDirect(url);
  let source = 'direct';

  // 2. Fall back to r.jina.ai for sites that block our UA / time out.
  if (!raw) {
    raw = await tryProxyHtml(url);
    source = 'proxy';
  }

  if (!raw) {
    return errorPage(url, host, 'Both direct and lite-proxy fetch failed.');
  }

  const { title, body } = cleanHtml(raw, url);
  const headTitle = title ? escapeHtml(title) : escapeHtml(host || url);
  const meta = `<div class="__ul_meta">UltraLite · Pure Legacy · ${escapeHtml(
    host
  )} · via ${source}</div>`;
  const actions = `<div class="__ul_actions"><a href="${escapeAttr(
    url
  )}">Open original</a> Switch to Normal mode for full version.</div>`;

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base href="${escapeAttr(url)}">
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
