/* eslint-disable no-console */
'use client';

/**
 * Simple SFX helper (no deps). Expects files in /public/sfx:
 * - /sfx/correct.mp3 (preferred when supported)
 * - /sfx/wrong.mp3
 * - /sfx/correct.ogg (fallback)
 * - /sfx/wrong.ogg
 *
 * NOTE: Browsers may block audio until user interacts with the page.
 */

type SfxName = 'correct' | 'wrong';

type SfxOptions = {
  volume?: number; // 0..1
};

const DEFAULT_VOLUME = 0.35;

const pools: Record<SfxName, HTMLAudioElement[]> = {
  correct: [],
  wrong: [],
};

function canPlay(mime: string) {
  try {
    const a = new Audio();
    const res = a.canPlayType(mime);
    return res === 'probably' || res === 'maybe';
  } catch {
    return false;
  }
}

function srcFor(name: SfxName) {
  const base = name === 'correct' ? '/sfx/correct' : '/sfx/wrong';
  // Prefer mp3 for Safari/iOS; fallback to ogg for Chrome/Firefox.
  if (canPlay('audio/mpeg')) return `${base}.mp3`;
  if (canPlay('audio/ogg; codecs=\"vorbis\"') || canPlay('audio/ogg')) return `${base}.ogg`;
  // As a last resort, try mp3 (even if canPlayType is inconclusive).
  return `${base}.mp3`;
}

function getAudioFromPool(name: SfxName, opts?: SfxOptions) {
  const pool = pools[name];

  // Try to reuse an idle audio element
  const idle = pool.find((a) => a.paused || a.ended);
  if (idle) return idle;

  // Create a new one, but keep pool small
  const a = new Audio(srcFor(name));
  a.preload = 'auto';
  a.volume = Math.max(0, Math.min(1, opts?.volume ?? DEFAULT_VOLUME));
  pool.push(a);
  if (pool.length > 4) pool.shift();
  return a;
}

export function playSfx(name: SfxName, opts?: SfxOptions) {
  try {
    const a = getAudioFromPool(name, opts);
    // allow rapid replays
    a.currentTime = 0;
    // ignore promise rejection (autoplay restrictions)
    void a.play();
  } catch {
    // ignore
  }
}

export function playCorrectSfx() {
  playSfx('correct');
}

export function playWrongSfx() {
  playSfx('wrong');
}

