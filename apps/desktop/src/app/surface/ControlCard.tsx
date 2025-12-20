import type { ControlElement } from "@midi-playground/core";
import { Crossfader, Fader, Knob, PadButton } from "@midi-playground/ui";

export type ControlCardProps = {
  control: ControlElement;
  onUpdate: (value01: number) => void;
};

export function ControlCard({ control, onUpdate }: ControlCardProps) {
  const value01 = control.value / 127;
  return (
    <div
      style={{
        background: "#0b1220",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{control.label}</div>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{control.type.toUpperCase()}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        {control.type === "fader" ? (
          <Fader value={value01} onChange={onUpdate} label="" color="#38bdf8" />
        ) : control.type === "knob" ? (
          <Knob value={value01} onChange={onUpdate} label="" color="#f472b6" />
        ) : (
          <PadButton label="Toggle" active={control.value > 0} onToggle={() => onUpdate(control.value > 0 ? 0 : 1)} />
        )}
      </div>
      <BindingList control={control} />
    </div>
  );
}

function BindingList({ control }: { control: ControlElement }) {
  const bindings = control.slots.filter((s) => s.enabled && s.kind !== "empty");
  if (!bindings.length) {
    return <span style={{ color: "#64748b", fontSize: 12 }}>No bindings</span>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {bindings.map((slot, idx) => {
        const targetLabel = slot.broadcast
          ? "Broadcast"
          : slot.targets?.length
            ? slot.targets.map((t) => t.deviceId).join(", ")
            : slot.targetDeviceId ?? "no target";
        if (slot.kind === "cc") {
          return (
            <BindingRow
              key={idx}
              label={`CC ${slot.cc}`}
              detail={`ch ${slot.channel ?? "dev"} / ${slot.min}-${slot.max} / ${slot.curve}`}
              target={targetLabel}
            />
          );
        }
        if (slot.kind === "pc") {
          return (
            <BindingRow
              key={idx}
              label="Program"
              detail={`ch ${slot.channel ?? "dev"} / ${slot.min}-${slot.max} / ${slot.curve}`}
              target={targetLabel}
            />
          );
        }
        if (slot.kind === "note") {
          return (
            <BindingRow
              key={idx}
              label={`Note ${slot.note}`}
              detail={`ch ${slot.channel ?? "dev"} / vel ${slot.vel}`}
              target={targetLabel}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function BindingRow({ label, detail, target }: { label: string; detail: string; target: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 8px",
        borderRadius: 8,
        background: "#0f172a",
        border: "1px solid #1f2937",
        color: "#e2e8f0",
        fontSize: 12
      }}
    >
      <span>{label}</span>
      <span style={{ color: "#94a3b8" }}>{detail} · {target ?? "no target"}</span>
    </div>
  );
}

export function handleControlInput(
  control: ControlElement,
  val01: number,
  onUpdateControl: (id: string, partial: Partial<ControlElement>) => void,
  onEmitControl: (control: ControlElement, rawValue: number) => void
) {
  const clamped = Math.min(Math.max(val01, 0), 1);
  const raw = Math.round(clamped * 127);
  onUpdateControl(control.id, { value: raw });
  onEmitControl({ ...control, value: raw }, raw);
}
