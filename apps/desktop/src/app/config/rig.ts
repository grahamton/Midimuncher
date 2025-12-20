import { defaultSlots, type ControlElement, type Curve, type MappingSlot } from "@midi-playground/core";
import type { RouteConfig } from "../../../shared/ipcTypes";
import type { DeviceConfig } from "../../../shared/projectTypes";

type RigDeviceDefinition = {
  id: string;
  name: string;
  instrumentId: string;
  channel: number;
  clockEnabled?: boolean;
};

type RigRouteDefinition = {
  id: string;
  fromLabel: string;
  toDeviceId: string;
};

type RigControlDefinition = {
  id: string;
  label: string;
  type: ControlElement["type"];
  color?: string;
  slot: { cc: number; deviceId: string; channel: number; min?: number; max?: number; curve?: Curve };
};

const RIG_DEVICES: RigDeviceDefinition[] = [
  { id: "rig-monologue", name: "Monologue", instrumentId: "monologue", channel: 2 },
  { id: "rig-microfreak", name: "MicroFreak", instrumentId: "microfreak", channel: 1 },
  { id: "rig-pro-vs-mini", name: "PRO VS MINI", instrumentId: "pro_vs_mini", channel: 3 },
  { id: "rig-digitakt", name: "Digitakt", instrumentId: "digitakt", channel: 10, clockEnabled: true }
];

export const RIG_ROUTES: RigRouteDefinition[] = [
  { id: "rig-route-lane-1", fromLabel: "OXI Lane 1", toDeviceId: "rig-monologue" },
  { id: "rig-route-lane-2", fromLabel: "OXI Lane 2", toDeviceId: "rig-microfreak" },
  { id: "rig-route-lane-3", fromLabel: "OXI Lane 3", toDeviceId: "rig-pro-vs-mini" },
  { id: "rig-route-lane-4", fromLabel: "OXI Lane 4", toDeviceId: "rig-digitakt" }
];

const RIG_CONTROLS: RigControlDefinition[] = [
  {
    id: "knob-monologue",
    label: "Lane 1 Filter",
    type: "knob",
    slot: { cc: 43, deviceId: "rig-monologue", channel: 2, min: 0, max: 120 }
  },
  {
    id: "knob-microfreak",
    label: "Lane 2 Filter",
    type: "knob",
    slot: { cc: 23, deviceId: "rig-microfreak", channel: 1 }
  },
  {
    id: "knob-pro-vs-mini",
    label: "Lane 3 Filter",
    type: "knob",
    slot: { cc: 74, deviceId: "rig-pro-vs-mini", channel: 3, min: 10, max: 127 }
  },
  {
    id: "knob-digitakt",
    label: "Lane 4 Filter",
    type: "knob",
    slot: { cc: 74, deviceId: "rig-digitakt", channel: 10, min: 0, max: 110, curve: "expo" }
  },
  {
    id: "fader-digitakt",
    label: "Digitakt FX Send",
    type: "fader",
    slot: { cc: 83, deviceId: "rig-digitakt", channel: 10, min: 0, max: 100 }
  },
  {
    id: "button-digitakt",
    label: "Digitakt Sample Punch",
    type: "button",
    slot: { cc: 95, deviceId: "rig-digitakt", channel: 10, min: 0, max: 127 }
  }
];

function clampChannel(ch: number): number {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch), 1), 16);
}

function cloneSlots(slots: MappingSlot[]): MappingSlot[] {
  return slots.map((slot) => ({ ...slot }));
}

export function buildRigDevices(): DeviceConfig[] {
  return RIG_DEVICES.map((device) => ({
    ...device,
    inputId: null,
    outputId: null,
    clockEnabled: Boolean(device.clockEnabled)
  }));
}

export function buildRigRoutes(): RouteConfig[] {
  const devices = buildRigDevices();
  return RIG_ROUTES.map((route) => {
    const target = devices.find((d) => d.id === route.toDeviceId);
    const forceChannel = clampChannel(target?.channel ?? 1);
    return {
      id: route.id,
      fromId: "",
      toId: "",
      channelMode: "force",
      forceChannel,
      filter: { allowTypes: ["noteOn", "noteOff", "cc", "pitchBend", "aftertouch", "clock", "start", "stop", "continue"] }
    } satisfies RouteConfig;
  });
}

export function buildRigControls(): ControlElement[] {
  return RIG_CONTROLS.map((control) => {
    const slots = defaultSlots();
    slots[0] = {
      enabled: true,
      kind: "cc",
      cc: control.slot.cc,
      min: control.slot.min ?? 0,
      max: control.slot.max ?? 127,
      curve: control.slot.curve ?? "linear",
      targetDeviceId: control.slot.deviceId,
      channel: clampChannel(control.slot.channel)
    };
    return {
      id: control.id,
      type: control.type,
      label: control.label,
      value: 0,
      slots: cloneSlots(slots)
    } satisfies ControlElement;
  });
}

export function rigRouteLabels(devices: DeviceConfig[]): string[] {
  return RIG_ROUTES.map((route) => {
    const device = devices.find((d) => d.id === route.toDeviceId);
    const deviceLabel = device?.name ?? route.toDeviceId;
    const channel = device?.channel ?? RIG_DEVICES.find((d) => d.id === route.toDeviceId)?.channel ?? 1;
    return `${route.fromLabel} → ${deviceLabel} (ch ${channel})`;
  });
}
