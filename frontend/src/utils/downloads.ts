// Download manager — intercepts file-extension URLs and saves to local FS.
// Uses expo-file-system; records written to SQLite 'downloads' table.
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { addDownload } from '../storage/db';

// Extensions we treat as downloadable (not browsable). Lowercase.
const DOWNLOADABLE_EXT = new Set([
  'pdf', 'apk', 'aab', 'zip', 'rar', '7z', 'tar', 'gz',
  'mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac',
  'mp4', 'mkv', 'avi', 'mov', 'webm', '3gp',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt',
  'epub', 'mobi',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg',
  'exe', 'msi', 'dmg',
]);

export function extractExtension(url: string): string | null {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const last = clean.substring(clean.lastIndexOf('/') + 1);
    if (!last || last.indexOf('.') === -1) return null;
    const ext = last.substring(last.lastIndexOf('.') + 1).toLowerCase();
    if (ext.length < 1 || ext.length > 5) return null;
    return ext;
  } catch {
    return null;
  }
}

export function isDownloadUrl(url: string): boolean {
  const ext = extractExtension(url);
  return !!ext && DOWNLOADABLE_EXT.has(ext);
}

export function deriveFilename(url: string): string {
  try {
    const clean = url.split('?')[0].split('#')[0];
    const last = clean.substring(clean.lastIndexOf('/') + 1);
    return decodeURIComponent(last || `download-${Date.now()}`);
  } catch {
    return `download-${Date.now()}`;
  }
}

function mimeFromExt(ext: string | null): string | null {
  if (!ext) return null;
  const m: Record<string, string> = {
    pdf: 'application/pdf',
    apk: 'application/vnd.android.package-archive',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
  };
  return m[ext] || null;
}

// Sanitize filename for filesystem safety.
function safeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned || `file-${Date.now()}`;
}

/**
 * Download a URL into FileSystem.documentDirectory and record it in SQLite.
 * Shows Alert on success/failure.
 * Note: documentDirectory is app-private; user sees files only in Downloads
 * screen inside the app. Works reliably on all Android versions without
 * WRITE_EXTERNAL_STORAGE permission.
 */
export async function downloadFile(
  url: string,
  onProgressPct?: (pct: number) => void
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const ext = extractExtension(url);
    const rawName = deriveFilename(url);
    const filename = safeName(rawName);

    const dir = (FileSystem.documentDirectory || '') + 'UltraLite-Downloads/';
    try {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    } catch {}

    const target = dir + filename;

    let finalTarget = target;
    let counter = 1;
    // Avoid overwriting existing files.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const info = await FileSystem.getInfoAsync(finalTarget);
      if (!info.exists) break;
      const dot = filename.lastIndexOf('.');
      if (dot > 0) {
        finalTarget =
          dir + filename.slice(0, dot) + `(${counter})` + filename.slice(dot);
      } else {
        finalTarget = dir + filename + `(${counter})`;
      }
      counter += 1;
      if (counter > 20) break;
    }

    const callback = onProgressPct
      ? (p: FileSystem.DownloadProgressData) => {
          if (p.totalBytesExpectedToWrite > 0) {
            onProgressPct(
              Math.min(
                100,
                Math.round(
                  (p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100
                )
              )
            );
          }
        }
      : undefined;

    const resumable = FileSystem.createDownloadResumable(
      url,
      finalTarget,
      {},
      callback
    );
    const res = await resumable.downloadAsync();
    if (!res || !res.uri) {
      return { ok: false, error: 'Download failed (no response).' };
    }

    const info = await FileSystem.getInfoAsync(res.uri);
    const size = info.exists && 'size' in info ? (info.size as number) : 0;

    const id = await addDownload(
      filename,
      url,
      res.uri,
      size,
      mimeFromExt(ext)
    );

    if (Platform.OS !== 'web') {
      Alert.alert(
        'Download complete',
        `${filename}\nSaved inside the app. Open from the Downloads screen.`
      );
    }

    return { ok: true, id };
  } catch (e: any) {
    console.warn('[downloads] err', e);
    const msg = e?.message || 'Unknown error';
    if (Platform.OS !== 'web') {
      Alert.alert('Download failed', msg);
    }
    return { ok: false, error: msg };
  }
}
