import type { MidiMsg } from "./types";

const PANIC_CONTROLLERS = {
  allSoundOff: 120,
  allNotesOff: 123
} as const;

const MAX_CHANNEL = 16;

function clampChannel(ch: number): number {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch), 1), MAX_CHANNEL);
}

function uniqueChannels(channels: number[]): number[] {
  const seen = new Set<number>();
  channels.forEach((ch) => {
    const cleaned = clampChannel(ch);
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
    }
  });
  return Array.from(seen).sort((a, b) => a - b);
}

/**
 * Generate a set of panic-safe controller messages for the provided channels.
 * The messages include All Notes Off (CC 123) and All Sound Off (CC 120).
 */
export function buildPanicMessages(channels: number[]): MidiMsg[] {
  const msgs: MidiMsg[] = [];
  const unique = uniqueChannels(channels);

  unique.forEach((ch) => {
    msgs.push({ t: "cc", ch, cc: PANIC_CONTROLLERS.allNotesOff, val: 0 });
    msgs.push({ t: "cc", ch, cc: PANIC_CONTROLLERS.allSoundOff, val: 0 });
  });

  return msgs;
}

export const PANIC_CC = PANIC_CONTROLLERS;
