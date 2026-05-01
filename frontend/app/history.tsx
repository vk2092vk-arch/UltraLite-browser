// History page — list with delete-all
import React, { useCallback, useEffect, useState } from 'react';
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
import { clearHistory, getHistory, HistoryItem } from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

export default function History() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const refresh = useCallback(async () => {
    setItems(await getHistory());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClear = () => {
    Alert.alert('Clear History', 'Remove all browsing history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={styles.header}>
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
          onPress={onClear}
          hitSlop={12}
          style={styles.btn}
          testID="history-clear"
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: SPACING.md }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No history yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() =>
              router.replace({ pathname: '/home', params: { url: item.url } })
            }
            testID={`history-item-${item.id}`}
          >
            <Ionicons name="globe-outline" size={20} color={COLORS.maroon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowUrl} numberOfLines={1}>
                {item.url}
              </Text>
            </View>
          </Pressable>
        )}
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
  rowTitle: { color: COLORS.text, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  rowUrl: { color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: FONT.size.md },
});
