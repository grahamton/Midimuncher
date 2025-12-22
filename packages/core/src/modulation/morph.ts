import {
  ModulationSource,
  LFOConfig,
  SequencerConfig,
  EuclideanConfig,
} from "./types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function morphLFO(a: LFOConfig, b: LFOConfig, t: number): LFOConfig {
  return {
    ...a,
    rate: lerp(a.rate, b.rate, t),
    depth: lerp(a.depth, b.depth, t),
    phase: lerp(a.phase, b.phase, t),
    bias: lerp(a.bias, b.bias, t),
  };
}

function morphSequencer(
  a: SequencerConfig,
  b: SequencerConfig,
  t: number
): SequencerConfig {
  // Morph numeric parameters
  const morphedSteps = a.steps.map((val, i) => {
    const valB = b.steps[i] ?? val;
    return lerp(val, valB, t);
  });

  return {
    ...a,
    rate: lerp(a.rate, b.rate, t),
    steps: morphedSteps,
  };
}

function morphEuclidean(
  a: EuclideanConfig,
  b: EuclideanConfig,
  t: number
): EuclideanConfig {
  return {
    ...a,
    steps: Math.round(lerp(a.steps, b.steps, t)),
    pulses: Math.round(lerp(a.pulses, b.pulses, t)),
    rotate: Math.round(lerp(a.rotate, b.rotate, t)),
    rate: lerp(a.rate, b.rate, t),
  };
}

/**
 * Morphs between two sets of modulation sources.
 * Sources are matched by ID.
 * @param current Current source list
 * @param target Target source list from a scene
 * @param t Morph amount (0-1)
 */
export function morphModulationSources(
  current: ModulationSource[],
  target: ModulationSource[],
  t: number
): ModulationSource[] {
  if (t === 0) return current;
  if (t === 1) return target;

  return current.map((srcA) => {
    const srcB = target.find((s) => s.id === srcA.id);
    if (!srcB || srcA.type !== srcB.type) return srcA;

    if (srcA.type === "lfo" && srcB.type === "lfo") {
      return morphLFO(srcA, srcB, t);
    }
    if (srcA.type === "sequencer" && srcB.type === "sequencer") {
      return morphSequencer(srcA, srcB, t);
    }
    if (srcA.type === "euclidean" && srcB.type === "euclidean") {
      return morphEuclidean(srcA, srcB, t);
    }

    return srcA;
  });
}
