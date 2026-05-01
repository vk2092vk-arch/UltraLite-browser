// Downloads screen — list of files downloaded locally.
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
import {
  DownloadItem,
  clearDownloads,
  getDownloads,
  removeDownload,
} from '../src/storage/db';
import AdBanner from '../src/components/AdBanner';
import { COLORS, FONT, RADIUS, SPACING } from '../src/constants/theme';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { trackClick } from '../src/ads/AdManager';

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function iconForMime(mime: string | null, filename: string): keyof typeof Ionicons.glyphMap {
  const m = (mime || '').toLowerCase();
  const lower = filename.toLowerCase();
  if (m.startsWith('image/')) return 'image-outline';
  if (m.startsWith('video/')) return 'videocam-outline';
  if (m.startsWith('audio/')) return 'musical-notes-outline';
  if (m.includes('pdf')) return 'document-text-outline';
  if (lower.endsWith('.apk')) return 'logo-android';
  if (m.includes('zip') || m.includes('rar')) return 'archive-outline';
  if (m.includes('word') || m.includes('document')) return 'document-outline';
  if (m.includes('excel') || m.includes('spreadsheet')) return 'grid-outline';
  return 'document-attach-outline';
}

export default function Downloads() {
  const router = useRouter();
  const [items, setItems] = useState<DownloadItem[]>([]);

  const refresh = useCallback(async () => {
    setItems(await getDownloads());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openItem = async (it: DownloadItem) => {
    trackClick();
    try {
      // expo-linking can't open file:// URIs directly on Android; try shareable asset.
      // Fallback: surface the local URI so user knows where it is.
      const exists = await FileSystem.getInfoAsync(it.local_uri);
      if (!exists.exists) {
        Alert.alert('File missing', 'This download is no longer available.');
        return;
      }
      // Try opening with system chooser via Linking on file URI.
      try {
        await Linking.openURL(it.local_uri);
      } catch {
        Alert.alert(
          'Saved',
          `File is saved at:\n${it.local_uri}\n\nUse your file manager to open it.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unable to open.');
    }
  };

  const remove = (it: DownloadItem) => {
    Alert.alert(
      'Remove download',
      `Delete "${it.filename}" from device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(it.local_uri, { idempotent: true });
            } catch {}
            await removeDownload(it.id);
            await refresh();
          },
        },
      ]
    );
  };

  const onClearAll = () => {
    Alert.alert(
      'Clear all downloads',
      'Delete every downloaded file from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            for (const it of items) {
              try {
                await FileSystem.deleteAsync(it.local_uri, { idempotent: true });
              } catch {}
            }
            await clearDownloads();
            await refresh();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.btn}
          testID="downloads-back"
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Downloads</Text>
        {items.length > 0 ? (
          <Pressable
            onPress={onClearAll}
            hitSlop={12}
            style={styles.btn}
            testID="downloads-clear"
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.btn} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="download-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No downloads yet</Text>
            <Text style={styles.emptySubtle}>
              Files you download while browsing will appear here. UltraLite
              saves them on your device privately, no cloud uploads.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => openItem(item)}
              style={styles.rowMain}
              testID={`download-item-${item.id}`}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={iconForMime(item.mime, item.filename)}
                  size={22}
                  color={COLORS.maroon}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.filename}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {formatSize(item.size)}
                  {' · '}
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => remove(item)}
              hitSlop={10}
              testID={`download-remove-${item.id}`}
              style={styles.removeBtn}
            >
              <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
            </Pressable>
          </View>
        )}
      />
      <AdBanner testID="downloads-banner" />
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
    gap: SPACING.sm,
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FDEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: COLORS.text,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.semibold,
  },
  rowMeta: {
    color: COLORS.textMuted,
    fontSize: FONT.size.xs,
    marginTop: 2,
  },
  removeBtn: { padding: 4 },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: FONT.size.lg,
    fontWeight: FONT.weight.bold,
  },
  emptySubtle: {
    color: COLORS.textMuted,
    fontSize: FONT.size.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
