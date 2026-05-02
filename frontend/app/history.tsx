// History page — grouped by Today / Yesterday / Older, with long-press
// multi-select delete.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  clearHistory,
  getHistory,
  HistoryItem,
  removeHistoryByIds,
} from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

type Group = 'today' | 'yesterday' | 'older';
type Row =
  | { type: 'header'; group: Group; label: string; count: number }
  | { type: 'item'; group: Group; item: HistoryItem };

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfYesterday(): number {
  return startOfToday() - 24 * 60 * 60 * 1000;
}

function classify(visited_at: number): Group {
  if (visited_at >= startOfToday()) return 'today';
  if (visited_at >= startOfYesterday()) return 'yesterday';
  return 'older';
}

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const refresh = useCallback(async () => {
    setItems(await getHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo<Row[]>(() => {
    const groups: Record<Group, HistoryItem[]> = {
      today: [],
      yesterday: [],
      older: [],
    };
    for (const it of items) groups[classify(it.visited_at)].push(it);
    const out: Row[] = [];
    (['today', 'yesterday', 'older'] as Group[]).forEach((g) => {
      if (groups[g].length === 0) return;
      out.push({
        type: 'header',
        group: g,
        label: g === 'today' ? 'Today' : g === 'yesterday' ? 'Yesterday' : 'Older',
        count: groups[g].length,
      });
      for (const it of groups[g]) out.push({ type: 'item', group: g, item: it });
    });
    return out;
  }, [items]);

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    if (next.size === 0) setSelectMode(false);
  };

  const startSelection = (id: number) => {
    setSelectMode(true);
    setSelected(new Set([id]));
  };

  const exitSelection = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    if (selected.size === 0) return;
    Alert.alert(
      'Delete history',
      `Remove ${selected.size} item(s) from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await removeHistoryByIds(Array.from(selected));
            exitSelection();
            await refresh();
          },
        },
      ]
    );
  };

  const onClearAll = () => {
    Alert.alert('Clear History', 'Remove all browsing history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          exitSelection();
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={styles.header}>
        {selectMode ? (
          <>
            <Pressable
              onPress={exitSelection}
              hitSlop={12}
              style={styles.btn}
              testID="history-cancel-select"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.title}>{selected.size} selected</Text>
            <Pressable
              onPress={deleteSelected}
              hitSlop={12}
              style={styles.btn}
              testID="history-delete-selected"
            >
              <Ionicons name="trash" size={20} color="#fff" />
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.btn}
              testID="history-back"
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.title}>History</Text>
            <Pressable
              onPress={onClearAll}
              hitSlop={12}
              style={styles.btn}
              testID="history-clear"
            >
              <Ionicons name="trash-outline" size={20} color="#fff" />
            </Pressable>
          </>
        )}
      </View>

      {!selectMode && items.length > 0 && (
        <View style={styles.hintBar}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.hintText}>
            Long-press any item to multi-select &amp; delete.
          </Text>
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(r, i) =>
          r.type === 'header' ? `h-${r.group}` : `i-${r.item.id}-${i}`
        }
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No history yet.</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        renderItem={({ item: row }) => {
          if (row.type === 'header') {
            return (
              <Text style={styles.groupHead}>
                {row.label} · {row.count}
              </Text>
            );
          }
          const h = row.item;
          const isSel = selected.has(h.id);
          return (
            <Pressable
              style={[styles.row, isSel && styles.rowSelected]}
              onPress={() => {
                if (selectMode) toggleSelect(h.id);
                else
                  router.replace({ pathname: '/home', params: { url: h.url } });
              }}
              onLongPress={() => startSelection(h.id)}
              delayLongPress={350}
              testID={`history-item-${h.id}`}
            >
              <Ionicons
                name={isSel ? 'checkmark-circle' : 'globe-outline'}
                size={20}
                color={isSel ? COLORS.maroon : COLORS.maroon}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {h.title}
                </Text>
                <Text style={styles.rowUrl} numberOfLines={1}>
                  {h.url}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
      <AdBanner testID="history-banner" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: FONT.size.xl,
    fontWeight: FONT.weight.bold,
    marginLeft: SPACING.sm,
  },
  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: '#FFF4E5',
    borderBottomWidth: 1,
    borderBottomColor: '#F0DFC3',
  },
  hintText: { color: COLORS.textMuted, fontSize: FONT.size.xs, flex: 1 },
  groupHead: {
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: SPACING.md,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowSelected: {
    borderColor: COLORS.maroon,
    borderWidth: 2,
    backgroundColor: '#FDF6F7',
  },
  rowTitle: { color: COLORS.text, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  rowUrl: { color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: FONT.size.md },
});
