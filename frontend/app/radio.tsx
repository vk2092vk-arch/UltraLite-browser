// Radio & Music — categories, country/language filter, search, 64kbps strict.
// Reward Ad gate: GLOBAL — the user watches 2 rewarded ads (or 10 retries on
// slow links) to unlock ALL stations for 30 minutes. Per-station gating was
// retired in build #20 as an AdMob policy hardening measure.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';
import {
  COUNTRIES,
  INDIA_REGION_TAGS,
  LANGUAGES,
  loadIndiaFmFeatured,
  reportClick,
  searchByTag,
  searchStations,
  Station,
} from '../src/services/radioBrowser';
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

type Category = 'favorites' | 'india_fm' | 'news' | 'sports' | 'music' | 'all';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'favorites', label: '❤ Favs', icon: 'heart' },
  { key: 'india_fm', label: '🇮🇳 India FM', icon: 'radio-outline' },
  { key: 'all', label: 'All', icon: 'globe-outline' },
  { key: 'news', label: 'News', icon: 'newspaper-outline' },
  { key: 'sports', label: 'Sports', icon: 'football-outline' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
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
  const [busyStation, setBusyStation] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [favorites, setFavorites] = useState<RadioFav[]>([]);
  const [regionTag, setRegionTag] = useState<string>('');
  // Tracks how many times the user has tapped "Watch Ad" while the SDK
  // failed to deliver — when this hits 10, we grant the unlock anyway so
  // 2G users are never permanently blocked.
  const [unlockAttempts, setUnlockAttempts] = useState(0);
  const NETWORK_GRANT_AT = 10;

  const refreshFavorites = useCallback(async () => {
    setFavorites(await getRadioFavorites());
  }, []);

  useEffect(() => {
    hydrate();
    preloadRewarded();
    refreshFavorites();
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    }).catch(() => {});
    return () => {
      if (sound) sound.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const load = useCallback(async () => {
    if (category === 'favorites') {
      await refreshFavorites();
      return;
    }
    setLoading(true);
    let results: Station[];
    if (category === 'india_fm') {
      // Curated India FM roster (AIR / Vividh Bharati / Mirchi / Big FM /
      // Red FM / Radio City / Fever / Hello / Suryan / My FM / Indigo /
      // Club FM). All from radio-browser.info — no hardcoded URLs.
      results = await loadIndiaFmFeatured();
      // If user typed a query, filter the featured list client-side.
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        results = results.filter((s) => s.name.toLowerCase().includes(q));
      }
    } else if (regionTag) {
      results = await searchByTag(regionTag, {
        maxBitrate: 48,
        minBitrate: 24,
        limit: 60,
      });
    } else {
      results = await searchStations({
        category: category as 'news' | 'sports' | 'music' | 'all',
        country: country || undefined,
        language: language || undefined,
        query: query || undefined,
        maxBitrate: 48,
        minBitrate: 24,
        limit: 60,
      });
    }
    setStations(results);
    setLoading(false);
  }, [category, country, language, query, regionTag, refreshFavorites]);

  useEffect(() => {
    load();
  }, [load]);

  const stop = useCallback(async () => {
    try {
      await sound?.stopAsync();
      await sound?.unloadAsync();
    } catch {}
    setSound(null);
    setPlaying(null);
    setBuffering(false);
  }, [sound]);

  const startPlayback = useCallback(
    async (s: Station) => {
      setBusyStation(s.stationuuid);
      setBuffering(true);
      try {
        if (sound) {
          await sound.unloadAsync().catch(() => {});
        }
        // Race the createAsync against a 15-second timeout — broken
        // streams on radio-browser.info silently hang here, leaving the
        // user staring at a frozen "Loading…" hourglass.  Bail out
        // cleanly and surface a "too slow" hint instead.
        const STREAM_TIMEOUT_MS = 15000;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        const createPromise = Audio.Sound.createAsync(
          { uri: s.url_resolved || s.url },
          {
            shouldPlay: true,
            isLooping: false,
            // Lower polling overhead on weak networks; covers buffering
            // without busy-looping the JS thread on 2G.
            progressUpdateIntervalMillis: 2000,
            // MediaPlayer is lighter than ExoPlayer for plain HTTP audio
            // streams and tolerates intermittent 64-kbps links better.
            androidImplementation: 'MediaPlayer',
          } as any,
          // Status callback — drives the on-screen "Buffering…" indicator
          // and recovers from end-of-stream stalls.
          (status: any) => {
            if (!status?.isLoaded) {
              if (status?.error) {
                console.warn('[radio] stream err', status.error);
                setBuffering(false);
              }
              return;
            }
            // expo-av's `isBuffering` flag flips true while waiting for
            // bytes. Mirror it into our own state so the UI can show a
            // live spinner without re-rendering FlatList rows.
            setBuffering(!!status.isBuffering && !status.isPlaying);
          }
        );
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('STREAM_TIMEOUT')),
            STREAM_TIMEOUT_MS
          );
        });
        let createdSound: Audio.Sound | null = null;
        try {
          const { sound: snd } = await Promise.race([
            createPromise,
            timeoutPromise,
          ]);
          createdSound = snd;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
        if (!createdSound) throw new Error('NO_SOUND');
        setSound(createdSound);
        setPlaying(s);
        reportClick(s.stationuuid).catch(() => {});
        trackClick();
      } catch (e: any) {
        console.warn('[radio] play err', e);
        setBuffering(false);
        // Best-effort: if a Sound got created but timed out, dispose it.
        try {
          await sound?.unloadAsync();
        } catch {}
        const isTimeout = e?.message === 'STREAM_TIMEOUT';
        alert(
          isTimeout
            ? 'This station is too slow to start (≥ 15 s with no audio).\n' +
                'Try a different station or check your connection — the broadcaster may be offline.'
            : 'Stream failed to start. The broadcaster may be offline or your link is too slow — try a lower-bitrate station (32-48 kbps).'
        );
      } finally {
        setBusyStation(null);
      }
    },
    [sound]
  );

  // Global Unlock handler — user taps the big card. Watches a rewarded ad,
  // counts towards 2 ads, after the 2nd ad → 30-min unlock for ALL stations.
  const handleUnlockTap = useCallback(async () => {
    if (isRadioUnlocked()) return; // already unlocked, button shouldn't show

    // No ad ready yet — count the failed attempt. After NETWORK_GRANT_AT
    // (10) consecutive failures, fall back to a free 30-min Network Grant
    // so 2G users are never permanently locked out.
    if (!isRewardedReady()) {
      preloadRewarded();
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
        `Ad still loading — please wait a moment and tap again.\n` +
          `(${next}/${NETWORK_GRANT_AT} — auto-grant on slow network at ${NETWORK_GRANT_AT} tries)`
      );
      return;
    }

    // Ad is ready — show it and wait for the reward callback.
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
          onPress={() => (isPlaying ? stop() : playStation(item))}
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
              color={isFav ? COLORS.maroon : COLORS.textMuted}
            />
          </Pressable>
          {isBusy && <ActivityIndicator color={COLORS.maroon} />}
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
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Radio & Music</Text>
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={styles.filterBtn}
          testID="radio-filter-btn"
        >
          <Ionicons name="options-outline" size={22} color="#fff" />
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
                  { color: active ? '#FFFFFF' : COLORS.maroon },
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
          style={styles.unlockCard}
          testID="radio-unlock-btn"
          android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
        >
          <View style={styles.unlockIcon}>
            <Ionicons name="gift" size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.unlockTitle}>
              Unlock Radio · 30 Minutes Ad-Free
            </Text>
            <Text style={styles.unlockSub}>
              Watch {adsToGo} short ad{adsToGo === 1 ? '' : 's'} to unlock
              every station.
              {unlockAttempts > 0
                ? `  (${unlockAttempts}/${NETWORK_GRANT_AT} retries — auto-grant on slow link)`
                : ''}
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
          <ActivityIndicator color={COLORS.maroon} size="large" />
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
              : 'No stations found.'}
          </Text>
          <Text style={styles.loadingSubtle}>
            {category === 'favorites'
              ? 'Tap the heart icon on any station to save it here.'
              : category === 'india_fm'
              ? 'The catalog server may be busy — pull to retry, or pick another category.'
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

      {/* Now-Playing bar — fixed-height (44px) so first-time appearance
          doesn't visibly shift the list above. Combined with the
          appState 30-s tick fix and memoised renderItem, this kills the
          "radio screen flutter" reported in build #21. */}
      {playing && (
        <View style={styles.nowPlaying} testID="now-playing-bar">
          {buffering ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.npDot} />
          )}
          <Text style={styles.npText} numberOfLines={1}>
            {buffering ? 'Buffering… ' : ''}
            {playing.name}
          </Text>
          <Pressable onPress={stop} style={styles.npStop} testID="np-stop">
            <Ionicons name="stop" size={18} color="#fff" />
          </Pressable>
        </View>
      )}

      <AdBanner testID="radio-banner" />

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
            <Text style={styles.filterLabel}>India regional</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              <Pressable
                onPress={() => setRegionTag('')}
                style={[
                  styles.chip,
                  regionTag === '' && styles.chipActive,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    regionTag === '' && { color: '#fff' },
                  ]}
                >
                  Off
                </Text>
              </Pressable>
              {INDIA_REGION_TAGS.map((r) => (
                <Pressable
                  key={r.tag}
                  onPress={() => setRegionTag(r.tag)}
                  style={[
                    styles.chip,
                    regionTag === r.tag && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      regionTag === r.tag && { color: '#fff' },
                    ]}
                  >
                    {r.label}
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    backgroundColor: COLORS.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
  },
  filterBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  searchBox: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: FONT.size.md, color: COLORS.text, padding: 0 },
  catScroll: {
    backgroundColor: COLORS.bg,
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
    borderColor: COLORS.maroon,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catChipActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
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
    backgroundColor: COLORS.maroon,
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
  stationPlaying: { borderColor: COLORS.maroon, borderWidth: 2 },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.maroon,
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
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    height: 44,
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
  chipActive: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  chipText: { color: COLORS.text, fontWeight: FONT.weight.medium },
  applyBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.maroon,
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
