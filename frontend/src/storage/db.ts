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
    CREATE TABLE IF NOT EXISTS shortcuts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      icon TEXT,
      order_idx INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS radio_favorites (
      uuid TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      country TEXT,
      language TEXT,
      bitrate INTEGER,
      codec TEXT,
      url TEXT NOT NULL,
      url_resolved TEXT,
      created_at INTEGER NOT NULL
    );
  `);
  // Seed default shortcuts on first run
  const r = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM shortcuts');
  if (!r || r.c === 0) {
    const defaults = [
      { n: 'Instagram', u: 'https://www.instagram.com' },
      { n: 'Facebook', u: 'https://m.facebook.com' },
      { n: 'YouTube', u: 'https://m.youtube.com' },
      { n: 'Google', u: 'https://www.google.com' },
      { n: 'News', u: 'https://news.google.com' },
      { n: 'Wikipedia', u: 'https://en.m.wikipedia.org' },
      { n: 'X (Twitter)', u: 'https://mobile.twitter.com' },
      { n: 'Reddit', u: 'https://www.reddit.com' },
      { n: 'ESPN', u: 'https://www.espn.com' },
      { n: 'Gmail', u: 'https://mail.google.com' },
    ];
    let i = 0;
    for (const d of defaults) {
      try {
        await db.runAsync(
          'INSERT INTO shortcuts (name, url, icon, order_idx, created_at) VALUES (?, ?, ?, ?, ?)',
          [d.n, d.u, null, i, Date.now()]
        );
      } catch {}
      i++;
    }
  }
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

// ---------- History multi-delete ----------
export async function removeHistoryByIds(ids: number[]) {
  if (!ids.length) return;
  const d = await getDb();
  const placeholders = ids.map(() => '?').join(',');
  await d.runAsync(`DELETE FROM history WHERE id IN (${placeholders})`, ids);
}

// ---------- Shortcuts (top apps on home) ----------
export interface Shortcut {
  id: number;
  name: string;
  url: string;
  icon: string | null;
  order_idx: number;
  created_at: number;
}

export async function getShortcuts(): Promise<Shortcut[]> {
  const d = await getDb();
  return await d.getAllAsync<Shortcut>(
    'SELECT * FROM shortcuts ORDER BY order_idx ASC, id ASC LIMIT 12'
  );
}

export async function addShortcut(name: string, url: string): Promise<void> {
  const d = await getDb();
  try {
    const r = await d.getFirstAsync<{ m: number }>('SELECT MAX(order_idx) as m FROM shortcuts');
    const next = ((r?.m as number) ?? 0) + 1;
    await d.runAsync(
      'INSERT INTO shortcuts (name, url, icon, order_idx, created_at) VALUES (?, ?, ?, ?, ?)',
      [name, url, null, next, Date.now()]
    );
  } catch {}
}

export async function removeShortcut(id: number): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM shortcuts WHERE id = ?', [id]);
}

// ---------- Radio favorites ----------
export interface RadioFav {
  uuid: string;
  name: string;
  country: string | null;
  language: string | null;
  bitrate: number;
  codec: string | null;
  url: string;
  url_resolved: string | null;
  created_at: number;
}

export async function getRadioFavorites(): Promise<RadioFav[]> {
  const d = await getDb();
  return await d.getAllAsync<RadioFav>(
    'SELECT * FROM radio_favorites ORDER BY created_at DESC'
  );
}

export async function addRadioFavorite(s: {
  uuid: string;
  name: string;
  country?: string;
  language?: string;
  bitrate?: number;
  codec?: string;
  url: string;
  url_resolved?: string;
}): Promise<void> {
  const d = await getDb();
  try {
    await d.runAsync(
      `INSERT OR REPLACE INTO radio_favorites
       (uuid, name, country, language, bitrate, codec, url, url_resolved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        s.uuid,
        s.name,
        s.country ?? null,
        s.language ?? null,
        s.bitrate ?? 0,
        s.codec ?? null,
        s.url,
        s.url_resolved ?? null,
        Date.now(),
      ]
    );
  } catch {}
}

export async function removeRadioFavorite(uuid: string): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM radio_favorites WHERE uuid = ?', [uuid]);
}

export async function isRadioFavorite(uuid: string): Promise<boolean> {
  const d = await getDb();
  const r = await d.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM radio_favorites WHERE uuid = ?',
    [uuid]
  );
  return !!r && r.c > 0;
}
