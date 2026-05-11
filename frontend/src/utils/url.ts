// URL helpers — UltraLite mode uses lite.duckduckgo.com (no JS, ~10 KB) so
// search results load instantly on 64 kbps.  Normal mode uses the regular
// DuckDuckGo with strict safe-search (kp=-2).  Direct URLs are passed through
// — legacy-mapping is applied upstream in app/home.tsx via mapToLegacy().

const DUCK_LITE = 'https://lite.duckduckgo.com/lite/?kp=-2&q='; // pure-HTML, no JS
const DUCK_NORMAL = 'https://duckduckgo.com/?kp=-2&q='; // strict safe search

const URL_RE = /^(https?:\/\/|www\.)/i;
const HAS_DOT = /\.[a-z]{2,}/i;

export function buildSearchUrl(query: string, ultraLite: boolean): string {
  const base = ultraLite ? DUCK_LITE : DUCK_NORMAL;
  const q = (query || '').trim();
  if (!q) return base;
  // Detect direct URL input
  if (URL_RE.test(q) || (HAS_DOT.test(q) && !q.includes(' '))) {
    return q.startsWith('http') ? q : `https://${q}`;
  }
  // Else, search via strict safe-search (lite endpoint in UltraLite)
  return `${base}${encodeURIComponent(q)}`;
}

// Utility — derive a readable title fragment from URL when WebView title is empty.
export function deriveTitle(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
