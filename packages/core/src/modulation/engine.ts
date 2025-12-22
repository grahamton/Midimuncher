import type {
  ModulationEngineState,
  ModulationSource,
  ModulationTarget,
} from "./types";
import { evaluateLFO } from "./lfo";
import { evaluateSequencer } from "./sequencer";
import { evaluateEuclidean } from "./euclidean";

export interface ComputedModulation {
  sourceId: string;
  sourceValue: number; // 0-1 (unipolarized for mapping) or -1..1 depending on config
  targetControlId: string;
  effectiveScalar: number; // Value to add/multiply to the target
}

export class ModulationEngine {
  private sources: Map<string, ModulationSource> = new Map();
  private targets: ModulationTarget[] = [];

  setState(state: ModulationEngineState) {
    this.sources.clear();
    state.sources.forEach((s) => this.sources.set(s.id, s));
    this.targets = [...state.targets];
  }

  /**
   * Ticks the engine and returns map of computed modulations to apply.
   * @param timeInBars Global clock time
   */
  tick(timeInBars: number): ComputedModulation[] {
    const results: ComputedModulation[] = [];

    // 1. Calculate source values
    const sourceValues = new Map<string, number>();
    for (const [id, config] of this.sources.entries()) {
      if (!config.enabled) continue;

      let value = 0;
      if (config.type === "lfo") {
        value = evaluateLFO(config, timeInBars);
      } else if (config.type === "sequencer") {
        value = evaluateSequencer(config, timeInBars);
      } else if (config.type === "euclidean") {
        value = evaluateEuclidean(config, timeInBars);
      }

      sourceValues.set(id, value);
    }

    // 2. Map to targets
    for (const target of this.targets) {
      const val = sourceValues.get(target.sourceId);
      if (val === undefined) continue;

      const effective = val * target.amount;

      results.push({
        sourceId: target.sourceId,
        sourceValue: val,
        targetControlId: target.targetControlId,
        effectiveScalar: effective,
      });
    }

    return results;
  }
}
