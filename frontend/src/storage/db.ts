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
    CREATE TABLE IF NOT EXISTS tabs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mode TEXT NOT NULL,
      url TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS html_cache (
      url TEXT PRIMARY KEY,
      html TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL
    );
  `);
  // Seed default shortcuts on first run.  Build #22: replaces the older
  // 10-tile default list with the 4 hand-picked tiles the new home page
  // expects (CricApp pinned + Instagram, Facebook, BBC News).
  const r = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM shortcuts');
  if (!r || r.c === 0) {
    const defaults = [
      { n: 'CricApp', u: CRICAPP_URL },
      { n: 'Instagram', u: 'https://www.instagram.com' },
      { n: 'Facebook', u: 'https://m.facebook.com' },
      { n: 'BBC News', u: 'https://www.bbc.com/news' },
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
  // Ensure CricApp is ALWAYS present (idempotent — UNIQUE on url skips
  // the insert if already there).  This protects existing installs that
  // were seeded with the old default list and never had CricApp.
  try {
    await db.runAsync(
      'INSERT OR IGNORE INTO shortcuts (name, url, icon, order_idx, created_at) VALUES (?, ?, ?, ?, ?)',
      ['CricApp', CRICAPP_URL, null, -1, Date.now()]
    );
  } catch {}
  return db;
}

// ── Pinned (non-deletable) shortcut: my own CricApp Play-Store listing ──
// User policy: this tile must NEVER be removable through the UI; it is
// the developer's revenue/discovery anchor on the home screen.
export const CRICAPP_URL =
  'https://play.google.com/store/apps/details?id=com.cricapp.live';

export function isPinnedShortcut(s: { name?: string; url?: string }): boolean {
  return s?.name === 'CricApp' || s?.url === CRICAPP_URL;
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
  // Block deletion of pinned shortcuts (CricApp).
  const row = await d.getFirstAsync<{ name: string; url: string }>(
    'SELECT name, url FROM shortcuts WHERE id = ?',
    [id]
  );
  if (row && isPinnedShortcut(row)) return;
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


// ──────────────────── Tabs (multi-tab system) ────────────────────
// Each tab is independently scoped to a `mode` ('normal' | 'ultralite').
// Switching the global UltraLite toggle flips which tab list is visible
// without touching the underlying records — tabs persist across mode
// switches AND app restarts.  Tabs are removed only when the user
// explicitly taps the X on the tab switcher.

export type TabMode = 'normal' | 'ultralite';

export interface Tab {
  id: number;
  mode: TabMode;
  url: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export async function createTab(mode: TabMode): Promise<number> {
  const d = await getDb();
  const now = Date.now();
  const r = await d.runAsync(
    'INSERT INTO tabs (mode, url, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [mode, '', '', now, now]
  );
  return r.lastInsertRowId ?? 0;
}

export async function updateTab(id: number, url: string, title: string): Promise<void> {
  const d = await getDb();
  await d.runAsync(
    'UPDATE tabs SET url = ?, title = ?, updated_at = ? WHERE id = ?',
    [url, title, Date.now(), id]
  );
}

export async function deleteTab(id: number): Promise<void> {
  const d = await getDb();
  await d.runAsync('DELETE FROM tabs WHERE id = ?', [id]);
}

export async function getTabs(mode: TabMode): Promise<Tab[]> {
  const d = await getDb();
  return await d.getAllAsync<Tab>(
    'SELECT * FROM tabs WHERE mode = ? ORDER BY updated_at DESC',
    [mode]
  );
}

export async function getTabById(id: number): Promise<Tab | null> {
  const d = await getDb();
  const r = await d.getFirstAsync<Tab>('SELECT * FROM tabs WHERE id = ?', [id]);
  return r ?? null;
}

export async function getTabCount(mode: TabMode): Promise<number> {
  const d = await getDb();
  const r = await d.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM tabs WHERE mode = ?',
    [mode]
  );
  return r?.c ?? 0;
}

// ──────────────────── Cleaned-HTML cache (build #24) ────────────────────
// Once UltraLite has fetched + cleaned a page, save the result so that
// re-tapping the same URL inside the cache TTL does NOT re-hit the network.
// Especially valuable on sub-60 kbps where every fetch costs 30-90 s.
//
// The `html_cache` table is created on first openDb() call (see schema
// above).  We do simple TTL-based eviction — anything older than `ttlMs`
// is treated as a miss and overwritten on the next fetch.
export interface HtmlCacheRow {
  url: string;
  html: string;
  title: string;
  created_at: number;
}

export async function getCachedHtml(
  url: string,
  ttlMs: number
): Promise<HtmlCacheRow | null> {
  const d = await getDb();
  const row = await d.getFirstAsync<HtmlCacheRow>(
    'SELECT * FROM html_cache WHERE url = ?',
    [url]
  );
  if (!row) return null;
  if (Date.now() - row.created_at > ttlMs) return null;
  return row;
}

export async function saveCachedHtml(
  url: string,
  html: string,
  title: string
): Promise<void> {
  const d = await getDb();
  try {
    await d.runAsync(
      `INSERT INTO html_cache (url, html, title, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(url) DO UPDATE SET html = excluded.html,
                                       title = excluded.title,
                                       created_at = excluded.created_at`,
      [url, html, title || '', Date.now()]
    );
  } catch {}
  // Trim old rows so the cache doesn't grow unbounded — keep most recent 200.
  try {
    await d.runAsync(
      `DELETE FROM html_cache WHERE url NOT IN
        (SELECT url FROM html_cache ORDER BY created_at DESC LIMIT 200)`
    );
  } catch {}
}

export async function clearHtmlCache(): Promise<void> {
  const d = await getDb();
  try {
    await d.runAsync('DELETE FROM html_cache');
  } catch {}
}
