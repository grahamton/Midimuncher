export type Curve = "linear" | "expo" | "log";

export type MappingSlotTarget = {
  deviceId: string;
  channel?: number;
  cc?: number;
};

type MappingSlotBase = {
  enabled: boolean;
  broadcast?: boolean;
  targets?: MappingSlotTarget[];
  targetDeviceId?: string | null;
};

export type MappingSlot =
  | (MappingSlotBase & {
      kind: "cc";
      cc: number;
      channel?: number;
      min: number;
      max: number;
      curve: Curve;
    })
  | (MappingSlotBase & {
      kind: "pc";
      channel?: number;
      min: number;
      max: number;
      curve: Curve;
    })
  | (MappingSlotBase & {
      kind: "note";
      note: number;
      channel?: number;
      vel: number;
    })
  | (MappingSlotBase & {
      kind: "empty";
    });

export type ControlElementType = "knob" | "fader" | "button";

export type ControlElement = {
  id: string;
  type: ControlElementType;
  label: string;
  value: number; // 0..127
  slots: MappingSlot[]; // length 8
};

export function defaultSlots(): MappingSlot[] {
  return Array.from({ length: 8 }, () => ({
    enabled: false,
    kind: "empty",
    targets: [],
    broadcast: false,
    targetDeviceId: null
  } as const));
}
