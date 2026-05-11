// Mode + GLOBAL radio unlock state via simple module-level store + AsyncStorage.
//
// AdMob policy hardening (build #20): switched from a "per-channel" rewarded
// unlock (one ad per station — risked AdMob ad-cluster / invalid-traffic
// flags because each station is third-party content) to a SINGLE global
// "Radio Unlock" gate:
//
//   • User watches 2 rewarded ads → 30-min Ad-Free access to ALL stations.
//   • If ad fails to load on 10 consecutive button taps → automatic
//     "Network Grant" so users on weak 2G are never permanently blocked.
//   • One ad-event count per session is well within AdMob's frequency
//     guidance, and the unlock is for an APP feature, not third-party
//     content access.
//
// Persistence keys:
//   @ul/mode                 — '1' or '0' (UltraLite default)
//   @ul/radioUnlock          — JSON { exp:number, watched:0|1 }
//
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { REWARD_UNLOCK_MS } from '../constants/ads';

const MODE_KEY = '@ul/mode';
const RADIO_UNLOCK_KEY = '@ul/radioUnlock';
const ACTIVE_TAB_NORMAL_KEY = '@ul/activeTab/normal';
const ACTIVE_TAB_ULTRALITE_KEY = '@ul/activeTab/ultralite';
// Build #24 — user-controlled UltraLite preferences:
//   • allowImages : keep <img> tags in cleaned HTML (default off)
//   • allowJs     : route UltraLite URLs through URI WebView with full JS
//                   so AdMob / Play Console / SPA sites work (default off)
//   • desktopView : send a desktop User-Agent + 1024px viewport in BOTH
//                   modes so users can request the desktop site (default off)
const ALLOW_IMAGES_KEY = '@ul/allowImages';
const ALLOW_JS_KEY = '@ul/allowJs';
const DESKTOP_VIEW_KEY = '@ul/desktopView';
const ADS_REQUIRED = 2; // user must watch 2 rewarded ads

type Listener = () => void;
const listeners: Set<Listener> = new Set();

let _ultraLite = true; // default UltraLite for 2G
let _radioUnlockExp = 0; // ms epoch — when current 30-min window ends
let _radioWatched = 0; // 0 or 1 — number of ads watched towards next unlock
let _activeTabNormal = 0; // tab id (0 = none) — persisted per mode
let _activeTabUltraLite = 0;
let _allowImages = false;
let _allowJs = false;
let _desktopView = false;
let _hydrated = false;

export async function hydrate() {
  if (_hydrated) return;
  try {
    const m = await AsyncStorage.getItem(MODE_KEY);
    if (m !== null) _ultraLite = m === '1';
    const r = await AsyncStorage.getItem(RADIO_UNLOCK_KEY);
    if (r) {
      try {
        const parsed = JSON.parse(r);
        if (parsed && typeof parsed === 'object') {
          _radioUnlockExp = Number(parsed.exp) || 0;
          _radioWatched = Number(parsed.watched) || 0;
          // If the persisted unlock has already expired, reset progress so
          // users start fresh on next session.
          if (_radioUnlockExp && Date.now() >= _radioUnlockExp) {
            _radioUnlockExp = 0;
            _radioWatched = 0;
          }
        }
      } catch {}
    }
    const at1 = await AsyncStorage.getItem(ACTIVE_TAB_NORMAL_KEY);
    if (at1) _activeTabNormal = Number(at1) || 0;
    const at2 = await AsyncStorage.getItem(ACTIVE_TAB_ULTRALITE_KEY);
    if (at2) _activeTabUltraLite = Number(at2) || 0;
    const ai = await AsyncStorage.getItem(ALLOW_IMAGES_KEY);
    if (ai !== null) _allowImages = ai === '1';
    const aj = await AsyncStorage.getItem(ALLOW_JS_KEY);
    if (aj !== null) _allowJs = aj === '1';
    const dv = await AsyncStorage.getItem(DESKTOP_VIEW_KEY);
    if (dv !== null) _desktopView = dv === '1';
  } catch {}
  _hydrated = true;
  listeners.forEach((l) => l());
}

function notify() {
  listeners.forEach((l) => l());
}

async function persistRadio() {
  try {
    await AsyncStorage.setItem(
      RADIO_UNLOCK_KEY,
      JSON.stringify({ exp: _radioUnlockExp, watched: _radioWatched })
    );
  } catch {}
}

// ──────────────── UltraLite mode ────────────────
export function getUltraLite() {
  return _ultraLite;
}
export async function setUltraLite(v: boolean) {
  _ultraLite = v;
  try {
    await AsyncStorage.setItem(MODE_KEY, v ? '1' : '0');
  } catch {}
  notify();
}

// ──────────────── UltraLite preferences (build #24) ────────────────
export function getAllowImages(): boolean {
  return _allowImages;
}
export async function setAllowImages(v: boolean) {
  _allowImages = v;
  try {
    await AsyncStorage.setItem(ALLOW_IMAGES_KEY, v ? '1' : '0');
  } catch {}
  notify();
}
export function getAllowJs(): boolean {
  return _allowJs;
}
export async function setAllowJs(v: boolean) {
  _allowJs = v;
  try {
    await AsyncStorage.setItem(ALLOW_JS_KEY, v ? '1' : '0');
  } catch {}
  notify();
}
export function getDesktopView(): boolean {
  return _desktopView;
}
export async function setDesktopView(v: boolean) {
  _desktopView = v;
  try {
    await AsyncStorage.setItem(DESKTOP_VIEW_KEY, v ? '1' : '0');
  } catch {}
  notify();
}

// ──────────────── Global Radio unlock ────────────────
export function isRadioUnlocked(): boolean {
  return _radioUnlockExp > 0 && Date.now() < _radioUnlockExp;
}

export function radioRemainingMs(): number {
  if (!_radioUnlockExp) return 0;
  return Math.max(0, _radioUnlockExp - Date.now());
}

/** How many ads the user has already watched towards the current unlock. */
export function getRadioAdsWatched(): number {
  return _radioWatched;
}

/** How many ads still need to be watched before unlock kicks in. */
export function getRadioAdsRemaining(): number {
  return Math.max(0, ADS_REQUIRED - _radioWatched);
}

export function getRadioAdsRequired(): number {
  return ADS_REQUIRED;
}

/**
 * Record one rewarded-ad watch towards the global radio unlock.
 * Returns whether the unlock has now been activated.
 */
export async function recordRadioAdWatched(): Promise<{
  unlocked: boolean;
  watched: number;
  required: number;
}> {
  // If already unlocked, this is a no-op (extra ads won't extend the timer
  // — that's a deliberate AdMob-friendly cap so users can't farm ads).
  if (isRadioUnlocked()) {
    return { unlocked: true, watched: ADS_REQUIRED, required: ADS_REQUIRED };
  }
  _radioWatched = Math.min(ADS_REQUIRED, _radioWatched + 1);
  if (_radioWatched >= ADS_REQUIRED) {
    _radioUnlockExp = Date.now() + REWARD_UNLOCK_MS;
    _radioWatched = 0; // reset for next 30-min window
    await persistRadio();
    notify();
    return { unlocked: true, watched: ADS_REQUIRED, required: ADS_REQUIRED };
  }
  await persistRadio();
  notify();
  return { unlocked: false, watched: _radioWatched, required: ADS_REQUIRED };
}

/**
 * Network-Grant fallback: when the rewarded-ad SDK fails 10 times in a row
 * (ad-fill issue / 2G can't load it), grant the 30-min unlock anyway so the
 * user is never stuck on a weak link.
 */
export async function grantRadioFallback() {
  _radioUnlockExp = Date.now() + REWARD_UNLOCK_MS;
  _radioWatched = 0;
  await persistRadio();
  notify();
}

/**
 * Share-app unlock: when the user shares the app via the native share
 * sheet (WhatsApp / SMS / Telegram …) we grant a 30-min radio unlock as
 * a non-ad alternative.  Mirrors `grantRadioFallback` but is triggered
 * by an explicit, intentional user action, not a network error.
 */
export async function grantRadioShareUnlock() {
  _radioUnlockExp = Date.now() + REWARD_UNLOCK_MS;
  _radioWatched = 0;
  await persistRadio();
  notify();
}

/** Manual lock (debug / future "lock now" button). Currently unused in UI. */
export async function lockRadio() {
  _radioUnlockExp = 0;
  _radioWatched = 0;
  await persistRadio();
  notify();
}

// ──────────────────── Active-tab persistence (per mode) ────────────────────
export function getActiveTabId(mode: 'normal' | 'ultralite'): number {
  return mode === 'ultralite' ? _activeTabUltraLite : _activeTabNormal;
}

export async function setActiveTabId(
  mode: 'normal' | 'ultralite',
  id: number
) {
  if (mode === 'ultralite') {
    _activeTabUltraLite = id;
    await AsyncStorage.setItem(ACTIVE_TAB_ULTRALITE_KEY, String(id));
  } else {
    _activeTabNormal = id;
    await AsyncStorage.setItem(ACTIVE_TAB_NORMAL_KEY, String(id));
  }
  notify();
}

export function useAppState() {
  const [, set] = useState({});
  useEffect(() => {
    const l = () => set({});
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  // Tick every 30 s ONLY while the radio unlock window is active so the
  // visible countdown stays current.  When the radio is locked there's
  // nothing time-dependent on screen, so the interval is skipped — this
  // eliminates the 30-second "flutter" the FlatList exhibited on the
  // Radio tab while the user was browsing locked stations.
  useEffect(() => {
    if (!isRadioUnlocked()) return;
    const id = setInterval(() => set({}), 30000);
    return () => clearInterval(id);
  }, [_radioUnlockExp]);
  return {
    ultraLite: _ultraLite,
    hydrated: _hydrated,
    radioUnlocked: isRadioUnlocked(),
    radioRemainingMs: radioRemainingMs(),
    radioAdsWatched: _radioWatched,
    radioAdsRequired: ADS_REQUIRED,
    allowImages: _allowImages,
    allowJs: _allowJs,
    desktopView: _desktopView,
  };
}
