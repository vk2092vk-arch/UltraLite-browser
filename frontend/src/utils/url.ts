// URL helpers — safe-search DuckDuckGo Lite + r.jina.ai text-only proxy in UltraLite mode.

const DUCK_LITE = 'https://duckduckgo.com/lite/?kp=-2&q='; // kp=-2 strict safe search

const URL_RE = /^(https?:\/\/|www\.)/i;
const HAS_DOT = /\.[a-z]{2,}/i;

export function buildSearchUrl(query: string, ultraLite: boolean): string {
  const q = (query || '').trim();
  if (!q) return DUCK_LITE;
  // Detect direct URL input
  if (URL_RE.test(q) || (HAS_DOT.test(q) && !q.includes(' '))) {
    let target = q.startsWith('http') ? q : `https://${q}`;
    return ultraLite ? toJina(target) : target;
  }
  // Else, search via DuckDuckGo Lite (safe-search locked)
  return `${DUCK_LITE}${encodeURIComponent(q)}`;
}

export function toJina(url: string): string {
  // r.jina.ai serves clean text/markdown — perfect for 2G.
  // No backend needed, free, no signup for basic use.
  if (!url) return url;
  if (url.includes('r.jina.ai')) return url;
  if (url.startsWith('https://duckduckgo.com')) return url; // keep DDG lite native
  return `https://r.jina.ai/${url.replace(/^https?:\/\//, 'https://')}`;
}

export function fromJina(url: string): string {
  return url.replace(/^https?:\/\/r\.jina\.ai\//, '');
}

export function isUltraLiteUrl(url: string): boolean {
  return url.startsWith('https://r.jina.ai/');
}

// Utility — derive a readable title fragment from URL when WebView title is empty.
export function deriveTitle(url: string): string {
  try {
    const clean = fromJina(url);
    const u = new URL(clean);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
