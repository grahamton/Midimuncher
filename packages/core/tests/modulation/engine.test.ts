import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModulationEngine } from "../../src/modulation/engine";
import type { LFOConfig, ModulationTarget } from "../../src/modulation/types";

describe("ModulationEngine", () => {
  it("computes modulations for active sources", () => {
    const engine = new ModulationEngine();

    const lfo1: LFOConfig = {
      id: "lfo-1",
      type: "lfo",
      enabled: true,
      label: "LFO 1",
      shape: "square", // 1 or -1
      rate: 1,
      depth: 1,
      phase: 0,
      bias: 0,
      bipolar: true,
    };

    const target1: ModulationTarget = {
      sourceId: "lfo-1",
      targetControlId: "knob-1",
      amount: 0.5,
    };

    engine.setState({
      sources: [lfo1],
      targets: [target1],
      scenes: [],
      activeSceneId: null,
      targetSceneId: null,
      morph: 0,
    });

    // t=0 -> Square LFO is 1. Amount is 0.5. Result should be 0.5.
    const results = engine.tick(0);

    assert.equal(results.length, 1);
    assert.equal(results[0].sourceId, "lfo-1");
    assert.equal(results[0].targetControlId, "knob-1");
    assert.equal(results[0].sourceValue, 1);
    assert.equal(results[0].effectiveScalar, 0.5);
  });

  it("ignores disabled sources", () => {
    const engine = new ModulationEngine();
    const lfo1: LFOConfig = {
      id: "lfo-1",
      type: "lfo",
      enabled: false,
      label: "LFO 1",
      shape: "sine",
      rate: 1,
      depth: 1,
      phase: 0,
      bias: 0,
      bipolar: true,
    };
    const target1: ModulationTarget = {
      sourceId: "lfo-1",
      targetControlId: "knob-1",
      amount: 1,
    };

    engine.setState({
      sources: [lfo1],
      targets: [target1],
      scenes: [],
      activeSceneId: null,
      targetSceneId: null,
      morph: 0,
    });
    const results = engine.tick(0);

    // Should be empty or filtered?
    // Current implementation: sourceValue loop checks enabled.
    // If enabled=false, map doesn't have it. target loop won't find it.
    assert.deepEqual(results, []);
  });

  it("handles euclidean sources", () => {
    const engine = new ModulationEngine();
    engine.setState({
      sources: [
        {
          id: "eucl-1",
          type: "euclidean",
          enabled: true,
          label: "EUCL",
          steps: 4,
          pulses: 1,
          rotate: 0,
          rate: 1,
        },
      ],
      targets: [{ sourceId: "eucl-1", targetControlId: "knob-1", amount: 1 }],
      scenes: [],
      activeSceneId: null,
      targetSceneId: null,
      morph: 0,
    });

    // Bjorklund for 4 steps, 1 pulse is [true, false, false, false]
    assert.equal(engine.tick(0)[0].sourceValue, 1);
    assert.equal(engine.tick(1)[0].sourceValue, 0);
  });
});
