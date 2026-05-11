// Bookmarks page
import React, { useCallback, useEffect, useState } from 'react';
import {
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
  BookmarkItem,
  getBookmarks,
  removeBookmark,
} from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';

export default function Bookmarks() {
  const router = useRouter();
  const [items, setItems] = useState<BookmarkItem[]>([]);

  const refresh = useCallback(async () => {
    setItems(await getBookmarks());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btn}
          testID="bookmarks-back"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Bookmarks</Text>
        <View style={styles.btn} />
      </View>
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: SPACING.md }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="star-outline" size={36} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>
              No bookmarks yet. Open the menu while browsing to bookmark a page.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() =>
                router.replace({ pathname: '/home', params: { url: item.url } })
              }
              testID={`bookmark-item-${item.id}`}
            >
              <Ionicons name="bookmark" size={20} color={COLORS.maroon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.rowUrl} numberOfLines={1}>
                  {item.url}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={async () => {
                await removeBookmark(item.url);
                await refresh();
              }}
              hitSlop={10}
              testID={`bookmark-remove-${item.id}`}
            >
              <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>
        )}
      />
      <AdBanner testID="bookmarks-banner" />
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
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  rowTitle: { color: COLORS.text, fontSize: FONT.size.md, fontWeight: FONT.weight.semibold },
  rowUrl: { color: COLORS.textMuted, fontSize: FONT.size.xs, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: SPACING.lg },
  emptyText: { color: COLORS.textMuted, fontSize: FONT.size.md, textAlign: 'center' },
});
