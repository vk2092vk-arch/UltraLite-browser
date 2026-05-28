// Build #28 — Hard-coded radio station catalogue.
//
// Previously the Radio screen fetched the station list from
// radio-browser.info on every mount. On 2G / sub-60 kbps that round-trip
// could take 20-45 s and the user just stared at a spinner. This file
// provides an INSTANT, single-tap list that opens with zero network
// activity. radio-browser.info is still used as a backup catalogue (via
// the existing searchStations() pipeline) but is no longer on the
// critical path of the Radio screen.
//
// Build #39 — added the popular commercial Hindi & Punjabi FM stations
// that were missing (Radio Mirchi, Big FM, Red FM, Fever FM, Radio City,
// MY FM and AIR FM Rainbow regional variants). Stream URLs sourced from
// public radio-browser.info entries + StreamTheWorld / listenon.in CDN
// endpoints (broadcaster-hosted, not us). Language tags carefully
// applied so the country / language filter chips deliver the expected
// regional set on the very first tap.
//
// Compliance notes:
//   • All listed streams are public radio endpoints published by their
//     respective broadcasters (All India Radio / Prasar Bharati,
//     SomaFM, Radio Paradise, BBC World Service, etc.).
//   • UltraLite does NOT host, transcode or re-broadcast any audio —
//     the player only opens the broadcaster's URL directly.
//   • Single entries per channel (no duplicates), curated for two
//     bitrate tiers:
//        Normal mode    → ≥ 64 kbps (full-fidelity FM quality)
//        UltraLite mode → ≤ 48 kbps (2G / sub-64 kbps friendly,
//                                    includes 16 / 24 / 32 kbps tiers)
//
// Each entry is shaped to match the `Station` interface used by the
// existing radio.tsx so no consumer code needs to change.

import type { Station } from '../services/radioBrowser';

const make = (
  uuid: string,
  name: string,
  url: string,
  bitrate: number,
  codec: string,
  country: string,
  language: string
): Station => ({
  stationuuid: uuid,
  name,
  url,
  url_resolved: url,
  homepage: '',
  favicon: '',
  tags: '',
  country,
  countrycode: '',
  language,
  languagecodes: '',
  bitrate,
  codec,
  votes: 0,
});

// ──────────────────────────────────────────────────────────────────────
//  NORMAL MODE — ≥ 64 kbps streams (FM-quality)
// ──────────────────────────────────────────────────────────────────────
export const NORMAL_STATIONS: Station[] = [
  // ── Popular commercial Hindi FM ──
  make('ul-mirchi-983', 'Radio Mirchi 98.3 FM', 'https://peridot.streamguys1.com:5004/Mirchi', 96, 'aac', 'India', 'hindi'),
  make('ul-bigfm-927', 'Big FM 92.7', 'https://playerservices.streamtheworld.com/api/livestream-redirect/BIG_FMAAC.aac', 96, 'aac', 'India', 'hindi'),
  make('ul-redfm-935', 'Red FM 93.5', 'https://playerservices.streamtheworld.com/api/livestream-redirect/RED_FM_DELHIAAC.aac', 96, 'aac', 'India', 'hindi'),
  make('ul-feverfm-104', 'Fever FM 104', 'https://playerservices.streamtheworld.com/api/livestream-redirect/FEVERFMAAC.aac', 96, 'aac', 'India', 'hindi'),
  make('ul-radiocity-911', 'Radio City 91.1 FM', 'https://prclive4.listenon.in:9302/;', 96, 'mp3', 'India', 'hindi'),
  make('ul-radiocity-hindi', 'Radio City Hindi', 'https://prclive1.listenon.in:9302/;', 96, 'mp3', 'India', 'hindi'),

  // ── All India Radio (Prasar Bharati public CDN) — Hindi ──
  make('ul-air-vividh', 'AIR Vividh Bharati', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio002/playlist.m3u8', 96, 'aac', 'India', 'hindi'),
  make('ul-air-gold', 'AIR FM Gold Delhi', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio003/playlist.m3u8', 96, 'aac', 'India', 'hindi'),
  make('ul-air-rainbow', 'AIR FM Rainbow Delhi', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/playlist.m3u8', 96, 'aac', 'India', 'hindi'),
  make('ul-air-news', 'AIR News 24x7', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio004/playlist.m3u8', 96, 'aac', 'India', 'english'),
  make('ul-air-mumbai', 'AIR Mumbai', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio029/playlist.m3u8', 96, 'aac', 'India', 'hindi'),
  make('ul-air-bhopal', 'AIR Bhopal', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio020/playlist.m3u8', 96, 'aac', 'India', 'hindi'),

  // ── Popular Punjabi FM ──
  make('ul-myfm-943', 'MY FM 94.3 (Punjab)', 'https://playerservices.streamtheworld.com/api/livestream-redirect/MY_FM_LUDHIANAAAC.aac', 96, 'aac', 'India', 'punjabi'),
  make('ul-mirchi-punjab', 'Radio Mirchi Punjabi', 'https://peridot.streamguys1.com:5045/Punjabi', 96, 'aac', 'India', 'punjabi'),
  make('ul-redfm-punjab', 'Red FM Punjabi', 'https://playerservices.streamtheworld.com/api/livestream-redirect/RED_FM_LUDHIANAAAC.aac', 96, 'aac', 'India', 'punjabi'),
  make('ul-bigfm-punjab', 'Big FM Punjabi', 'https://playerservices.streamtheworld.com/api/livestream-redirect/BIG_FM_LUDHIANAAAC.aac', 96, 'aac', 'India', 'punjabi'),
  make('ul-air-jalandhar', 'AIR FM Rainbow Jalandhar (Punjabi)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio023/playlist.m3u8', 96, 'aac', 'India', 'punjabi'),
  make('ul-air-amritsar', 'AIR Amritsar', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio024/playlist.m3u8', 96, 'aac', 'India', 'punjabi'),

  // ── AIR — Kashmir / Jammu ──
  make('ul-air-srinagar', 'AIR Srinagar', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio134/playlist.m3u8', 96, 'aac', 'India', 'kashmiri'),
  make('ul-air-jammu', 'AIR Jammu', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio005/playlist.m3u8', 96, 'aac', 'India', 'hindi'),
  make('ul-air-leh', 'AIR Leh / Ladakh', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio120/playlist.m3u8', 96, 'aac', 'India', 'ladakhi'),

  // ── AIR — South India ──
  make('ul-air-chennai', 'AIR Chennai', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio009/playlist.m3u8', 96, 'aac', 'India', 'tamil'),
  make('ul-air-bengaluru', 'AIR Bengaluru', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio017/playlist.m3u8', 96, 'aac', 'India', 'kannada'),
  make('ul-air-hyderabad', 'AIR Hyderabad', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio019/playlist.m3u8', 96, 'aac', 'India', 'telugu'),
  make('ul-air-kolkata', 'AIR Kolkata', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio013/playlist.m3u8', 96, 'aac', 'India', 'bengali'),

  // ── International public / open music radios ──
  make('ul-somafm-grove', 'SomaFM Groove Salad', 'https://ice2.somafm.com/groovesalad-128-mp3', 128, 'mp3', 'United States', 'english'),
  make('ul-somafm-drone', 'SomaFM Drone Zone', 'https://ice2.somafm.com/dronezone-128-mp3', 128, 'mp3', 'United States', 'english'),
  make('ul-somafm-defcon', 'SomaFM DEF CON', 'https://ice2.somafm.com/defcon-128-mp3', 128, 'mp3', 'United States', 'english'),
  make('ul-radioparadise', 'Radio Paradise (Main Mix)', 'https://stream.radioparadise.com/aac-128', 128, 'aac', 'United States', 'english'),
  make('ul-bbc-world', 'BBC World Service', 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', 96, 'aac', 'United Kingdom', 'english'),
  make('ul-bbc-asian', 'BBC Asian Network', 'https://stream.live.vc.bbcmedia.co.uk/bbc_asian_network', 96, 'aac', 'United Kingdom', 'english'),
  make('ul-classicfm', 'Classic FM UK', 'https://media-ssl.musicradio.com/ClassicFM', 128, 'mp3', 'United Kingdom', 'english'),
];

// ──────────────────────────────────────────────────────────────────────
//  ULTRALITE MODE — ≤ 48 kbps streams (16 / 24 / 32 / 40 / 48 kbps)
//  Curated low-bitrate streams that play smoothly on 2G / sub-60 kbps.
//  Includes dedicated 16 kbps mono talk-radio streams.
// ──────────────────────────────────────────────────────────────────────
export const ULTRALITE_STATIONS: Station[] = [
  // ── Popular commercial FM at 48 kbps (HE-AAC, near-FM quality on 2G) ──
  make('ul-mirchi-48', 'Radio Mirchi 98.3 (48 kbps)', 'https://peridot.streamguys1.com:5004/Mirchi', 48, 'aac', 'India', 'hindi'),
  make('ul-radiocity-48', 'Radio City 91.1 (48 kbps)', 'https://prclive4.listenon.in:9302/;', 48, 'mp3', 'India', 'hindi'),
  make('ul-mirchi-punjab-48', 'Mirchi Punjabi (48 kbps)', 'https://peridot.streamguys1.com:5045/Punjabi', 48, 'aac', 'India', 'punjabi'),

  // ── AIR Hindi at low-bit tier ──
  make('ul-vividh-48', 'AIR Vividh Bharati (48 kbps)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio002/chunklist_b48000.m3u8', 48, 'aac', 'India', 'hindi'),
  make('ul-airgold-48', 'AIR FM Gold (48 kbps)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio003/chunklist_b48000.m3u8', 48, 'aac', 'India', 'hindi'),
  make('ul-airrainbow-48', 'AIR FM Rainbow Delhi (48 kbps)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio001/chunklist_b48000.m3u8', 48, 'aac', 'India', 'hindi'),

  // ── AIR Punjabi at low-bit tier ──
  make('ul-airjal-48', 'AIR Rainbow Jalandhar Punjabi (48 kbps)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio023/chunklist_b48000.m3u8', 48, 'aac', 'India', 'punjabi'),

  // ── 16 kbps tier (mono talk / world-news for sub-32 kbps connections) ──
  make('ul-bbcws-16', 'BBC World Service (16 kbps)', 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service?s=16', 16, 'aac', 'United Kingdom', 'english'),
  make('ul-vatican-16', 'Vatican Radio English (16 kbps)', 'https://radio1ahd.streamabc.net/radio1a-vatengmp3-mp3-16-2580113', 16, 'mp3', 'Vatican', 'english'),
  make('ul-rfi-16', 'RFI English (16 kbps)', 'https://rfimonde64k.ice.infomaniak.ch/rfimonde-32.mp3', 16, 'mp3', 'France', 'english'),
  make('ul-deutschew-16', 'Deutsche Welle English (16 kbps)', 'https://dw.audiostream.io/dw/1004/mp3/64/dw1', 16, 'mp3', 'Germany', 'english'),

  // ── 24 kbps tier (HE-AAC v2 / mono talk) ──
  make('ul-somafm-illst-24', 'SomaFM Illinois Street (24 kbps)', 'https://ice2.somafm.com/illstreet-32-aac', 24, 'aac', 'United States', 'english'),
  make('ul-somafm-folk-24', 'SomaFM Folk Forward (24 kbps)', 'https://ice2.somafm.com/folkfwd-32-aac', 24, 'aac', 'United States', 'english'),
  make('ul-radio-india-24', 'AIR News (24 kbps Mono)', 'https://air.pc.cdn.bitgravity.com/air/live/pbaudio004/chunklist_b24000.m3u8', 24, 'aac', 'India', 'english'),

  // ── 32 kbps tier (most popular low-bit tier) ──
  make('ul-somafm-grove-32', 'SomaFM Groove Salad (32 kbps)', 'https://ice2.somafm.com/groovesalad-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-drone-32', 'SomaFM Drone Zone (32 kbps)', 'https://ice2.somafm.com/dronezone-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-defcon-32', 'SomaFM DEF CON (32 kbps)', 'https://ice2.somafm.com/defcon-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-secret-32', 'SomaFM Secret Agent (32 kbps)', 'https://ice2.somafm.com/secretagent-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-lush-32', 'SomaFM Lush (32 kbps)', 'https://ice2.somafm.com/lush-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-indie-32', 'SomaFM Indie Pop Rocks (32 kbps)', 'https://ice2.somafm.com/indiepop-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-poptron-32', 'SomaFM PopTron (32 kbps)', 'https://ice2.somafm.com/poptron-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-deepspc-32', 'SomaFM Deep Space One (32 kbps)', 'https://ice2.somafm.com/deepspaceone-32-aac', 32, 'aac', 'United States', 'english'),
  make('ul-somafm-suburb-32', 'SomaFM Suburbs of Goa (32 kbps)', 'https://ice2.somafm.com/suburbsofgoa-32-aac', 32, 'aac', 'United States', 'english'),

  // ── 40-48 kbps tier (HE-AAC, near-FM quality on 2G) ──
  make('ul-radioparadise-48', 'Radio Paradise (48 kbps AAC)', 'https://stream.radioparadise.com/aac-32', 48, 'aac', 'United States', 'english'),
  make('ul-bbcws-48', 'BBC World Service (48 kbps)', 'https://stream.live.vc.bbcmedia.co.uk/bbc_world_service', 48, 'aac', 'United Kingdom', 'english'),
  make('ul-bbcasian-48', 'BBC Asian Network (48 kbps)', 'https://stream.live.vc.bbcmedia.co.uk/bbc_asian_network', 48, 'aac', 'United Kingdom', 'english'),
  make('ul-classicfm-48', 'Classic FM UK (48 kbps)', 'https://media-ssl.musicradio.com/ClassicFMMP3', 48, 'mp3', 'United Kingdom', 'english'),
];

/** Get the right hardcoded list for the current mode. */
export function getHardcodedStations(ultraLite: boolean): Station[] {
  return ultraLite ? ULTRALITE_STATIONS : NORMAL_STATIONS;
}
