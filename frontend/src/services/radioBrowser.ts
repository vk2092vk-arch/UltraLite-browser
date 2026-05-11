// Free Radio Browser API client (radio-browser.info).
// Public, free, no API key. Uses random server pool.
// Spec: https://api.radio-browser.info/
//
// Build-#22 tuning — raise the default `bitrateMax` from 64 → 128 kbps so
// popular AIR J&K / Punjab / Regional FM channels (all 95-128 kbps MP3 on
// the Prasar Bharati CDN) surface in results.  64 kbps was filtering them
// out entirely — that's why users saw "channels missing" after the
// regional additions landed.  Individual callers can still override with a
// lower cap for ultra-low-bandwidth profiles.

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

// Every radio-browser.info request is wrapped in this timeout — on 2G links
// the server may accept the TCP handshake but never return body bytes,
// silently hanging the Radio screen forever.  Build #24: bumped 10s → 30s
// so the catalog API has a real chance to reply on sub-60 kbps links.
// Otherwise the station list never arrives and the user just sees an
// empty "No stations found" screen.
const RB_TIMEOUT_MS = 30000;
async function rbFetch(url: string): Promise<Response | null> {
  try {
    const ctrl = new AbortController();
    const tm = setTimeout(() => ctrl.abort(), RB_TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        headers: COMMON_HEADERS,
        signal: ctrl.signal,
      });
      return r;
    } finally {
      clearTimeout(tm);
    }
  } catch {
    return null;
  }
}

let cachedHost: string | null = null;
async function pickHost(): Promise<string> {
  if (cachedHost) return cachedHost;
  // try each, first to respond wins
  for (const h of BASE_HOSTS) {
    const r = await rbFetch(`${h}/json/stats`);
    if (r && r.ok) {
      cachedHost = h;
      return h;
    }
  }
  cachedHost = BASE_HOSTS[0];
  return cachedHost;
}

const COMMON_HEADERS = {
  'User-Agent': 'UltraLite/1.0 (Android)',
};

// Default bitrate policy — raised to 128 kbps in build #22 so 95/126 kbps
// AIR streams (the only rate tier most Indian government FM stations
// broadcast at) are visible.  2G users can still filter down via the
// explicit `maxBitrate` opt.
const DEFAULT_BITRATE_MAX = 128;
const DEFAULT_BITRATE_MIN = 24;

export interface Station {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  languagecodes: string;
  bitrate: number;
  codec: string;
  votes: number;
}

interface SearchOpts {
  category?: 'news' | 'sports' | 'music' | 'all';
  country?: string;
  language?: string;
  query?: string;
  maxBitrate?: number;
  minBitrate?: number;
  limit?: number;
  offset?: number;
}

const CATEGORY_TAGS: Record<string, string[]> = {
  news: ['news', 'talk', 'information'],
  sports: ['sport', 'sports', 'cricket', 'football'],
  music: ['music', 'pop', 'rock', 'hits', 'top 40', 'oldies', 'dance'],
};

export async function searchStations(opts: SearchOpts = {}): Promise<Station[]> {
  const host = await pickHost();
  const params = new URLSearchParams();
  params.set('hidebroken', 'true');
  params.set('order', 'votes');
  params.set('reverse', 'true');
  params.set('limit', String(opts.limit ?? 40));
  if (opts.offset) params.set('offset', String(opts.offset));
  const cap = opts.maxBitrate ?? DEFAULT_BITRATE_MAX;
  const floor = opts.minBitrate ?? DEFAULT_BITRATE_MIN;
  params.set('bitrateMax', String(cap));
  params.set('bitrateMin', String(floor));
  if (opts.country) params.set('country', opts.country);
  if (opts.language) params.set('language', opts.language.toLowerCase());
  if (opts.query) params.set('name', opts.query);

  const tag =
    opts.category && opts.category !== 'all'
      ? CATEGORY_TAGS[opts.category]?.[0]
      : undefined;
  if (tag) params.set('tag', tag);

  const url = `${host}/json/stations/search?${params.toString()}`;
  const r = await rbFetch(url);
  if (!r || !r.ok) return [];
  let data: Station[] = [];
  try {
    data = await r.json();
  } catch {
    return [];
  }
  const filtered = data.filter(
    (s) => s.bitrate > 0 && s.bitrate <= cap && !!s.url_resolved
  );
  if (filtered.length > 0 || !opts.query) return filtered;
  // ── Fuzzy fallback ──
  const tokens = opts.query
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean)
    .filter((t) => t !== 'fm' && t !== 'radio' && !/^\d+(\.\d+)?$/.test(t));
  for (const token of tokens) {
    const hits = await fuzzyHelper(host, token, {
      cap,
      floor,
      country: opts.country,
      language: opts.language,
      tag,
    });
    if (hits.length > 0) return hits;
  }
  const tagHits = await searchByTag(opts.query, {
    maxBitrate: cap,
    minBitrate: floor,
    limit: opts.limit ?? 40,
  });
  return tagHits;
}

// Internal helper for searchStations fallback (name OR tag match for one
// token).  Kept unexported — callers should use searchStations or
// searchByTag directly.
async function fuzzyHelper(
  host: string,
  token: string,
  ctx: {
    cap: number;
    floor: number;
    country?: string;
    language?: string;
    tag?: string;
  }
): Promise<Station[]> {
  const tryFetch = async (key: 'name' | 'tag') => {
    const p = new URLSearchParams();
    p.set('hidebroken', 'true');
    p.set('order', 'votes');
    p.set('reverse', 'true');
    p.set('limit', '40');
    p.set('bitrateMax', String(ctx.cap));
    p.set('bitrateMin', String(ctx.floor));
    p.set(key, token);
    if (ctx.country) p.set('country', ctx.country);
    if (ctx.language) p.set('language', ctx.language.toLowerCase());
    if (ctx.tag && key === 'name') p.set('tag', ctx.tag);
    const r = await rbFetch(`${host}/json/stations/search?${p.toString()}`);
    if (!r || !r.ok) return [];
    try {
      const d: Station[] = await r.json();
      return d.filter(
        (s) => s.bitrate > 0 && s.bitrate <= ctx.cap && !!s.url_resolved
      );
    } catch {
      return [];
    }
  };
  const byName = await tryFetch('name');
  if (byName.length > 0) return byName;
  return tryFetch('tag');
}

// Search by tag (for regional/state filters like Punjab, Kashmir, Bollywood).
export async function searchByTag(
  tag: string,
  opts: { maxBitrate?: number; minBitrate?: number; limit?: number } = {}
): Promise<Station[]> {
  const host = await pickHost();
  const params = new URLSearchParams();
  params.set('hidebroken', 'true');
  params.set('order', 'votes');
  params.set('reverse', 'true');
  params.set('limit', String(opts.limit ?? 40));
  const cap = opts.maxBitrate ?? DEFAULT_BITRATE_MAX;
  const floor = opts.minBitrate ?? DEFAULT_BITRATE_MIN;
  params.set('bitrateMax', String(cap));
  params.set('bitrateMin', String(floor));
  params.set('tag', tag);
  const r = await rbFetch(`${host}/json/stations/search?${params.toString()}`);
  if (!r || !r.ok) return [];
  try {
    const data: Station[] = await r.json();
    return data.filter(
      (s) => s.bitrate > 0 && s.bitrate <= cap && !!s.url_resolved
    );
  } catch {
    return [];
  }
}

// Optional: report a click to the metadata server (helps station ranking, no PII).
export async function reportClick(uuid: string) {
  const host = await pickHost();
  await rbFetch(`${host}/json/url/${uuid}`);
}

// Search by station name (free-text "name" filter on radio-browser.info).
export async function searchByName(
  name: string,
  opts: { maxBitrate?: number; minBitrate?: number; limit?: number; country?: string } = {}
): Promise<Station[]> {
  const host = await pickHost();
  const params = new URLSearchParams();
  params.set('hidebroken', 'true');
  params.set('order', 'votes');
  params.set('reverse', 'true');
  params.set('limit', String(opts.limit ?? 10));
  const cap = opts.maxBitrate ?? DEFAULT_BITRATE_MAX;
  const floor = opts.minBitrate ?? DEFAULT_BITRATE_MIN;
  params.set('bitrateMax', String(cap));
  params.set('bitrateMin', String(floor));
  params.set('name', name);
  if (opts.country) params.set('country', opts.country);
  const r = await rbFetch(`${host}/json/stations/search?${params.toString()}`);
  if (!r || !r.ok) return [];
  try {
    const data: Station[] = await r.json();
    return data.filter(
      (s) => s.bitrate > 0 && s.bitrate <= cap && !!s.url_resolved
    );
  } catch {
    return [];
  }
}

// Curated "India FM" featured roster.  Each entry is just a NAME passed to
// radio-browser.info — the actual stream URL/UUID comes from the public
// catalog (no hardcoded broadcaster URLs).  Keeps us policy-safe: every
// station is a validated public listing.
//
// Mix of (a) Government-run All India Radio / Akashvani channels — fully
// open; and (b) major private FM brands that have opted into the public
// radio-browser.info catalog.  Bitrate cap raised to 128 kbps in build #22
// so AIR's 95/126 kbps J&K/Punjab/regional streams surface — they have no
// low-bit alternative on the Prasar Bharati CDN.
export const INDIA_FM_FEATURED: { name: string; label: string }[] = [
  // ---- Government / All India Radio (always policy-safe) ----
  { name: 'AIR FM Rainbow', label: 'AIR FM Rainbow (92.7)' },
  { name: 'Vividh Bharati', label: 'AIR Vividh Bharati' },
  { name: 'AIR FM Gold', label: 'AIR FM Gold (106.4)' },
  { name: 'Akashvani', label: 'Akashvani (AIR National)' },
  { name: 'AIR News', label: 'AIR News' },
  { name: 'AIR Delhi', label: 'AIR Delhi' },
  { name: 'AIR Mumbai', label: 'AIR Mumbai' },
  { name: 'AIR Chennai', label: 'AIR Chennai' },
  { name: 'AIR Kolkata', label: 'AIR Kolkata' },
  { name: 'AIR Bengaluru', label: 'AIR Bengaluru' },
  // ---- Major private FM brands (public listings) ----
  { name: 'Radio Mirchi', label: 'Radio Mirchi 98.3' },
  { name: 'Big FM', label: 'Big FM 92.7' },
  { name: 'Red FM', label: 'Red FM 93.5' },
  { name: 'Radio City', label: 'Radio City 91.1' },
  { name: 'Fever FM', label: 'Fever FM 104' },
  { name: 'Hello FM', label: 'Hello FM 106.4' },
  { name: 'Suryan FM', label: 'Suryan FM 93.5' },
  { name: 'My FM', label: 'My FM 94.3' },
  { name: 'Radio Indigo', label: 'Radio Indigo 91.9' },
  { name: 'Club FM', label: 'Club FM 94.3' },
];

// ──────── Jammu & Kashmir free FM roster ────────
// All Prasar Bharati / All India Radio public streams — free, government
// broadcasters, 95-128 kbps MP3 on the public AIR CDN.
export const INDIA_FM_JK: { name: string; label: string }[] = [
  { name: 'AIR Srinagar', label: 'AIR Srinagar' },
  { name: 'AIR Jammu', label: 'AIR Jammu' },
  { name: 'AIR Leh', label: 'AIR Leh / Ladakh' },
  { name: 'AIR Kargil', label: 'AIR Kargil' },
  { name: 'AIR Kupwara', label: 'AIR Kupwara' },
  { name: 'AIR Kathua', label: 'AIR Kathua' },
  { name: 'AIR Poonch', label: 'AIR Poonch' },
  { name: 'AIR Bhaderwah', label: 'AIR Bhaderwah' },
  { name: 'Radio Kashmir', label: 'Radio Kashmir' },
  { name: 'Kashmir Vatika', label: 'Kashmir Vatika' },
];

// ──────── Punjab free FM roster ────────
export const INDIA_FM_PUNJAB: { name: string; label: string }[] = [
  { name: 'AIR Jalandhar', label: 'AIR Jalandhar (FM Rainbow)' },
  { name: 'AIR Amritsar', label: 'AIR Amritsar' },
  { name: 'AIR Punjabi', label: 'AIR Punjabi' },
  { name: 'AIR Bathinda', label: 'AIR Bathinda' },
  { name: 'AIR Patiala', label: 'AIR Patiala' },
  { name: 'AIR Hoshiarpur', label: 'AIR Hoshiarpur' },
  { name: 'AIR Chandigarh', label: 'AIR Chandigarh' },
  { name: 'Akashvani Bathinda', label: 'Akashvani Bathinda' },
  { name: 'Radio Mirchi Punjabi', label: 'Radio Mirchi Punjabi' },
  { name: 'Radio Mantra', label: 'Radio Mantra (Punjab)' },
  { name: 'Punjabi FM', label: 'Punjabi FM' },
  { name: 'Desi Punjabi', label: 'Desi Punjabi Radio' },
];

// ──────── AsyncStorage cache for featured rosters ────────
// The 20+ per-name lookups against radio-browser.info are the single biggest
// network cost on the Radio tab.  Cache the result for 24 h so returning
// users see the list instantly (and continue to see it when the catalog
// API is unreachable on 2G).
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data as T;
  } catch {
    return null;
  }
}
async function writeCache(key: string, data: unknown) {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

// Codec scoring used when picking the "best" entry per station name.
const codecScore = (codec: string): number => {
  const c = (codec || '').toLowerCase();
  if (c.includes('aac')) return 3; // aac, aac+, he-aac, he-aacv2
  if (c.includes('opus')) return 2;
  if (c.includes('mp3')) return 1;
  return 0;
};

// Load a roster of named stations sequentially-batched (3 parallel at a
// time) with per-request timeouts.  Parallelising all 20+ lookups at once
// floods a 2G link with TCP/TLS handshakes, making EVERY request slow /
// time out.  Batches of 3 are small enough to finish cleanly even on a
// 20-30 kbps connection.  Result is cached in AsyncStorage for 24 h.
async function loadFeaturedRoster(
  roster: { name: string; label: string }[],
  cacheKey: string,
  opts: { maxBitrate?: number; country?: string } = {}
): Promise<Station[]> {
  // 1. Cache hit — return instantly.
  const cached = await readCache<Station[]>(cacheKey);
  if (cached && cached.length > 0) {
    // Kick off a background refresh without blocking (users always get
    // the latest catalog state on the *next* visit).
    refreshRoster(roster, cacheKey, opts).catch(() => {});
    return cached;
  }
  return refreshRoster(roster, cacheKey, opts);
}

async function refreshRoster(
  roster: { name: string; label: string }[],
  cacheKey: string,
  opts: { maxBitrate?: number; country?: string }
): Promise<Station[]> {
  const cap = opts.maxBitrate ?? DEFAULT_BITRATE_MAX;
  const country = opts.country; // undefined → global (covers AIR streams hosted under "India" and elsewhere)
  const out: Station[] = [];
  const seen = new Set<string>();
  const BATCH = 3;
  for (let i = 0; i < roster.length; i += BATCH) {
    const batch = roster.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((f) =>
        searchByName(f.name, {
          country,
          limit: 5,
          maxBitrate: cap,
          minBitrate: DEFAULT_BITRATE_MIN,
        }).catch(() => [])
      )
    );
    for (const list of results) {
      if (!list || list.length === 0) continue;
      // Prefer lowest bitrate (better 2G), then AAC > Opus > MP3.
      const sorted = [...list].sort((a, b) => {
        if (a.bitrate !== b.bitrate) return a.bitrate - b.bitrate;
        return codecScore(b.codec) - codecScore(a.codec);
      });
      const top = sorted[0];
      if (!top || seen.has(top.stationuuid)) continue;
      seen.add(top.stationuuid);
      out.push(top);
    }
  }
  if (out.length > 0) writeCache(cacheKey, out).catch(() => {});
  return out;
}

/** Load the featured Indian FM roster (national mix). */
export async function loadIndiaFmFeatured(): Promise<Station[]> {
  return loadFeaturedRoster(INDIA_FM_FEATURED, '@ul/cache/fm_india_v2', {
    country: 'India',
  });
}

/** Load the Jammu & Kashmir free FM roster. */
export async function loadJkFmFeatured(): Promise<Station[]> {
  return loadFeaturedRoster(INDIA_FM_JK, '@ul/cache/fm_jk_v2', {
    country: 'India',
  });
}

/** Load the Punjab free FM roster. */
export async function loadPunjabFmFeatured(): Promise<Station[]> {
  return loadFeaturedRoster(INDIA_FM_PUNJAB, '@ul/cache/fm_punjab_v2', {
    country: 'India',
  });
}

export const COUNTRIES = [
  { code: '', label: 'Worldwide' },
  { code: 'India', label: 'India' },
  { code: 'Pakistan', label: 'Pakistan' },
  { code: 'Bangladesh', label: 'Bangladesh' },
  { code: 'Nepal', label: 'Nepal' },
  { code: 'Sri Lanka', label: 'Sri Lanka' },
  { code: 'United States', label: 'USA' },
  { code: 'United Kingdom', label: 'UK' },
  { code: 'United Arab Emirates', label: 'UAE' },
  { code: 'Saudi Arabia', label: 'Saudi Arabia' },
  { code: 'Germany', label: 'Germany' },
  { code: 'France', label: 'France' },
  { code: 'Brazil', label: 'Brazil' },
  { code: 'Japan', label: 'Japan' },
  { code: 'Russia', label: 'Russia' },
  { code: 'Australia', label: 'Australia' },
];

export const LANGUAGES = [
  { code: '', label: 'Any Language' },
  { code: 'hindi', label: 'Hindi' },
  { code: 'punjabi', label: 'Punjabi' },
  { code: 'kashmiri', label: 'Kashmiri' },
  { code: 'urdu', label: 'Urdu' },
  { code: 'english', label: 'English' },
  { code: 'tamil', label: 'Tamil' },
  { code: 'telugu', label: 'Telugu' },
  { code: 'kannada', label: 'Kannada' },
  { code: 'malayalam', label: 'Malayalam' },
  { code: 'marathi', label: 'Marathi' },
  { code: 'bengali', label: 'Bengali' },
  { code: 'gujarati', label: 'Gujarati' },
  { code: 'spanish', label: 'Spanish' },
  { code: 'arabic', label: 'Arabic' },
  { code: 'french', label: 'French' },
  { code: 'german', label: 'German' },
  { code: 'portuguese', label: 'Portuguese' },
  { code: 'russian', label: 'Russian' },
  { code: 'chinese', label: 'Chinese' },
  { code: 'japanese', label: 'Japanese' },
];

// NOTE: `INDIA_REGION_TAGS` (Punjab/J&K etc via free-form radio-browser tag
// search) was removed in build #22 — the public catalog has very thin
// tagging coverage for Indian regional languages, so those chips rendered
// empty lists 95 % of the time. They're superseded by the dedicated
// "🏔️ J&K" and "ਪੰਜਾਬ Punjab" categories which use curated name-lookups
// against AIR's public stations.
