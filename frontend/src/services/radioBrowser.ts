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
  // Strict bitrate cap for 2G — prefer ≤ 48 kbps, minimum 24 kbps.
  params.set('bitrateMax', String(opts.maxBitrate ?? 48));
  params.set('bitrateMin', String(opts.minBitrate ?? 24));
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
    // Additional client-side cap (some servers ignore bitrateMax).
    return data.filter(
      (s) => s.bitrate <= (opts.maxBitrate ?? 48) && !!s.url_resolved
    );
  } catch (e) {
    console.warn('[radio] search err', e);
    return [];
  }
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
  params.set('bitrateMax', String(opts.maxBitrate ?? 48));
  params.set('bitrateMin', String(opts.minBitrate ?? 24));
  params.set('tag', tag);
  try {
    const r = await fetch(
      `${host}/json/stations/search?${params.toString()}`,
      { headers: COMMON_HEADERS }
    );
    if (!r.ok) return [];
    const data: Station[] = await r.json();
    return data.filter(
      (s) => s.bitrate <= (opts.maxBitrate ?? 48) && !!s.url_resolved
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
