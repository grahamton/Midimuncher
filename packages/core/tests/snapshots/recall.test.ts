import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planSnapshotRecall } from "../../src/snapshots/recall";
import type { SnapshotRecallOptions, SnapshotState } from "../../src/snapshots/types";

function makeSnapshot(overrides: Partial<SnapshotState>): SnapshotState {
  return {
    capturedAt: 0,
    bpm: null,
    notes: null,
    devices: [],
    ...overrides
  };
}

describe("planSnapshotRecall", () => {
  it("applies burst limiting deterministically", () => {
    const target = makeSnapshot({
      devices: [
        {
          deviceId: "dev-1",
          outputId: "out-1",
          channel: 1,
          cc: { 1: 10, 2: 20, 3: 30 },
          notes: []
        }
      ]
    });

    const options: SnapshotRecallOptions = {
      strategy: "jump",
      burst: { intervalMs: 6, maxPerInterval: 1 }
    };

    const sends = planSnapshotRecall(target, options);
    const delays = sends.map((s) => s.delayMs);

    assert.equal(sends.length, 3);
    assert.deepStrictEqual(delays, [0, 6, 12]);
  });

  it("interpolates CC values when fading", () => {
    const from = makeSnapshot({
      devices: [
        {
          deviceId: "dev-1",
          outputId: "out-1",
          channel: 1,
          cc: { 74: 0 },
          notes: []
        }
      ]
    });
    const target = makeSnapshot({
      devices: [
        {
          deviceId: "dev-1",
          outputId: "out-1",
          channel: 1,
          cc: { 74: 127 },
          notes: []
        }
      ]
    });

    const options: SnapshotRecallOptions = {
      from,
      strategy: "jump",
      fadeMs: 80
    };

    const sends = planSnapshotRecall(target, options);
    assert.deepStrictEqual(
      sends.map((s) => ({ delayMs: s.delayMs, msg: s.msg })),
      [
        { delayMs: 40, msg: { t: "cc", ch: 1, cc: 74, val: 64 } },
        { delayMs: 80, msg: { t: "cc", ch: 1, cc: 74, val: 127 } }
      ]
    );
  });

  it("turns off previous notes that are no longer active", () => {
    const from = makeSnapshot({
      devices: [
        {
          deviceId: "dev-1",
          outputId: "out-1",
          channel: 2,
          cc: {},
          notes: [{ note: 60, vel: 100 }]
        }
      ]
    });
    const target = makeSnapshot({
      devices: [
        {
          deviceId: "dev-1",
          outputId: "out-1",
          channel: 2,
          cc: {},
          notes: []
        }
      ]
    });

    const options: SnapshotRecallOptions = { from, strategy: "jump" };
    const sends = planSnapshotRecall(target, options);

    assert.deepStrictEqual(sends, [
      {
        portId: "out-1",
        delayMs: 0,
        msg: { t: "noteOff", ch: 2, note: 60, vel: 0 }
      }
    ]);
  });
});

