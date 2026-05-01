// Radio & Music — categories, country/language filter, search, 64kbps strict.
// Reward Ad gate: PER-CHANNEL — each station requires its own rewarded ad to
// unlock 30-min playback. Other stations remain locked independently.
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
  LANGUAGES,
  reportClick,
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
  grantChannelReward,
  isChannelUnlocked,
  channelRemainingMs,
  hydrate,
  useAppState,
} from '../src/state/appState';

type Category = 'news' | 'sports' | 'music' | 'all';

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'all', label: 'All', icon: 'globe-outline' },
  { key: 'news', label: 'News', icon: 'newspaper-outline' },
  { key: 'sports', label: 'Sports', icon: 'football-outline' },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
];

function formatRemaining(ms: number): string {
  if (ms <= 0) return '';
  const totalMin = Math.ceil(ms / 60000);
  return `${totalMin}m`;
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

  useEffect(() => {
    hydrate();
    preloadRewarded();
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

  const load = useCallback(async () => {
    setLoading(true);
    const results = await searchStations({
      category,
      country: country || undefined,
      language: language || undefined,
      query: query || undefined,
      maxBitrate: 64,
      minBitrate: 32, // skip very low-quality ones for usable audio
      limit: 60,
    });
    setStations(results);
    setLoading(false);
  }, [category, country, language, query]);

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
  }, [sound]);

  const startPlayback = useCallback(
    async (s: Station) => {
      setBusyStation(s.stationuuid);
      try {
        if (sound) {
          await sound.unloadAsync().catch(() => {});
        }
        const { sound: snd } = await Audio.Sound.createAsync(
          { uri: s.url_resolved || s.url },
          { shouldPlay: true, isLooping: false }
        );
        setSound(snd);
        setPlaying(s);
        reportClick(s.stationuuid).catch(() => {});
        trackClick();
      } catch (e) {
        console.warn('[radio] play err', e);
        alert('Failed to start the stream. Try another station.');
      } finally {
        setBusyStation(null);
      }
    },
    [sound]
  );

  const playStation = useCallback(
    async (s: Station) => {
      // Per-channel unlock gate.
      if (isChannelUnlocked(s.stationuuid)) {
        await startPlayback(s);
        return;
      }
      // Not unlocked — user must watch a rewarded ad for THIS station.
      if (!isRewardedReady()) {
        preloadRewarded();
        alert('Ad is loading… please tap the station again in a few seconds.');
        return;
      }
      let earned = false;
      const ok = await showRewarded(async () => {
        earned = true;
        await grantChannelReward(s.stationuuid);
      });
      if (!ok || !earned) return;
      // After reward granted, start playback.
      await startPlayback(s);
    },
    [startPlayback]
  );

  const unlockedCount = useMemo(
    () => Object.keys(state.unlockedChannels).length,
    [state.unlockedChannels]
  );

  const renderItem = ({ item }: { item: Station }) => {
    const isPlaying = playing?.stationuuid === item.stationuuid;
    const isBusy = busyStation === item.stationuuid;
    const unlocked = isChannelUnlocked(item.stationuuid);
    const remainingMs = channelRemainingMs(item.stationuuid);
    return (
      <Pressable
        testID={`station-${item.stationuuid}`}
        onPress={() => (isPlaying ? stop() : playStation(item))}
        style={[styles.stationCard, isPlaying && styles.stationPlaying]}
      >
        <View style={[styles.stationIcon, !unlocked && styles.stationIconLocked]}>
          <Ionicons
            name={
              isBusy
                ? 'hourglass'
                : isPlaying
                ? 'pause'
                : unlocked
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
          {unlocked && (
            <Text style={styles.stationTimer}>
              Unlocked · {formatRemaining(remainingMs)} left
            </Text>
          )}
        </View>
        {isBusy && <ActivityIndicator color={COLORS.maroon} />}
        {!unlocked && !isBusy && (
          <View style={styles.adHint} testID={`station-adhint-${item.stationuuid}`}>
            <Ionicons name="gift-outline" size={14} color={COLORS.maroon} />
            <Text style={styles.adHintText}>Ad</Text>
          </View>
        )}
      </Pressable>
    );
  };

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

      <View style={styles.infoBanner} testID="radio-info-banner">
        <Ionicons name="information-circle-outline" size={18} color={COLORS.maroon} />
        <Text style={styles.infoText}>
          Tap a station — watch a short ad to unlock it for 30 minutes.
          {unlockedCount > 0 ? `  (${unlockedCount} unlocked now)` : ''}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.maroon} size="large" />
          <Text style={styles.loadingText}>Loading stations…</Text>
        </View>
      ) : stations.length === 0 ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="sad-outline" size={32} color={COLORS.textMuted} />
          <Text style={styles.loadingText}>No stations found.</Text>
          <Text style={styles.loadingSubtle}>
            Try changing filters or category.
          </Text>
        </View>
      ) : (
        <FlatList
          data={stations}
          keyExtractor={(item) => item.stationuuid}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {playing && (
        <View style={styles.nowPlaying} testID="now-playing-bar">
          <View style={styles.npDot} />
          <Text style={styles.npText} numberOfLines={1}>
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF4E5',
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#F0DFC3',
  },
  infoText: {
    color: COLORS.text,
    flex: 1,
    fontSize: FONT.size.xs,
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
  stationTimer: {
    marginTop: 2,
    fontSize: FONT.size.xs,
    color: COLORS.success,
    fontWeight: FONT.weight.semibold,
  },
  adHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: '#FDEEEE',
    borderWidth: 1,
    borderColor: COLORS.maroon,
  },
  adHintText: {
    color: COLORS.maroon,
    fontSize: FONT.size.xs,
    fontWeight: FONT.weight.bold,
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
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
});
