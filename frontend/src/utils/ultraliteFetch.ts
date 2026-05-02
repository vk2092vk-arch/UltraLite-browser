// UltraLite HTML filter — fetches a URL in RN (no CORS) then returns a pure
// B&W text HTML string with ALL scripts/styles/images/media stripped out.
// Images become empty "X-box" placeholders. Designed for 64kbps 2G networks.
//
// Reference architecture: server-side rendered lightweight HTML (on-device).
// The difference is we do it on-device in RN (still avoids downloading ads,
// tracker scripts, fonts, images, videos).

const MOBILE_UA =
  'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

// Login / auth URL patterns — these pages need JS + images to work properly.
// In these cases we skip the pure-text filter and use a normal WebView.
const LOGIN_RE =
  /\/(login|signin|sign-in|signup|sign-up|register|accounts\/login|accounts\/signup|auth|oauth|sso|identity|checkpoint|challenge|two_factor|verify|recover)(\/|$|\?|#)|login\.live\.com|accounts\.google\.com|\.facebook\.com\/login|\.instagram\.com\/accounts\/|passport\.|auth\./i;

export function isLoginUrl(url: string): boolean {
  if (!url) return false;
  return LOGIN_RE.test(url);
}

// Minimal B&W text-only stylesheet. `all: revert` strips site CSS; we then
// set safe readable defaults on top.
const BW_CSS = `
<style id="__ul_core">
  html, body { background:#fff !important; color:#000 !important; }
  * {
    color: #000 !important;
    background: #fff !important;
    background-image: none !important;
    box-shadow: none !important;
    text-shadow: none !important;
    filter: none !important;
    animation: none !important;
    transition: none !important;
    border-radius: 0 !important;
  }
  body {
    font-family: Georgia, serif !important;
    font-size: 17px !important;
    line-height: 1.55 !important;
    padding: 12px !important;
    margin: 0 !important;
    max-width: 100% !important;
  }
  h1, h2, h3, h4 { font-weight: 700 !important; margin: 14px 0 6px !important; }
  h1 { font-size: 22px !important; }
  h2 { font-size: 19px !important; }
  h3, h4 { font-size: 17px !important; }
  p, div, section, article, li { margin: 5px 0 !important; }
  a, a:link { color: #000 !important; text-decoration: underline !important; }
  a:visited { color: #555 !important; }
  ul, ol { padding-left: 22px !important; margin: 6px 0 !important; }
  hr { border: 0 !important; border-top: 1px solid #000 !important; margin: 10px 0 !important; }
  blockquote { border-left: 3px solid #000 !important; padding-left: 10px !important; margin: 8px 0 !important; }
  table { border-collapse: collapse !important; margin: 6px 0 !important; }
  td, th { border: 1px solid #000 !important; padding: 4px 6px !important; }
  form, fieldset { border: 0 !important; margin: 6px 0 !important; padding: 0 !important; }
  input, textarea, select, button {
    font-family: Georgia, serif !important;
    font-size: 16px !important;
    border: 1px solid #000 !important;
    padding: 6px 8px !important;
    background: #fff !important;
    color: #000 !important;
    margin: 2px 0 !important;
    box-sizing: border-box !important;
    max-width: 100% !important;
  }
  button, [type="submit"], [type="button"] {
    background: #000 !important;
    color: #fff !important;
    cursor: pointer !important;
    padding: 7px 14px !important;
  }
  /* X-box image placeholders */
  .__ul_xbox {
    display: inline-block !important;
    width: 38px !important;
    height: 38px !important;
    border: 1px solid #000 !important;
    text-align: center !important;
    line-height: 34px !important;
    color: #000 !important;
    background: #fff !important;
    font-size: 22px !important;
    vertical-align: middle !important;
    margin: 2px !important;
    font-weight: bold !important;
  }
  /* Hide common clutter classes just in case */
  [class*="cookie" i], [class*="consent" i], [class*="gdpr" i],
  [class*="newsletter" i], [class*="popup" i], [id*="cookie" i],
  [id*="gdpr" i], nav[class*="ad" i], [class*="advertisement" i] {
    display: none !important;
  }
</style>
`;

const BW_HEADER_STRIP = `
<style id="__ul_trim">
  script, noscript, style, link[rel="stylesheet"], link[rel="preload"],
  link[rel="prefetch"], meta[http-equiv="refresh"] { display: none !important; }
</style>
`;

function stripTagBlocks(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
  return html.replace(re, '');
}

function stripSelfClosing(html: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  return html.replace(re, '');
}

/**
 * Strip everything heavy from raw HTML and add B&W text-only CSS.
 * Returns a ready-to-render HTML string.
 */
export function filterHtml(rawHtml: string, baseUrl: string): string {
  let html = rawHtml;

  // 1. Remove entire blocks that carry JS/styling/media.
  for (const tag of [
    'script',
    'noscript',
    'style',
    'iframe',
    'video',
    'audio',
    'canvas',
    'svg',
    'picture',
    'template',
  ]) {
    html = stripTagBlocks(html, tag);
  }

  // 2. Remove void tags that fetch binary resources.
  for (const tag of ['source', 'track', 'embed', 'link']) {
    html = stripSelfClosing(html, tag);
  }

  // 3. Replace every <img> / <object> / inline-svg with X-box placeholder.
  html = html.replace(
    /<img\b[^>]*alt=(["'])(.*?)\1[^>]*>/gi,
    (_m, _q, alt) =>
      `<span class="__ul_xbox" title="${String(alt || '').slice(0, 60)}">×</span>`
  );
  html = html.replace(
    /<img\b[^>]*>/gi,
    '<span class="__ul_xbox" title="image">×</span>'
  );
  html = html.replace(
    /<object\b[\s\S]*?<\/object>/gi,
    '<span class="__ul_xbox">×</span>'
  );

  // 4. Strip all inline event handlers (onclick, onload, etc.).
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  // 5. Strip `style=""` attributes (rely on our injected CSS).
  html = html.replace(/\sstyle\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\sstyle\s*=\s*'[^']*'/gi, '');

  // 6. Inject our <base> + B&W CSS into <head>.
  const headInject = `<base href="${baseUrl}">${BW_HEADER_STRIP}${BW_CSS}`;
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, (m) => `${m}${headInject}`);
  } else if (/<html\b[^>]*>/i.test(html)) {
    html = html.replace(
      /<html\b[^>]*>/i,
      (m) => `${m}<head>${headInject}</head>`
    );
  } else {
    html = `<html><head>${headInject}</head><body>${html}</body></html>`;
  }

  return html;
}

/**
 * Fetches a URL via RN fetch (no CORS limits) and returns a filtered B&W HTML
 * string ready to pass to WebView's `source={{ html, baseUrl }}`.
 * Times out after ~10s to avoid hanging on slow 2G connections.
 */
export async function fetchCleanHtml(url: string): Promise<string> {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': MOBILE_UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.8',
      },
      signal: ctrl.signal,
    });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html') && !ct.includes('application/xhtml')) {
      // Not HTML (PDF, image, etc.) — return a minimal stub.
      return `<html><head>${BW_CSS}</head><body><p>Non-HTML resource at <a href="${url}">${url}</a>.</p></body></html>`;
    }
    const raw = await res.text();
    return filterHtml(raw, url);
  } catch (e: any) {
    const msg = e?.message || String(e);
    return `<html><head>${BW_CSS}</head><body><h3>Couldn't load page</h3><p>${msg}</p><p><a href="${url}">Open ${url} in Normal mode</a>.</p></body></html>`;
  } finally {
    clearTimeout(tm);
  }
}
