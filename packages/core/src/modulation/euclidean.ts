import { EuclideanConfig } from "./types";

/**
 * Generates an Euclidean rhythm pattern using the Bjorklund algorithm.
 * @param steps Total number of steps
 * @param pulses Number of active hits
 * @returns Array of booleans representing the pattern
 */
export function generateEuclidean(steps: number, pulses: number): boolean[] {
  if (steps <= 0) return [];
  const safePulses = Math.min(Math.max(0, pulses), steps);
  if (safePulses === 0) return Array(steps).fill(false);
  if (safePulses === steps) return Array(steps).fill(true);

  let groups: boolean[][] = [];
  for (let i = 0; i < steps; i++) {
    groups.push([i < safePulses]);
  }

  let l = steps;
  let r = safePulses;
  let d = steps - safePulses;

  while (r > 1) {
    const count = Math.min(r, d);
    for (let i = 0; i < count; i++) {
      groups[i] = [...groups[i], ...groups.pop()!];
    }
    if (r > d) {
      r = r - d;
    } else {
      d = d - r;
      r = count;
    }
  }

  return groups.flat();
}

/**
 * Evaluates the Euclidean pulse at a given time.
 * @param config Euclidean configuration
 * @param timeInBars Global clock time
 * @returns 1 if pulse is active, 0 otherwise
 */
export function evaluateEuclidean(
  config: EuclideanConfig,
  timeInBars: number
): number {
  if (config.steps <= 0) return 0;

  const pattern = generateEuclidean(config.steps, config.pulses);
  const rawPosition = timeInBars / config.rate;
  const currentStep =
    (Math.floor(rawPosition) + (config.rotate || 0)) % config.steps;

  // Ensure index is positive
  const idx = ((currentStep % config.steps) + config.steps) % config.steps;

  return pattern[idx] ? 1 : 0;
}
