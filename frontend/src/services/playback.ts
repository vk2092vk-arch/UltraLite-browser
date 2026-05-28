// Global playback singleton — solves three bugs in one place:
//
//  Bug #1 (loading takes forever, can't be cancelled): the in-flight
//      createAsync() promise was unaware of stop requests. Now a single
//      monotonic `seq` counter invalidates ANY in-flight load the moment
//      the user taps stop OR another station OR navigates away.
//
//  Bug #2 (cross / stop button does nothing while loading): the previous
//      code set `currentSoundRef.current = null` synchronously, but the
//      still-running createAsync() did not observe this and went on to
//      attach the sound after the user thought they had cancelled. This
//      module bumps `seq` and re-checks it AFTER createAsync resolves;
//      stale loads now dispose themselves and never play.
//
//  Bug #3 (UltraLite + Normal both playing at the same time): the
//      previous solution used a React ref scoped to the radio.tsx
//      component. Navigating between Normal/UltraLite tabs unmounts
//      radio.tsx, the ref disappears, and the orphan in-flight load
//      from the OLD mount can no longer be invalidated by the NEW mount.
//      Moving the seq + sound to a module-level singleton makes the
//      check survive ANY remount, ANY screen change, ANY mode switch.
//
// Public API:
//   playStation(station)   - start playing a station (cancels prior)
//   stopPlayback()         - stop whatever is playing / loading
//   togglePause()          - pause / resume the current sound (no unload)
//   subscribe(listener)    - get notified of playback state changes
//   getState()             - read the current snapshot
//
// The radio.tsx screen subscribes for UI rendering. Anything else
// (mini-player on home, etc.) can subscribe too without conflicting.

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

export type PlaybackStation = {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved?: string;
};

export type PlaybackState = {
  station: PlaybackStation | null;
  isLoading: boolean;
  isPaused: boolean;
  isPlaying: boolean;
};

type Listener = (s: PlaybackState) => void;

const STREAM_TIMEOUT_MS = 20000;
const POLL_INTERVAL_MS = 250;

let currentSound: Audio.Sound | null = null;
let currentStation: PlaybackStation | null = null;
let seq = 0;
let isLoading = false;
let isPaused = false;
const listeners = new Set<Listener>();

let audioModeConfigured = false;
async function ensureAudioMode() {
  if (audioModeConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    });
    audioModeConfigured = true;
  } catch {
    // Even if this fails, playback still works in foreground.
  }
}

function emit() {
  const state: PlaybackState = {
    station: currentStation,
    isLoading,
    isPaused,
    isPlaying: !!currentSound && !isLoading && !isPaused,
  };
  listeners.forEach((l) => {
    try {
      l(state);
    } catch {}
  });
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  // Push the current state immediately so the subscriber paints fresh.
  listener({
    station: currentStation,
    isLoading,
    isPaused,
    isPlaying: !!currentSound && !isLoading && !isPaused,
  });
  return () => {
    listeners.delete(listener);
  };
}

export function getState(): PlaybackState {
  return {
    station: currentStation,
    isLoading,
    isPaused,
    isPlaying: !!currentSound && !isLoading && !isPaused,
  };
}

export async function stopPlayback(): Promise<void> {
  // Bump seq FIRST so any in-flight createAsync() resolves into a stale
  // branch that disposes itself instead of attaching a sound.
  seq += 1;
  const dyingSound = currentSound;
  currentSound = null;
  currentStation = null;
  isLoading = false;
  isPaused = false;
  emit();
  if (dyingSound) {
    try {
      await dyingSound.stopAsync();
    } catch {}
    try {
      await dyingSound.unloadAsync();
    } catch {}
  }
}

export async function togglePause(): Promise<void> {
  const s = currentSound;
  if (!s) return;
  try {
    const status: any = await s.getStatusAsync();
    if (!status?.isLoaded) return;
    if (status.isPlaying) {
      await s.pauseAsync();
      isPaused = true;
    } else {
      await s.playAsync();
      isPaused = false;
    }
    emit();
  } catch {}
}

export async function playStation(station: PlaybackStation): Promise<void> {
  await ensureAudioMode();

  // Bump seq + null-out the ref synchronously so a fast-following tap
  // and the old createAsync() can both observe the change.
  seq += 1;
  const mySeq = seq;
  const dyingSound = currentSound;
  currentSound = null;
  currentStation = station;
  isLoading = true;
  isPaused = false;
  emit();

  // Best-effort dispose of the previous sound; do NOT await so the
  // next createAsync() can race in parallel.
  if (dyingSound) {
    dyingSound.stopAsync().catch(() => {});
    dyingSound.unloadAsync().catch(() => {});
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    const createPromise = Audio.Sound.createAsync(
      { uri: station.url_resolved || station.url },
      {
        shouldPlay: true,
        isLooping: false,
        progressUpdateIntervalMillis: 500,
        // ExoPlayer (default on SDK 54) starts streams faster than the
        // legacy MediaPlayer implementation.
      } as any,
      (status: any) => {
        // If we've been superseded, do nothing — the load() resolution
        // below handles the cleanup.
        if (seq !== mySeq) return;
        if (!status?.isLoaded) {
          if (status?.error) {
            // Don't kill the load on transient errors — just log.
            // eslint-disable-next-line no-console
            console.warn('[playback] stream err', status.error);
          }
          return;
        }
        // First frame arrived → mark as playing.
        if (status.isPlaying && isLoading) {
          isLoading = false;
          emit();
        }
      }
    );
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('STREAM_TIMEOUT')),
        STREAM_TIMEOUT_MS
      );
    });
    const result = await Promise.race([createPromise, timeoutPromise]);
    const sound = (result as { sound: Audio.Sound }).sound;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // GUARD: if another play/stop happened during the await, this sound
    // is orphaned — kill it before it can produce audio.
    if (seq !== mySeq) {
      sound.stopAsync().catch(() => {});
      sound.unloadAsync().catch(() => {});
      return;
    }

    currentSound = sound;
    isLoading = false;
    emit();
  } catch (e: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (seq === mySeq) {
      // We are still the active attempt — clear state and surface the err.
      isLoading = false;
      currentStation = null;
      emit();
    }
    throw e;
  }
}

// Cheap "is the SDK still loading me" poll for the UI.
export function pollLoadingUntil(
  expectStationId: string,
  maxMs: number
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      const st = getState();
      if (st.station?.stationuuid !== expectStationId || !st.isLoading) {
        resolve(!st.isLoading);
        return;
      }
      if (Date.now() - started > maxMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
}
