import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeMappingSends } from "../../src/mapping/engine";
import type { ControlElement, MappingSlot } from "../../src/mapping/types";

function buildControl(slots: MappingSlot[]): ControlElement {
  return {
    id: "ctrl-1",
    label: "Test",
    type: "knob",
    value: 0,
    slots
  };
}

describe("computeMappingSends", () => {
  it("ignores slots without targets or when disabled", () => {
    const control = buildControl([
      { enabled: false, kind: "cc", cc: 10, min: 0, max: 127, curve: "linear", targetDeviceId: "dev-1" },
      { enabled: true, kind: "empty" },
      { enabled: true, kind: "note", note: 60, vel: 90, targetDeviceId: null }
    ]);

    const sends = computeMappingSends(control, 64, []);

    assert.deepStrictEqual(sends, []);
  });

  it("maps CC and program changes with clamping and curves", () => {
    const control = buildControl([
      { enabled: true, kind: "cc", cc: 130, min: 20, max: 50, curve: "expo", targetDeviceId: "dev-1" },
      { enabled: true, kind: "pc", min: 10, max: 20, curve: "log", targetDeviceId: "dev-1" }
    ]);

    const devices = [{ id: "dev-1", outputId: "port-1", channel: 3 }];

    const sends = computeMappingSends(control, 200, devices);

    assert.deepStrictEqual(sends, [
      {
        portId: "port-1",
        msg: { t: "cc", ch: 3, cc: 127, val: 50 }
      },
      {
        portId: "port-1",
        msg: { t: "programChange", ch: 3, program: 20 }
      }
    ]);
  });

  it("uses slot channels when provided and sends note on/off correctly", () => {
    const control = buildControl([
      { enabled: true, kind: "note", note: 200, vel: 200, channel: 32, targetDeviceId: "dev-2" }
    ]);

    const devices = [{ id: "dev-2", outputId: "port-2", channel: 10 }];

    assert.deepStrictEqual(computeMappingSends(control, 100, devices), [
      {
        portId: "port-2",
        msg: { t: "noteOn", ch: 16, note: 127, vel: 127 }
      }
    ]);

    assert.deepStrictEqual(computeMappingSends(control, 0, devices), [
      {
        portId: "port-2",
        msg: { t: "noteOff", ch: 16, note: 127, vel: 0 }
      }
    ]);
  });
});
