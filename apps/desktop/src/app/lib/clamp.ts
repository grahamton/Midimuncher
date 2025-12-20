export function clampChannel(channel: number) {
  if (Number.isNaN(channel)) return 1;
  return Math.min(Math.max(Math.round(channel), 1), 16);
}

export function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

