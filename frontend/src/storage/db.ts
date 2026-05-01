// SQLite storage — strictly local, NO data leaves device.
// As per user policy: zero logs server-side.
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('ultralite.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      visited_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      mime TEXT,
      status TEXT DEFAULT 'done',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  return db;
}

export interface HistoryItem {
  id: number;
  title: string;
  url: string;
  visited_at: number;
}

export interface BookmarkItem {
  id: number;
  title: string;
  url: string;
  created_at: number;
}

export async function addHistory(title: string, url: string) {
  const d = await getDb();
  await d.runAsync(
    'INSERT INTO history (title, url, visited_at) VALUES (?, ?, ?)',
    [title || url, url, Date.now()]
  );
  // keep only last 200
  await d.runAsync(
    `DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY visited_at DESC LIMIT 200)`
  );
}

export async function getHistory(): Promise<HistoryItem[]> {
  const d = await getDb();
  return await d.getAllAsync<HistoryItem>(
    'SELECT * FROM history ORDER BY visited_at DESC LIMIT 100'
  );
}

export async function clearHistory() {
  const d = await getDb();
  await d.runAsync('DELETE FROM history');
}

export async function addBookmark(title: string, url: string) {
  const d = await getDb();
  try {
    await d.runAsync(
      'INSERT INTO bookmarks (title, url, created_at) VALUES (?, ?, ?)',
      [title || url, url, Date.now()]
    );
  } catch {
    // unique constraint — ignore duplicate
  }
}

export async function removeBookmark(url: string) {
  const d = await getDb();
  await d.runAsync('DELETE FROM bookmarks WHERE url = ?', [url]);
}

export async function getBookmarks(): Promise<BookmarkItem[]> {
  const d = await getDb();
  return await d.getAllAsync<BookmarkItem>(
    'SELECT * FROM bookmarks ORDER BY created_at DESC'
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const d = await getDb();
  await d.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value]
  );
}

// ---------- Downloads ----------
export interface DownloadItem {
  id: number;
  filename: string;
  url: string;
  local_uri: string;
  size: number;
  mime: string | null;
  status: string;
  created_at: number;
}

export async function addDownload(
  filename: string,
  url: string,
  local_uri: string,
  size: number,
  mime: string | null
): Promise<number> {
  const d = await getDb();
  const res = await d.runAsync(
    'INSERT INTO downloads (filename, url, local_uri, size, mime, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [filename, url, local_uri, size, mime, 'done', Date.now()]
  );
  return res.lastInsertRowId ?? 0;
}

export async function getDownloads(): Promise<DownloadItem[]> {
  const d = await getDb();
  return await d.getAllAsync<DownloadItem>(
    'SELECT * FROM downloads ORDER BY created_at DESC'
  );
}

export async function removeDownload(id: number) {
  const d = await getDb();
  await d.runAsync('DELETE FROM downloads WHERE id = ?', [id]);
}

export async function clearDownloads() {
  const d = await getDb();
  await d.runAsync('DELETE FROM downloads');
}
