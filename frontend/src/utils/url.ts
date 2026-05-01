// URL helpers — strict safe-search DuckDuckGo for query strings.
// Direct URLs are loaded as-is; UltraLite optimizations are applied via
// WebView injected JS (ad-block + image-blur + CSS strip) instead of a
// third-party text proxy. See app/home.tsx.

const DUCK_LITE = 'https://duckduckgo.com/?kp=-2&q='; // kp=-2 = strict safe search

const URL_RE = /^(https?:\/\/|www\.)/i;
const HAS_DOT = /\.[a-z]{2,}/i;

export function buildSearchUrl(query: string, _ultraLite: boolean): string {
  const q = (query || '').trim();
  if (!q) return DUCK_LITE;
  // Detect direct URL input
  if (URL_RE.test(q) || (HAS_DOT.test(q) && !q.includes(' '))) {
    return q.startsWith('http') ? q : `https://${q}`;
  }
  // Else, search via strict safe-search
  return `${DUCK_LITE}${encodeURIComponent(q)}`;
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
