// Mode + per-channel reward unlock state via simple module-level store + AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { REWARD_UNLOCK_MS } from '../constants/ads';

const MODE_KEY = '@ul/mode';
const CHANNEL_UNLOCKS_KEY = '@ul/channelUnlocks'; // { [stationuuid]: expiryMs }

type Listener = () => void;
const listeners: Set<Listener> = new Set();

let _ultraLite = true; // default UltraLite for 2G
let _channelUnlocks: Record<string, number> = {};
let _hydrated = false;

export async function hydrate() {
  if (_hydrated) return;
  try {
    const m = await AsyncStorage.getItem(MODE_KEY);
    if (m !== null) _ultraLite = m === '1';
    const r = await AsyncStorage.getItem(CHANNEL_UNLOCKS_KEY);
    if (r) {
      try {
        const parsed = JSON.parse(r);
        if (parsed && typeof parsed === 'object') _channelUnlocks = parsed;
      } catch {}
    }
  } catch {}
  _hydrated = true;
  listeners.forEach((l) => l());
}

function notify() {
  listeners.forEach((l) => l());
}

async function persistChannels() {
  try {
    // Clean up expired entries before persisting to avoid storage bloat.
    const now = Date.now();
    const cleaned: Record<string, number> = {};
    Object.entries(_channelUnlocks).forEach(([k, v]) => {
      if (v > now) cleaned[k] = v;
    });
    _channelUnlocks = cleaned;
    await AsyncStorage.setItem(CHANNEL_UNLOCKS_KEY, JSON.stringify(cleaned));
  } catch {}
}

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

// ---------- Per-channel reward unlock ----------
export function isChannelUnlocked(stationuuid: string): boolean {
  const exp = _channelUnlocks[stationuuid];
  return !!exp && Date.now() < exp;
}

export function channelRemainingMs(stationuuid: string): number {
  const exp = _channelUnlocks[stationuuid];
  if (!exp) return 0;
  return Math.max(0, exp - Date.now());
}

export async function grantChannelReward(stationuuid: string) {
  if (!stationuuid) return;
  _channelUnlocks[stationuuid] = Date.now() + REWARD_UNLOCK_MS;
  await persistChannels();
  notify();
}

export function getUnlockedChannels(): Record<string, number> {
  const now = Date.now();
  const out: Record<string, number> = {};
  Object.entries(_channelUnlocks).forEach(([k, v]) => {
    if (v > now) out[k] = v;
  });
  return out;
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
  // Tick every 30s so countdowns visually refresh even without user interaction.
  useEffect(() => {
    const id = setInterval(() => set({}), 30000);
    return () => clearInterval(id);
  }, []);
  return {
    ultraLite: _ultraLite,
    hydrated: _hydrated,
    unlockedChannels: getUnlockedChannels(),
  };
}
