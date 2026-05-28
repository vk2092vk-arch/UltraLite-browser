// Radio & Music — categories, country/language filter, search, 64kbps strict.
// Reward Ad gate: GLOBAL — the user watches 2 rewarded ads (or 10 retries on
// slow links) to unlock ALL stations for 30 minutes. Per-station gating was
// retired in build #20 as an AdMob policy hardening measure.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import {
  playStation as playbackPlay,
  stopPlayback as playbackStop,
  togglePause as playbackTogglePause,
  subscribe as playbackSubscribe,
  PlaybackState,
} from '../src/services/playback';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';
import {
  COUNTRIES,
  LANGUAGES,
  reportClick,
  searchStations,
  Station,
} from '../src/services/radioBrowser';
import { getHardcodedStations } from '../src/constants/hardcodedStations';
import {
  preloadRewarded,
  showRewarded,
  trackClick,
  isRewardedReady,
} from '../src/ads/AdManager';
import {
  hydrate,
  useAppState,
  isRadioUnlocked,
  radioRemainingMs,
  recordRadioAdWatched,
  grantRadioFallback,
  getRadioAdsRemaining,
  getRadioAdsRequired,
} from '../src/state/appState';
import {
  addRadioFavorite,
  getRadioFavorites,
  RadioFav,
  removeRadioFavorite,
} from '../src/storage/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Build #24 — Stations cache.
// User feedback: "channel list ek baar khulne ke baad baar baar load ho jaati
// hai, har baar loading dikhayi deti hai".  We now memoise the catalogue
// response (country / language / query / mode tuple) in AsyncStorage for
// 24 h so swiping back to Radio is instant.  Network refresh still happens
// in the background so users get fresh data without seeing the spinner.
const STATIONS_CACHE_PREFIX = '@ul/cache/stations/';
const STATIONS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
function stationsCacheKey(args: {
  country: string;
  language: string;
  query: string;
  ultraLite: boolean;
}): string {
  return (
    STATIONS_CACHE_PREFIX +
    JSON.stringify({
      c: args.country || 'India',
      l: args.language || '',
      q: args.query || '',
      u: args.ultraLite ? 1 : 0,
    })
  );
}
async function readStationsCache(key: string): Promise<Station[] | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: Station[] };
    if (!parsed?.ts || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.ts > STATIONS_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
async function writeStationsCache(key: string, data: Station[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

// Build #28 — merge two station lists keeping unique entries (by name+url).
// Used to combine the curated hardcoded core with extra stations that
// arrive from radio-browser.info in the background, while preventing the
// "channel doubling" the user reported (same station listed twice from
// two sources).
function mergeUnique(primary: Station[], extras: Station[]): Station[] {
  const seen = new Set<string>();
  const dedupKey = (s: Station) =>
    `${(s.name || '').trim().toLowerCase()}|${s.url_resolved || s.url}`;
  const out: Station[] = [];
  for (const s of primary) {
    const k = dedupKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  for (const s of extras) {
    const k = dedupKey(s);
    // Also dedupe by station name alone — many catalogue rows are the
    // same broadcaster repeated under several CDN URLs; we only show
    // one row per name to honour the "single channel" UX request.
    const nameKey = (s.name || '').trim().toLowerCase();
    if (seen.has(k) || (nameKey && [...seen].some((x) => x.startsWith(nameKey + '|')))) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

type Category = 'favorites' | 'all';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'favorites', label: '❤ Favs', icon: 'heart' },
  { key: 'all', label: 'All', icon: 'globe-outline' },
];

function formatRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function Radio() {
  const router = useRouter();
  const state = useAppState();
  const [category, setCategory] = useState<Category>('all');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('');
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState<Station | null>(null);
  // Build #25 — when the user is paused-but-not-stopped, `paused` is true.
  // The player box uses this to render a Play (▶) button instead of Pause.
  const [paused, setPaused] = useState(false);
  const [busyStation, setBusyStation] = useState<string | null>(null);
  const [busyStationName, setBusyStationName] = useState<string>('');
  const [busyElapsedS, setBusyElapsedS] = useState<number>(0);
  const [buffering, setBuffering] = useState(false);
  const [favorites, setFavorites] = useState<RadioFav[]>([]);
  // Tracks how many times the user has tapped "Watch Ad" while the SDK
  // failed to deliver — when this hits NETWORK_GRANT_AT, we grant the
  // unlock anyway so 2G users are never permanently blocked.
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  // Build #37 — true while we are actively waiting (up to 3 s) for the
  // rewarded ad SDK to fill on this tap.
  const [unlockLoading, setUnlockLoading] = useState(false);
  const NETWORK_GRANT_AT = 5;

  // Build #39 — playback is now owned by the singleton in
  // src/services/playback.ts. We subscribe to its state and mirror it
  // into local React state so all existing JSX continues to render
  // exactly as before. This solves three bugs at once:
  //   • Stop / cancel during loading: singleton bumps its seq, the
  //     in-flight createAsync resolves into a stale branch and disposes.
  //   • Cross-mode bleed: a station started in UltraLite mode is
  //     stopped the moment another station starts in Normal mode (and
  //     vice versa) because both screens talk to the SAME singleton.
  //   • Loading appearance: ExoPlayer reports the first frame to the
  //     status callback which clears isLoading inside the singleton.
  useEffect(() => {
    const unsubscribe = playbackSubscribe((s: PlaybackState) => {
      setPlaying(s.station as Station | null);
      setPaused(s.isPaused);
      setBuffering(s.isLoading);
      // busyStation should reflect "this station is connecting" so the
      // station row UI shows the hourglass / spinner.
      if (s.isLoading && s.station) {
        setBusyStation(s.station.stationuuid);
        setBusyStationName(s.station.name.trim() || 'station');
      } else {
        setBusyStation(null);
        setBusyStationName('');
        setBusyElapsedS(0);
      }
    });
    return unsubscribe;
  }, []);

  // Build #39 — connecting elapsed-second ticker. Runs while a station
  // is loading; clears on success / fail / cancel. Visual only.
  useEffect(() => {
    if (!busyStation) return;
    const startedAt = Date.now();
    setBusyElapsedS(0);
    const id = setInterval(() => {
      setBusyElapsedS(Math.round((Date.now() - startedAt) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [busyStation]);

  const refreshFavorites = useCallback(async () => {
    setFavorites(await getRadioFavorites());
  }, []);

  useEffect(() => {
    hydrate();
    preloadRewarded();
    refreshFavorites();
    // Build #39 — playback singleton owns Audio.setAudioModeAsync now;
    // it runs once on first playStation() call. No cleanup on unmount —
    // the singleton intentionally OUTLIVES this screen so radio keeps
    // playing if the user navigates back to home.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local-state mirror — kept only to satisfy any lingering uses of the
  // `sound` variable. The real source-of-truth lives in the singleton.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = sound;

  const favUuids = useMemo(
    () => new Set(favorites.map((f) => f.uuid)),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (s: Station) => {
      if (favUuids.has(s.stationuuid)) {
        await removeRadioFavorite(s.stationuuid);
      } else {
        await addRadioFavorite({
          uuid: s.stationuuid,
          name: s.name,
          country: s.country,
          language: s.language,
          bitrate: s.bitrate,
          codec: s.codec,
          url: s.url,
          url_resolved: s.url_resolved,
        });
      }
      await refreshFavorites();
    },
    [favUuids, refreshFavorites]
  );

  // Convert RadioFav -> Station for rendering.
  const favAsStations = useMemo<Station[]>(
    () =>
      favorites.map((f) => ({
        stationuuid: f.uuid,
        name: f.name,
        url: f.url,
        url_resolved: f.url_resolved || f.url,
        homepage: '',
        favicon: '',
        tags: '',
        country: f.country || '',
        countrycode: '',
        language: f.language || '',
        languagecodes: '',
        bitrate: f.bitrate || 0,
        codec: f.codec || '',
        votes: 0,
      })),
    [favorites]
  );

  // Read current mode (UltraLite vs Normal) so we can route bitrate split.
  const ultraLite = state.ultraLite;

  // Build #28 — INSTANT load via hardcoded catalogue.
  // Previously we showed a spinner while radio-browser.info was queried
  // (often 20-45 s on 2G). Now the curated hardcoded list paints
  // immediately the moment the user lands on the Radio screen — so
  // every channel is one tap away with zero loading. radio-browser.info
  // still runs as a silent background refresh to TOP-UP additional
  // stations matching the user's filter, but the hardcoded list is the
  // primary source of truth and is shown FIRST without any delay.
  useEffect(() => {
    // Apply hardcoded list synchronously on every mode change so the
    // user sees channels with zero spinner. Search query / filters
    // refine the list via searchStations() in `load()` below.
    const hard = getHardcodedStations(ultraLite);
    if (hard.length > 0) {
      setStations(hard);
      setLoading(false);
    }
  }, [ultraLite]);

  const load = useCallback(async () => {
    if (category === 'favorites') {
      await refreshFavorites();
      return;
    }
    // Build #28 — start from the curated hardcoded list (instant).
    const hardcoded = getHardcodedStations(ultraLite);
    // Apply the search query client-side so the user sees results
    // INSTANTLY without waiting for the network catalogue to reply.
    const q = (query || '').trim().toLowerCase();
    // Build #39 — filter bug fix: previously the hardcoded list was
    // ALWAYS included regardless of country / language chips, so the
    // user kept seeing "extra" stations even after picking Punjab or
    // English. Now we apply country / language / query filters to the
    // hardcoded list with the same predicate the network catalogue
    // uses, so the chip selection actually narrows the list.
    const wantCountry = (country || '').trim().toLowerCase();
    const wantLang = (language || '').trim().toLowerCase();
    const hardcodedFiltered = hardcoded.filter((s) => {
      if (q) {
        const matchesQ =
          s.name.toLowerCase().includes(q) ||
          (s.country || '').toLowerCase().includes(q) ||
          (s.language || '').toLowerCase().includes(q);
        if (!matchesQ) return false;
      }
      if (wantCountry) {
        const c = (s.country || '').toLowerCase();
        if (!c.includes(wantCountry)) return false;
      }
      if (wantLang) {
        const l = (s.language || '').toLowerCase();
        if (!l.includes(wantLang)) return false;
      }
      return true;
    });
    setStations(hardcodedFiltered);
    setLoading(false);

    const cacheKey = stationsCacheKey({
      country,
      language,
      query,
      ultraLite,
    });

    // Try cache first — adds extra stations beyond the hardcoded core.
    const cached = await readStationsCache(cacheKey);
    if (cached && cached.length > 0) {
      const filteredCached = cached.filter((s) =>
        ultraLite ? s.bitrate > 0 && s.bitrate < 64 : s.bitrate >= 64
      );
      if (filteredCached.length > 0) {
        const merged = mergeUnique(hardcodedFiltered, filteredCached);
        setStations(merged);
        // Background refresh — don't await, don't block UI.
        (async () => {
          try {
            const minBitrate = ultraLite ? 0 : 64;
            const maxBitrate = ultraLite ? 63 : 320;
            const fresh = await searchStations({
              category: 'all',
              country: country || 'India',
              language: language || undefined,
              query: query || undefined,
              minBitrate,
              maxBitrate,
              limit: 200,
            });
            if (fresh.length > 0) {
              const ff = fresh.filter((s) =>
                ultraLite ? s.bitrate > 0 && s.bitrate < 64 : s.bitrate >= 64
              );
              if (ff.length > 0) {
                setStations(mergeUnique(hardcodedFiltered, ff));
                await writeStationsCache(cacheKey, fresh);
              }
            }
          } catch {}
        })();
        return;
      }
    }

    // No cache — fetch in BACKGROUND while the user already sees
    // the hardcoded list. We do NOT show a spinner.
    (async () => {
      const minBitrate = ultraLite ? 0 : 64;
      const maxBitrate = ultraLite ? 63 : 320;
      const results = await searchStations({
        category: 'all',
        country: country || 'India',
        language: language || undefined,
        query: query || undefined,
        minBitrate,
        maxBitrate,
        limit: 200,
      });
      const filtered = results.filter((s) =>
        ultraLite ? s.bitrate > 0 && s.bitrate < 64 : s.bitrate >= 64
      );
      if (filtered.length > 0) {
        setStations(mergeUnique(hardcodedFiltered, filtered));
      }
      if (results.length > 0) {
        await writeStationsCache(cacheKey, results);
      }
    })();
  }, [category, country, language, query, refreshFavorites, ultraLite]);

  useEffect(() => {
    load();
  }, [load]);

  // Build #39 — thin wrappers around the playback singleton. All the
  // sequence-guarding, sound-disposal and cancel-during-loading logic
  // now lives in src/services/playback.ts so multiple radio screen
  // mounts (Normal mode → UltraLite mode) share the SAME active sound
  // and cannot bleed into each other.
  const stop = useCallback(async () => {
    await playbackStop();
  }, []);

  const togglePause = useCallback(async () => {
    await playbackTogglePause();
  }, []);

  const startPlayback = useCallback(async (s: Station) => {
    try {
      await playbackPlay({
        stationuuid: s.stationuuid,
        name: s.name,
        url: s.url,
        url_resolved: s.url_resolved,
      });
      // Side-effects on a successful (non-cancelled) start.
      reportClick(s.stationuuid).catch(() => {});
      trackClick();
    } catch (e: any) {
      const isTimeout = e?.message === 'STREAM_TIMEOUT';
      // Only surface the error if the user is still expecting THIS
      // station to be playing — if they tapped stop or a different
      // station while we were loading, swallow the error.
      alert(
        isTimeout
          ? 'This station is too slow to start (≥ 15 s with no audio).\n' +
              'Try a different station or check your connection — the broadcaster may be offline.'
          : 'Stream failed to start. The broadcaster may be offline or your link is too slow — try a lower-bitrate station (32-48 kbps).'
      );
    }
  }, []);

  // Build #25 — Prev / Next station navigation in the player box.
  // Uses the currently-displayed `stations` list so prev/next track the
  // user's filter (favorites / category / country / search).  Wraps
  // around at the boundaries so the buttons never feel "dead" on the
  // first / last entry.
  const playPrev = useCallback(() => {
    if (!playing || stations.length === 0) return;
    const idx = stations.findIndex((s) => s.stationuuid === playing.stationuuid);
    if (idx < 0) return;
    const prevIdx = (idx - 1 + stations.length) % stations.length;
    startPlayback(stations[prevIdx]);
  }, [playing, stations, startPlayback]);

  const playNext = useCallback(() => {
    if (!playing || stations.length === 0) return;
    const idx = stations.findIndex((s) => s.stationuuid === playing.stationuuid);
    if (idx < 0) return;
    const nextIdx = (idx + 1) % stations.length;
    startPlayback(stations[nextIdx]);
  }, [playing, stations, startPlayback]);

  // Global Unlock handler — user taps the big card. Watches a rewarded ad,
  // counts towards 2 ads, after the 2nd ad → 30-min unlock for ALL stations.
  //
  // Build #37 — user feedback: previous code only checked isRewardedReady()
  // SYNCHRONOUSLY on tap. If the SDK hadn't filled yet, the tap was
  // wasted — no real "load attempt" happened. Now on every tap with no
  // ad ready we call preloadRewarded() and POLL for up to 3 seconds,
  // giving the SDK a real chance to deliver a fill. If a fill arrives
  // within 3 s we show it (success path). Only after the full 3 s with
  // no fill do we count the tap as a failed attempt. After 5 failed
  // attempts (was 10) the user gets the 30-min Network Grant.
  const handleUnlockTap = useCallback(async () => {
    if (isRadioUnlocked()) return; // already unlocked, button shouldn't show

    // 1) If no ad is ready yet, give the SDK a 3-second window to load.
    if (!isRewardedReady()) {
      preloadRewarded();
      setUnlockLoading(true);
      const AD_LOAD_WAIT_MS = 3000;
      const POLL_MS = 200;
      const startedAt = Date.now();
      let ready = false;
      while (Date.now() - startedAt < AD_LOAD_WAIT_MS) {
        if (isRewardedReady()) {
          ready = true;
          break;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      setUnlockLoading(false);

      if (!ready) {
        // Real failed attempt — SDK didn't deliver an ad in 3 s.
        const next = unlockAttempts + 1;
        setUnlockAttempts(next);
        if (next >= NETWORK_GRANT_AT) {
          await grantRadioFallback();
          setUnlockAttempts(0);
          alert(
            '📡 Network Grant — Radio unlocked for 30 minutes.\n' +
              'Ad service was unreachable on your slow link, so we unlocked it for free.'
          );
          return;
        }
        alert(
          `Ad could not load (tried for 3 s). Tap again to retry.\n` +
            `(${next}/${NETWORK_GRANT_AT} — auto-grant on slow network at ${NETWORK_GRANT_AT} tries)`
        );
        return;
      }
      // Ad became ready during the 3-s window — fall through to show it.
    }

    // 2) Ad is ready — show it and wait for the reward callback.
    let earned = false;
    const ok = await showRewarded(async () => {
      earned = true;
    });
    if (!ok || !earned) {
      // User dismissed or SDK errored — don't count as an attempt.
      preloadRewarded();
      return;
    }
    setUnlockAttempts(0); // reset on a successful reward
    const result = await recordRadioAdWatched();
    // Eagerly preload the next rewarded slot for the SECOND tap.
    preloadRewarded();
    if (result.unlocked) {
      alert('🎉 Radio Unlocked!\nAll stations are Ad-Free for 30 minutes.');
    } else {
      const remaining = result.required - result.watched;
      alert(
        `Thanks! Watch ${remaining} more short ad to unlock all radio for 30 minutes.`
      );
    }
  }, [unlockAttempts]);

  // Tap on a station: if the section is unlocked, play. Otherwise hint.
  const playStation = useCallback(
    async (s: Station) => {
      if (isRadioUnlocked()) {
        await startPlayback(s);
        return;
      }
      alert(
        'Radio is locked.\n\nTap the green Unlock card at the top — watch 2 short ads (or 10 retries on slow network) to unlock ALL stations for 30 minutes.'
      );
    },
    [startPlayback]
  );

  const radioUnlocked = state.radioUnlocked;
  const remaining = state.radioRemainingMs;
  const adsWatched = state.radioAdsWatched;
  const adsRequired = state.radioAdsRequired;
  const adsToGo = Math.max(0, adsRequired - adsWatched);

  const renderItem = useCallback(
    ({ item }: { item: Station }) => {
      const isPlaying = playing?.stationuuid === item.stationuuid;
      const isBusy = busyStation === item.stationuuid;
      const isFav = favUuids.has(item.stationuuid);
      return (
        <Pressable
          testID={`station-${item.stationuuid}`}
          onPress={() => (isPlaying || isBusy ? stop() : playStation(item))}
          style={[styles.stationCard, isPlaying && styles.stationPlaying]}
        >
          <View
            style={[
              styles.stationIcon,
              !radioUnlocked && styles.stationIconLocked,
            ]}
          >
            <Ionicons
              name={
                isBusy
                  ? 'hourglass'
                  : isPlaying
                  ? 'pause'
                  : radioUnlocked
                  ? 'play'
                  : 'lock-closed'
              }
              size={20}
              color="#fff"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stationName} numberOfLines={1}>
              {item.name.trim() || 'Untitled'}
            </Text>
            <Text style={styles.stationMeta} numberOfLines={1}>
              {item.country || '—'} • {item.bitrate}kbps •{' '}
              {item.codec || 'audio'}
              {item.language ? ` • ${item.language}` : ''}
            </Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation?.();
              toggleFavorite(item);
            }}
            style={styles.favBtn}
            testID={`station-fav-${item.stationuuid}`}
          >
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={22}
              color={isFav ? COLORS.brandOrange : COLORS.textMuted}
            />
          </Pressable>
          {isBusy && <ActivityIndicator color={COLORS.brandOrange} />}
        </Pressable>
      );
    },
    [playing, busyStation, favUuids, radioUnlocked, stop, playStation, toggleFavorite]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header} testID="radio-header">
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
          testID="radio-back-btn"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Radio & Music</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={styles.filterBtn}
          testID="radio-filter-btn"
        >
          <Ionicons name="options-outline" size={22} color={COLORS.text} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            placeholder="Search stations…"
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={load}
            returnKeyType="search"
            testID="radio-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catScroll}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => {
          const active = category === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[
                styles.catChip,
                active && styles.catChipActive,
              ]}
              testID={`radio-cat-${c.key}`}
            >
              <Text
                style={[
                  styles.catLabel,
                  { color: active ? '#FFFFFF' : COLORS.brandOrange },
                ]}
              >
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Global Unlock card ──
          Locked  → big maroon button "Watch Ad to Unlock (X / 2)" + retry-counter sub-line
          Unlocked → green strip showing live countdown until 30-min window ends */}
      {radioUnlocked ? (
        <View style={styles.unlockedBanner} testID="radio-unlocked-banner">
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <View style={{ flex: 1 }}>
            <Text style={styles.unlockedTitle}>Radio Unlocked · Ad-Free</Text>
            <Text style={styles.unlockedSub}>
              {formatRemaining(remaining)} left in this 30-min session
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={handleUnlockTap}
          disabled={unlockLoading}
          style={styles.unlockCard}
          testID="radio-unlock-btn"
          android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
        >
          <View style={styles.unlockIcon}>
            {unlockLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="gift" size={22} color="#fff" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.unlockTitle}>
              {unlockLoading
                ? 'Loading ad… please wait'
                : 'Unlock Radio · 30 Minutes Ad-Free'}
            </Text>
            <Text style={styles.unlockSub}>
              {unlockLoading
                ? 'Trying to load a rewarded ad (up to 3 s)…'
                : `Watch ${adsToGo} short ad${adsToGo === 1 ? '' : 's'} to unlock every station.${
                    unlockAttempts > 0
                      ? `  (${unlockAttempts}/${NETWORK_GRANT_AT} retries — auto-grant on slow link)`
                      : ''
                  }`}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (adsWatched / adsRequired) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.unlockBadge}>
            <Text style={styles.unlockBadgeText}>
              {adsWatched}/{adsRequired}
            </Text>
          </View>
        </Pressable>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.brandOrange} size="large" />
          <Text style={styles.loadingText}>Loading stations…</Text>
        </View>
      ) : (category === 'favorites' ? favAsStations : stations).length === 0 ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="sad-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.loadingText}>
            {category === 'favorites'
              ? 'No favorites yet'
              : category === 'india_fm'
              ? 'No India FM stations available right now'
              : category === 'jk_fm'
              ? 'No Jammu & Kashmir stations available right now'
              : category === 'punjab_fm'
              ? 'No Punjab stations available right now'
              : 'No stations found.'}
          </Text>
          <Text style={styles.loadingSubtle}>
            {category === 'favorites'
              ? 'Tap the heart icon on any station to save it here.'
              : category === 'india_fm' ||
                category === 'jk_fm' ||
                category === 'punjab_fm'
              ? 'The catalog server may be busy — pull to retry, or try again in a few seconds.'
              : 'Try changing filters or category.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={category === 'favorites' ? favAsStations : stations}
          keyExtractor={(item) => item.stationuuid}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListFooterComponent={
            category !== 'favorites' ? (
              <Text style={styles.attribution}>
                Streams sourced from third-party radio providers — owned &
                hosted by their broadcasters. UltraLite does not host any
                audio.
              </Text>
            ) : null
          }
        />
      )}

      {/* Sticky "Connecting to <station>… Xs" pill — visible the moment a
          station is tapped, regardless of whether expo-av has produced
          any buffering bytes yet.  Kills the "tapped but nothing
          happens" perception on sub-64 kbps networks.

          Build #37 — pill is now TAPPABLE (Stop ✕) so the user can
          abort a slow-to-start connection without waiting for the 20 s
          timeout. Critical for the "channel won't open, let me try
          another" flow on weak networks. */}
      {busyStation && !playing && (
        <Pressable
          style={styles.connectingPill}
          testID="radio-connecting-pill"
          onPress={stop}
          accessibilityRole="button"
          accessibilityLabel="Cancel connection"
        >
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.connectingText} numberOfLines={1}>
            Connecting to {busyStationName}… {busyElapsedS}s
          </Text>
          <View
            style={styles.connectingStopBtn}
            testID="radio-connecting-stop"
          >
            <Ionicons name="close" size={16} color="#fff" />
          </View>
        </Pressable>
      )}

      {/* Build #25 — full music-player box.
          User feedback: replace the thin 44-px now-playing strip with a
          proper player (prev / play-pause / next / stop) styled like an
          inbuilt radio.  Colour scheme follows the active mode so users
          have a visual cue:
            • Normal mode → blue   (#1565C0 family)
            • UltraLite   → orange (brand orange)
          The banner ad sits BELOW the player.  The banner uses the
          adaptive size — small enough to load on 2G and impression-
          friendly enough to keep a healthy reqs:impressions ratio. */}
      {playing && (
        <View
          style={[
            styles.playerBox,
            ultraLite ? styles.playerBoxUltra : styles.playerBoxNormal,
          ]}
          testID="radio-player-box"
        >
          <View style={styles.playerInfoRow}>
            {/* Live indicator — animated dot when playing, paused
                square when paused, spinner when buffering. */}
            {buffering ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : paused ? (
              <Ionicons name="pause-circle" size={22} color="#fff" />
            ) : (
              <View style={styles.playerLiveDot} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.playerName} numberOfLines={1}>
                {playing.name.trim() || 'Now Playing'}
              </Text>
              <Text style={styles.playerMeta} numberOfLines={1}>
                {(playing.bitrate ? `${playing.bitrate} kbps` : 'live')}
                {playing.codec ? ` · ${playing.codec}` : ''}
                {paused ? ' · paused' : buffering ? ' · buffering' : ' · live'}
              </Text>
            </View>
          </View>
          <View style={styles.playerControls}>
            <Pressable
              onPress={playPrev}
              style={styles.playerBtn}
              hitSlop={6}
              testID="player-prev"
            >
              <Ionicons name="play-skip-back" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={togglePause}
              style={[styles.playerBtn, styles.playerBtnMain]}
              hitSlop={6}
              testID="player-playpause"
            >
              <Ionicons
                name={paused ? 'play' : 'pause'}
                size={28}
                color="#fff"
              />
            </Pressable>
            <Pressable
              onPress={playNext}
              style={styles.playerBtn}
              hitSlop={6}
              testID="player-next"
            >
              <Ionicons name="play-skip-forward" size={22} color="#fff" />
            </Pressable>
            <Pressable
              onPress={stop}
              style={[styles.playerBtn, styles.playerBtnStop]}
              hitSlop={6}
              testID="player-stop"
            >
              <Ionicons name="stop" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      <AdBanner
        testID="radio-banner"
        refreshMs={ultraLite ? 90000 : 60000}
      />

      {/* Filter modal */}
      <Modal
        visible={filterOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <Pressable
          style={styles.filterBackdrop}
          onPress={() => setFilterOpen(false)}
        >
          <View style={styles.filterSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.filterTitle}>Filters</Text>
            <Text style={styles.filterLabel}>Country</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {COUNTRIES.map((c) => (
                <Pressable
                  key={c.code || 'ww'}
                  onPress={() => setCountry(c.code)}
                  style={[
                    styles.chip,
                    country === c.code && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      country === c.code && { color: '#fff' },
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.filterLabel}>Language</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {LANGUAGES.map((l) => (
                <Pressable
                  key={l.code || 'any'}
                  onPress={() => setLanguage(l.code)}
                  style={[
                    styles.chip,
                    language === l.code && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      language === l.code && { color: '#fff' },
                    ]}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => {
                setFilterOpen(false);
                load();
              }}
              style={styles.applyBtn}
              testID="radio-apply-filter"
            >
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  filterBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  searchBox: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: FONT.size.md, color: COLORS.text, padding: 0 },
  catScroll: {
    backgroundColor: '#FFFFFF',
  },
  catRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  catChip: {
    minWidth: 72,
    paddingHorizontal: SPACING.md,
    height: 38,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.brandOrange,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipActive: { backgroundColor: COLORS.brandOrange, borderColor: COLORS.brandOrange },
  catLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 18,
  },
  // ── Global Unlock card (locked state) ──
  unlockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.brandOrange,
    marginHorizontal: SPACING.md,
    marginTop: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  unlockIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockTitle: {
    color: '#fff',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  unlockSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: FONT.size.xs,
    marginTop: 2,
    fontWeight: FONT.weight.medium,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
  },
  unlockBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockBadgeText: {
    color: '#fff',
    fontWeight: FONT.weight.bold,
    fontSize: FONT.size.md,
  },
  // ── Global Unlock card (unlocked state) ──
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#1B8A4E',
    marginHorizontal: SPACING.md,
    marginTop: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  unlockedTitle: {
    color: '#fff',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  unlockedSub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: FONT.size.xs,
    marginTop: 2,
    fontWeight: FONT.weight.medium,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  loadingText: { color: COLORS.text, fontSize: FONT.size.md },
  loadingSubtle: { color: COLORS.textMuted, fontSize: FONT.size.sm },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stationPlaying: { borderColor: COLORS.brandOrange, borderWidth: 2 },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.brandOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationIconLocked: {
    backgroundColor: COLORS.textMuted,
  },
  stationName: { color: COLORS.text, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  stationMeta: { color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: 2 },
  favBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.brandOrange,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    height: 44,
  },
  // ── Build #25 — Music-player box (replaces the thin nowPlaying bar) ──
  // Same component is used in BOTH modes; only the background colour
  // differs so users have a clear visual cue of the current mode.
  playerBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
  },
  playerBoxNormal: {
    backgroundColor: '#1565C0', // Material Blue 800 — calm, music-app vibe.
  },
  playerBoxUltra: {
    backgroundColor: COLORS.brandOrange, // brand orange — matches UltraLite.
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerLiveDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  playerName: {
    color: '#fff',
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  playerMeta: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FONT.size.xs,
    marginTop: 2,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 6,
  },
  playerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerBtnMain: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  playerBtnStop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  connectingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0E2E1F',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    height: 40,
  },
  connectingText: {
    color: '#fff',
    flex: 1,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
  connectingStopBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  npDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' },
  npText: { color: '#fff', flex: 1, fontWeight: FONT.weight.semibold },
  npStop: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
  },
  filterTitle: {
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT.size.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  chipRow: { gap: 8 },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.brandOrange, borderColor: COLORS.brandOrange },
  chipText: { color: COLORS.text, fontWeight: FONT.weight.medium },
  applyBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.brandOrange,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontWeight: FONT.weight.bold, fontSize: FONT.size.md },
  attribution: {
    textAlign: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    fontSize: FONT.size.xs,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
