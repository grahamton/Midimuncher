import type { LFOConfig } from "./types";

/**
 * Evaluates an LFO at a specific time.
 * @param config The LFO configuration
 * @param timeInBars Global transport time in bars (float)
 * @returns The output value, typically 0-1 (unipolar) or -1 to 1 (bipolar)
 */
export function evaluateLFO(config: LFOConfig, timeInBars: number): number {
  if (!config.enabled) return 0;

  // Calculate phase position
  const rate = config.rate || 1;
  const phaseOffset = config.phase || 0;

  // t is the normalized progress through one cycle (0 -> 1)
  const t = (timeInBars / rate + phaseOffset) % 1;

  let raw = 0;

  switch (config.shape) {
    case "sine":
      // Math.sin takes radians (0 -> 2PI)
      // Result -1 to 1
      raw = Math.sin(t * Math.PI * 2);
      break;

    case "triangle":
      // 0 -> 1 (up), 0.5 -> -1 (down), 1 -> 0
      // 4 * abs(t - 0.5) - 1 ??
      // Let's use:
      // 0..0.25 -> 0..1
      // 0.25..0.75 -> 1..-1
      // 0.75..1 -> -1..0
      raw = 1 - 4 * Math.abs(((t + 0.25) % 1) - 0.5);
      break;

    case "saw":
      // -1 to 1
      raw = 2 * (t - 0.5); // t=0->-1, t=0.5->0, t=1->1. Actually saw usually drops?
      // Saw Down: 1 -> -1
      // Saw Up: -1 -> 1
      // Let's implement Saw Up (Ramp)
      raw = -1 + 2 * t;
      break;

    case "square":
      raw = t < 0.5 ? 1 : -1;
      break;

    case "random":
    case "noise":
      // "random" usually implies S&H (stepped random per cycle)
      // "noise" implies white noise (random every tick)
      // We need state for S&H to be deterministic if we want that.
      // For now, let's just do pure noise for "noise" and simple seeded-like hash for "random" (S&H)
      if (config.shape === "noise") {
        raw = Math.random() * 2 - 1;
      } else {
        // S&H: stable for the duration of the cycle
        // Hash the integer cycle count
        const cycle = Math.floor(timeInBars / rate + phaseOffset);
        const seed = Math.sin(cycle * 9999.9) * 43758.5453; // pseudo-random hash
        raw = (seed - Math.floor(seed)) * 2 - 1;
      }
      break;
  }

  // Apply scaling
  // output = raw * depth
  let value = raw * config.depth;

  // Bias/Offset
  // If we want to shift the center.
  // standard LFO: center is 0.
  // If unipolar, we usually want 0..1 range.

  if (!config.bipolar) {
    // Convert -1..1 range to 0..1
    value = (value + 1) / 2;
  }

  // Apply bias? For now let's minimal implementation.

  return value;
}
