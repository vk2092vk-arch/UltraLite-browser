// Pure Legacy URL mapping — Opera Mini 4.0 / 2010 era experience.
// Many big sites still publish a "no-JS, no-CSS" mobile portal that loads
// instantly even on 64 kbps. We rewrite popular domains to those endpoints
// so login & navigation buttons work natively without our HTML cleaner
// breaking them.
//
// Two helpers exported:
//   mapToLegacy(url)      — rewrite to a legacy-friendly URL (or pass through)
//   isTrustedLite(url)    — true if this host is already lite-by-design and
//                           should be loaded directly in the WebView (URI
//                           mode), bypassing the r.jina.ai HTML cleaner.

type Mapper = (u: URL) => string | null;

// Domain → rewriter. Each rewriter receives the parsed URL and returns the
// new full URL string, or null to leave it alone.
const HOST_RULES: Record<string, Mapper> = {
  // ---------- Facebook ----------
  'facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'www.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'm.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'web.facebook.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,
  'fb.com': (u) => `https://mbasic.facebook.com${u.pathname}${u.search}`,

  // ---------- Instagram ----------
  // Instagram has no public mbasic. The login page with force_classic=1 is
  // the closest to a 2G-friendly endpoint that still accepts credentials.
  'instagram.com': (u) => {
    if (u.pathname === '/' || u.pathname === '') {
      return 'https://www.instagram.com/accounts/login/?force_classic=1';
    }
    const sp = new URLSearchParams(u.search);
    sp.set('force_classic', '1');
    return `https://www.instagram.com${u.pathname}?${sp.toString()}`;
  },
  'www.instagram.com': (u) => {
    if (u.pathname === '/' || u.pathname === '') {
      return 'https://www.instagram.com/accounts/login/?force_classic=1';
    }
    const sp = new URLSearchParams(u.search);
    sp.set('force_classic', '1');
    return `https://www.instagram.com${u.pathname}?${sp.toString()}`;
  },

  // ---------- Twitter / X ----------
  'twitter.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'www.twitter.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'x.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,
  'www.x.com': (u) => `https://mobile.twitter.com${u.pathname}${u.search}`,

  // ---------- YouTube ----------
  'youtube.com': (u) => `https://m.youtube.com${u.pathname}${u.search}`,
  'www.youtube.com': (u) => `https://m.youtube.com${u.pathname}${u.search}`,

  // ---------- Wikipedia ----------
  'wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  'www.wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  'en.wikipedia.org': (u) => `https://en.m.wikipedia.org${u.pathname}${u.search}`,
  // Also map other-language wikipedias to their .m. counterparts
  // (handled generically below)

  // ---------- Reddit ----------
  'reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'www.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'new.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,
  'np.reddit.com': (u) => `https://old.reddit.com${u.pathname}${u.search}`,

  // ---------- Google search ----------
  // gbv=1 forces basic HTML (no-JS) version of search results.
  'google.com': (u) => {
    if (u.pathname === '/search' || u.pathname.startsWith('/search')) {
      const sp = new URLSearchParams(u.search);
      sp.set('gbv', '1');
      return `https://www.google.com${u.pathname}?${sp.toString()}`;
    }
    return null;
  },
  'www.google.com': (u) => {
    if (u.pathname === '/search' || u.pathname.startsWith('/search')) {
      const sp = new URLSearchParams(u.search);
      sp.set('gbv', '1');
      return `https://www.google.com${u.pathname}?${sp.toString()}`;
    }
    return null;
  },

  // ---------- Bing ----------
  // No official lite mode — leave as-is, will be processed by HTML cleaner.

  // ---------- DuckDuckGo ----------
  'duckduckgo.com': (u) => {
    // Always route to the static lite endpoint in UltraLite.
    const sp = new URLSearchParams(u.search);
    if (!sp.has('kp')) sp.set('kp', '-2');
    return `https://lite.duckduckgo.com/lite/?${sp.toString()}`;
  },
};

/** Pure-legacy URL rewriter. Returns the input unchanged when no rule fires. */
export function mapToLegacy(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return rawUrl;
  }
  const host = u.hostname.toLowerCase();
  const rule = HOST_RULES[host];
  if (rule) {
    const out = rule(u);
    if (out) return out;
  }
  // Generic Wikipedia rule: any "<lang>.wikipedia.org" → "<lang>.m.wikipedia.org"
  const wikiM = host.match(/^([a-z\-]+)\.wikipedia\.org$/);
  if (wikiM && !host.includes('.m.')) {
    return `https://${wikiM[1]}.m.wikipedia.org${u.pathname}${u.search}`;
  }
  return rawUrl;
}

// Hosts that already serve a lite, no-JS-needed experience.  We render those
// directly in the WebView (URI mode) instead of running them through the
// HTML cleaner — that keeps native form posts and session cookies working.
const TRUSTED_LITE_HOSTS = new Set<string>([
  'mbasic.facebook.com',
  'm.facebook.com', // semi-lite, but native cookies/forms required for login
  'mobile.twitter.com',
  'm.youtube.com',
  'old.reddit.com',
  'i.reddit.com',
  'lite.duckduckgo.com',
  'html.duckduckgo.com',
]);

// Match any lang.m.wikipedia.org dynamically.
const TRUSTED_LITE_RE = /^[a-z\-]+\.m\.wikipedia\.org$/;

export function isTrustedLite(rawUrl: string): boolean {
  if (!rawUrl) return false;
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (TRUSTED_LITE_HOSTS.has(host)) return true;
    if (TRUSTED_LITE_RE.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}
