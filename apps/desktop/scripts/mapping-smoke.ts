import assert from "node:assert/strict";
import { computeMappingSends, defaultSlots } from "@midi-playground/core";
import type { ControlElement } from "@midi-playground/core";

async function main() {
  const devices = [{ id: "d1", outputId: "out-1", channel: 1 }];

  const slots = defaultSlots();
  slots[0] = { enabled: true, kind: "cc", cc: 74, min: 0, max: 127, curve: "linear", targetDeviceId: "d1" };
  slots[1] = { enabled: true, kind: "pc", min: 0, max: 10, curve: "linear", targetDeviceId: "d1" };
  slots[2] = { enabled: true, kind: "note", note: 60, vel: 100, targetDeviceId: "d1" };

  const control: ControlElement = { id: "knob-1", type: "knob", label: "Knob", value: 0, slots };

  const sends = computeMappingSends(control, 127, devices);
  assert.equal(sends.length, 3);
  assert.equal(sends[0].msg.t, "cc");
  assert.equal(sends[1].msg.t, "programChange");
  assert.equal(sends[2].msg.t, "noteOn");

  const sendsOff = computeMappingSends(control, 0, devices);
  assert.equal(sendsOff[2].msg.t, "noteOff");

  console.log("OK: mapping smoke test passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

