import { SequencerConfig } from "./types";

/**
 * Calculates the current value of a sequencer lane based on time.
 * @param config The sequencer configuration
 * @param timeInBars The current time in bars (e.g. 1.25)
 * @returns A value between 0 and 1
 */
export function evaluateSequencer(
  config: SequencerConfig,
  timeInBars: number
): number {
  if (!config.steps || config.steps.length === 0) return 0;

  const totalSteps = config.steps.length;
  const rawPosition = timeInBars / config.rate;
  const currentStepIdx = Math.floor(rawPosition) % totalSteps;

  if (!config.smooth) {
    return config.steps[currentStepIdx];
  }

  // Smooth interpolation
  const nextStepIdx = (currentStepIdx + 1) % totalSteps;
  const progressWithinStep = rawPosition % 1;

  const currentVal = config.steps[currentStepIdx];
  const nextVal = config.steps[nextStepIdx];

  return currentVal + (nextVal - currentVal) * progressWithinStep;
}
