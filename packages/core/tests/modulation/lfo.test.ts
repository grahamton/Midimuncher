import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateLFO } from "../../src/modulation/lfo";
import type { LFOConfig } from "../../src/modulation/types";

function mockLFO(
  shape: LFOConfig["shape"],
  depth = 1,
  phase = 0,
  bipolar = true
): LFOConfig {
  return {
    id: "test",
    type: "lfo",
    enabled: true,
    label: "Test",
    shape,
    rate: 1, // 1 bar cycle
    depth,
    phase,
    bias: 0,
    bipolar,
  };
}

describe("evaluateLFO", () => {
  it("generates correct values for Sine", () => {
    const lfo = mockLFO("sine");

    // t=0 (0) -> sin(0) = 0
    assert.ok(Math.abs(evaluateLFO(lfo, 0)) < 0.001);

    // t=0.25 (1/4 bar, 90 deg) -> sin(PI/2) = 1
    assert.ok(Math.abs(evaluateLFO(lfo, 0.25) - 1) < 0.001);

    // t=0.75 (3/4 bar, 270 deg) -> sin(3PI/2) = -1
    assert.ok(Math.abs(evaluateLFO(lfo, 0.75) - -1) < 0.001);
  });

  it("handles Bipolar vs Unipolar", () => {
    const bipolar = mockLFO("sine", 1, 0, true);
    assert.ok(Math.abs(evaluateLFO(bipolar, 0.25) - 1) < 0.001); // Peak 1

    const unipolar = mockLFO("sine", 1, 0, false);
    // Unipolar mapped -1..1 -> 0..1
    // 0 -> 0.5
    // 1 -> 1
    // -1 -> 0
    assert.ok(Math.abs(evaluateLFO(unipolar, 0) - 0.5) < 0.001);
    assert.ok(Math.abs(evaluateLFO(unipolar, 0.25) - 1) < 0.001);
    assert.ok(Math.abs(evaluateLFO(unipolar, 0.75) - 0) < 0.001);
  });

  it("generates correct values for Saw (Ramp Up)", () => {
    const lfo = mockLFO("saw");

    // t=0 -> -1
    assert.ok(Math.abs(evaluateLFO(lfo, 0) - -1) < 0.001);

    // t=0.5 -> 0
    assert.ok(Math.abs(evaluateLFO(lfo, 0.5) - 0) < 0.001);

    // t=0.99 -> approx 1
    assert.ok(evaluateLFO(lfo, 0.99) > 0.9);
  });

  it("generates correct values for Square", () => {
    const lfo = mockLFO("square");

    // First half -> 1
    assert.equal(evaluateLFO(lfo, 0), 1);
    assert.equal(evaluateLFO(lfo, 0.4), 1);

    // Second half -> -1
    assert.equal(evaluateLFO(lfo, 0.5), -1);
    assert.equal(evaluateLFO(lfo, 0.9), -1);
  });

  it("applies phase offset", () => {
    // Sine + 0.25 phase (90 deg) = Cosine starts at 1
    const lfo = mockLFO("sine", 1, 0.25);

    // t=0 -> effectively t=0.25 -> 1
    assert.ok(Math.abs(evaluateLFO(lfo, 0) - 1) < 0.001);
  });
});
