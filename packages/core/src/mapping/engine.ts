import type { MidiMsg } from "../midi/types";
import { applyCurve01, clamp01 } from "./curves";
import type { ControlElement, MappingSlot, MappingSlotTarget } from "./types";

export type MappingDeviceTarget = {
  id: string;
  outputId: string | null;
  channel: number;
};

export type MidiSend = {
  portId: string;
  msg: MidiMsg;
};

export type SlotTargetContext = {
  device: MappingDeviceTarget;
  target: MappingSlotTarget | null;
};

export function resolveSlotTargets(slot: MappingSlot, devices: MappingDeviceTarget[]): SlotTargetContext[] {
  if (slot.broadcast) {
    return devices.map((device) => ({ device, target: null }));
  }

  const explicitTargets = (slot.targets ?? []).map((t) => ({
    device: devices.find((d) => d.id === t.deviceId),
    target: t
  }));

  if (explicitTargets.some((t) => t.device)) {
    return explicitTargets.filter((t): t is { device: MappingDeviceTarget; target: MappingSlotTarget } => Boolean(t.device));
  }

  if (slot.targetDeviceId) {
    const device = devices.find((d) => d.id === slot.targetDeviceId);
    if (device) {
      return [{ device, target: null }];
    }
  }

  return [];
}

export function computeMappingSends(control: ControlElement, value: number, devices: MappingDeviceTarget[]): MidiSend[] {
  const value01 = clamp01(value / 127);
  const results: MidiSend[] = [];

  for (const slot of control.slots) {
    if (!slot.enabled) continue;
    if (slot.kind === "empty") continue;
    const slotTargets = resolveSlotTargets(slot, devices);
    if (!slotTargets.length) continue;

    for (const { device, target } of slotTargets) {
      if (!device.outputId) continue;
      const channel = clampChannel(target?.channel ?? slot.channel ?? device.channel);

      if (slot.kind === "cc") {
        const shaped01 = applyCurve01(value01, slot.curve);
        const min = clampMidi(slot.min);
        const max = clampMidi(slot.max);
        const mapped = Math.round(min + shaped01 * (max - min));
        const cc = clampMidi(target?.cc ?? slot.cc);
        results.push({
          portId: device.outputId,
          msg: { t: "cc", ch: channel, cc, val: clampMidi(mapped) }
        });
      } else if (slot.kind === "pc") {
        const shaped01 = applyCurve01(value01, slot.curve);
        const min = clampMidi(slot.min);
        const max = clampMidi(slot.max);
        const program = clampMidi(Math.round(min + shaped01 * (max - min)));
        results.push({
          portId: device.outputId,
          msg: { t: "programChange", ch: channel, program }
        });
      } else if (slot.kind === "note") {
        const note = clampMidi(slot.note);
        if (value <= 0) {
          results.push({
            portId: device.outputId,
            msg: { t: "noteOff", ch: channel, note, vel: 0 }
          });
        } else {
          results.push({
            portId: device.outputId,
            msg: { t: "noteOn", ch: channel, note, vel: clampMidi(slot.vel) }
          });
        }
      } else {
        assertNever(slot);
      }
    }
  }

  return results;
}

function clampChannel(ch: number | undefined) {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch as number), 1), 16);
}

function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

function assertNever(_slot: never): never {
  throw new Error("Unhandled mapping slot kind");
}

