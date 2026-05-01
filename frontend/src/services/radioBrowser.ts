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
  // strict bitrate cap for 2G
  params.set('bitrateMax', String(opts.maxBitrate ?? 64));
  if (opts.minBitrate !== undefined) {
    params.set('bitrateMin', String(opts.minBitrate));
  }
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
    // additional client-side cap (some servers ignore bitrateMax)
    return data.filter(
      (s) => s.bitrate <= (opts.maxBitrate ?? 64) && !!s.url_resolved
    );
  } catch (e) {
    console.warn('[radio] search err', e);
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
  { code: 'United States', label: 'USA' },
  { code: 'United Kingdom', label: 'UK' },
  { code: 'Pakistan', label: 'Pakistan' },
  { code: 'Bangladesh', label: 'Bangladesh' },
  { code: 'Germany', label: 'Germany' },
  { code: 'France', label: 'France' },
  { code: 'Brazil', label: 'Brazil' },
  { code: 'Japan', label: 'Japan' },
  { code: 'Russia', label: 'Russia' },
  { code: 'Australia', label: 'Australia' },
];

export const LANGUAGES = [
  { code: '', label: 'Any Language' },
  { code: 'english', label: 'English' },
  { code: 'hindi', label: 'Hindi' },
  { code: 'urdu', label: 'Urdu' },
  { code: 'spanish', label: 'Spanish' },
  { code: 'arabic', label: 'Arabic' },
  { code: 'french', label: 'French' },
  { code: 'german', label: 'German' },
  { code: 'portuguese', label: 'Portuguese' },
  { code: 'russian', label: 'Russian' },
  { code: 'chinese', label: 'Chinese' },
  { code: 'japanese', label: 'Japanese' },
];
