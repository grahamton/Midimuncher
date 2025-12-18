export type Curve = "linear" | "expo" | "log";

export type MappingSlot =
  | {
      enabled: boolean;
      kind: "cc";
      cc: number;
      channel?: number;
      min: number;
      max: number;
      curve: Curve;
      targetDeviceId: string | null;
    }
  | {
      enabled: boolean;
      kind: "pc";
      channel?: number;
      min: number;
      max: number;
      curve: Curve;
      targetDeviceId: string | null;
    }
  | {
      enabled: boolean;
      kind: "note";
      note: number;
      channel?: number;
      vel: number;
      targetDeviceId: string | null;
    }
  | {
      enabled: boolean;
      kind: "empty";
    };

export type ControlElementType = "knob" | "fader" | "button";

export type ControlElement = {
  id: string;
  type: ControlElementType;
  label: string;
  value: number; // 0..127
  slots: MappingSlot[]; // length 8
};

export function defaultSlots(): MappingSlot[] {
  return Array.from({ length: 8 }, () => ({ enabled: false, kind: "empty" } as const));
}
