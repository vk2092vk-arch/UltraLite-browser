// Free Radio Browser API client (radio-browser.info), 64kbps low-bitrate filter.
// Public, free, no API key. Uses random server pool.
// Spec: https://api.radio-browser.info/

const BASE_HOSTS = [
  'https://de1.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];

let cachedHost: string | null = null;
async function pickHost(): Promise<string> {
  if (cachedHost) return cachedHost;
  // try each, first to respond wins
  for (const h of BASE_HOSTS) {
    try {
      const r = await fetch(`${h}/json/stats`, { method: 'GET' });
      if (r.ok) {
        cachedHost = h;
        return h;
      }
    } catch {}
  }
  cachedHost = BASE_HOSTS[0];
  return cachedHost;
}

const COMMON_HEADERS = {
  'User-Agent': 'UltraLite/1.0 (Android)',
};

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
  // 2G bitrate cap: ≤ 64 kbps covers all 32 / 48 / 64 kbps streams and
  // anything below — they all play smoothly on a 2G/EDGE link with at
  // least a small headroom margin.  Min 24 kbps filters out broken/zero
  // entries the catalog occasionally returns.
  const cap = opts.maxBitrate ?? 64;
  const floor = opts.minBitrate ?? 24;
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
  try {
    const r = await fetch(url, { headers: COMMON_HEADERS });
    if (!r.ok) return [];
    const data: Station[] = await r.json();
    // Hard client-side cap (some servers ignore bitrateMax) and drop any
    // station with zero / negative bitrate (catalog noise — those streams
    // are unreliable and cause buffering loops).
    const filtered = data.filter(
      (s) => s.bitrate > 0 && s.bitrate <= cap && !!s.url_resolved
    );
    if (filtered.length > 0 || !opts.query) return filtered;
    // ── Fallback search ───────────────────────────────────────────────
    // Strict `name` match on radio-browser is case-insensitive but
    // requires a literal substring — searches like "92.7 FM", "FM 95",
    // "Mirchi 98.3" frequently return 0 hits because catalog station
    // names rarely embed the exact frequency string.  Run a fuzzy
    // fallback: split into tokens, drop "fm"/"radio"/numbers, and try
    // each remaining token as both a name match AND a tag match. First
    // non-empty result wins.
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
    // Last-ditch tag fallback on the original query string.
    const tagHits = await searchByTag(opts.query, {
      maxBitrate: cap,
      minBitrate: floor,
      limit: opts.limit ?? 40,
    });
    return tagHits;
  } catch (e) {
    console.warn('[radio] search err', e);
    return [];
  }
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
    try {
      const r = await fetch(
        `${host}/json/stations/search?${p.toString()}`,
        { headers: COMMON_HEADERS }
      );
      if (!r.ok) return [];
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
  const cap = opts.maxBitrate ?? 64;
  const floor = opts.minBitrate ?? 24;
  params.set('bitrateMax', String(cap));
  params.set('bitrateMin', String(floor));
  params.set('tag', tag);
  try {
    const r = await fetch(
      `${host}/json/stations/search?${params.toString()}`,
      { headers: COMMON_HEADERS }
    );
    if (!r.ok) return [];
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
  try {
    const host = await pickHost();
    await fetch(`${host}/json/url/${uuid}`, { headers: COMMON_HEADERS });
  } catch {}
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
  params.set('bitrateMax', String(opts.maxBitrate ?? 64));
  params.set('bitrateMin', String(opts.minBitrate ?? 24));
  params.set('name', name);
  if (opts.country) params.set('country', opts.country);
  try {
    const r = await fetch(
      `${host}/json/stations/search?${params.toString()}`,
      { headers: COMMON_HEADERS }
    );
    if (!r.ok) return [];
    const data: Station[] = await r.json();
    return data.filter(
      (s) => s.bitrate <= (opts.maxBitrate ?? 64) && !!s.url_resolved
    );
  } catch {
    return [];
  }
}

// Curated "India FM" featured roster.  Each entry is just a NAME passed to
// radio-browser.info — the actual stream URL/UUID comes from the public
// catalog (no hardcoded broadcaster URLs).  This keeps us policy-safe:
// every station is a validated public listing on the open directory.
//
// Mix of (a) Government-run All India Radio / Akashvani channels — fully
// open; and (b) major private FM brands that have explicitly opted into the
// public radio-browser.info catalog.  Bitrate is capped at ≤ 64 kbps in
// loadIndiaFmFeatured() to keep the 2G promise.
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

/** Load the featured Indian FM roster.  Runs the searches in parallel.
 *  For each station NAME we pick the entry with the LOWEST bitrate that
 *  still has a valid stream URL — that's the smoothest play on 32-64 kbps
 *  links.  AAC / AAC+ codecs are preferred over MP3 (better quality at
 *  low bitrates).  Dedupes by stationuuid. */
export async function loadIndiaFmFeatured(): Promise<Station[]> {
  const results = await Promise.all(
    INDIA_FM_FEATURED.map((f) =>
      searchByName(f.name, { country: 'India', limit: 8, maxBitrate: 64 })
    )
  );
  const out: Station[] = [];
  const seen = new Set<string>();
  const codecScore = (codec: string): number => {
    const c = (codec || '').toLowerCase();
    if (c.includes('aac')) return 3; // aac, aac+, he-aac, he-aacv2
    if (c.includes('opus')) return 2;
    if (c.includes('mp3')) return 1;
    return 0;
  };
  for (const list of results) {
    if (!list || list.length === 0) continue;
    // Sort: lowest bitrate first; if tied, prefer AAC > Opus > MP3.
    const sorted = [...list].sort((a, b) => {
      if (a.bitrate !== b.bitrate) return a.bitrate - b.bitrate;
      return codecScore(b.codec) - codecScore(a.codec);
    });
    const top = sorted[0];
    if (!top || seen.has(top.stationuuid)) continue;
    seen.add(top.stationuuid);
    out.push(top);
  }
  return out;
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

// India regional state tags — Radio Browser API uses free-form tags;
// these are the common ones that surface J&K, Punjab, etc.
export const INDIA_REGION_TAGS = [
  { tag: 'punjabi', label: 'Punjab / Punjabi' },
  { tag: 'kashmiri', label: 'Jammu & Kashmir' },
  { tag: 'bollywood', label: 'Bollywood' },
  { tag: 'bhajan', label: 'Bhajan / Devotional' },
  { tag: 'tamil', label: 'Tamil Nadu' },
  { tag: 'telugu', label: 'Telangana / AP' },
  { tag: 'kannada', label: 'Karnataka' },
  { tag: 'malayalam', label: 'Kerala' },
  { tag: 'marathi', label: 'Maharashtra' },
  { tag: 'bengali', label: 'West Bengal' },
  { tag: 'gujarati', label: 'Gujarat' },
  { tag: 'assamese', label: 'Assam' },
  { tag: 'odia', label: 'Odisha' },
  { tag: 'haryanvi', label: 'Haryana' },
  { tag: 'rajasthani', label: 'Rajasthan' },
];
