import type { ControlElement } from "@midi-playground/core";
import { ControlLabPage } from "./ControlLabPage";
import { ControlCard, handleControlInput } from "./surface/ControlCard";

type SurfaceBoardPageProps = {
  controls: ControlElement[];
  onUpdateControl: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl: (control: ControlElement, rawValue: number) => void;
  hardwareState?: Record<string, { value: number; latched: boolean }>;
};

export function SurfaceBoardPage({
  controls,
  onUpdateControl,
  onEmitControl,
}: SurfaceBoardPageProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#38bdf8",
              letterSpacing: "0.1em",
              fontSize: 12,
            }}
          >
            PERFORMANCE SURFACES
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: "#e2e8f0",
            }}
          >
            Live controls
          </h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", maxWidth: 760 }}>
            Touch-friendly faders/knobs/pads backed by mapping slots. Drag to
            send live MIDI; bindings are shown below each control. Buttons
            toggle 0/127.
          </p>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 12, textAlign: "right" }}>
          <div>Shift = fine drag</div>
          <div>Bindings: CC/Note/PC per slot</div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {controls.map((control) => (
          <ControlCard
            key={control.id}
            control={control}
            onUpdate={(val01) =>
              handleControlInput(control, val01, onUpdateControl, onEmitControl)
            }
          />
        ))}
      </div>

      <section style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2 style={{ margin: 0, color: "#cbd5e1", fontSize: 16 }}>
            Labs / Examples
          </h2>
          <span style={{ color: "#94a3b8", fontSize: 12 }}>
            Macro rate-limit and multi-bind demos
          </span>
        </div>
        <ControlLabPage />
      </section>
    </div>
  );
}
