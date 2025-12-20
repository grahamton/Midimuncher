import { RotateCcw, RotateCw, TriangleAlert } from "lucide-react";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { createDefaultStageState, useStageStore } from "./stageStore";

type StagePageProps = {
  devices: DeviceConfig[];
  onPanic: () => void;
};

export function StagePage({ devices, onPanic }: StagePageProps) {
  const stage = useStageStore(createDefaultStageState());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 12,
          borderBottom: "1px solid #222"
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#38bdf8", letterSpacing: "0.12em", fontSize: 11 }}>STAGE</p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>Scenes & Macros</h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", maxWidth: 620 }}>
            Switch scenes and tweak macros with undo/redo safety net. Panic sends All Notes Off / All Sound Off to all rig
            outputs.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#b91c1c",
              border: "1px solid #dc2626",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600
            }}
            onClick={onPanic}
            title="Send All Notes Off + All Sound Off to all configured devices"
          >
            <TriangleAlert size={16} /> Panic
          </button>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: stage.canUndo ? "#1e293b" : "#111827",
              border: "1px solid #334155",
              color: stage.canUndo ? "#e2e8f0" : "#475569",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: stage.canUndo ? "pointer" : "not-allowed"
            }}
            disabled={!stage.canUndo}
            onClick={stage.undo}
            title="Undo last stage change"
          >
            <RotateCcw size={16} /> Undo
          </button>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: stage.canRedo ? "#1e293b" : "#111827",
              border: "1px solid #334155",
              color: stage.canRedo ? "#e2e8f0" : "#475569",
              padding: "8px 10px",
              borderRadius: 8,
              cursor: stage.canRedo ? "pointer" : "not-allowed"
            }}
            disabled={!stage.canRedo}
            onClick={stage.redo}
            title="Redo stage change"
          >
            <RotateCw size={16} /> Redo
          </button>
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: "#e2e8f0", fontSize: 16 }}>Scenes</h2>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>History: {stage.state.history.length}</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {stage.state.scenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => stage.selectScene(scene.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: stage.state.activeSceneId === scene.id ? "1px solid #38bdf8" : "1px solid #1f2937",
                  background: stage.state.activeSceneId === scene.id ? "#0ea5e910" : "#0f172a",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  minWidth: 120,
                  textAlign: "left"
                }}
              >
                <div style={{ fontWeight: 600 }}>{scene.name}</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Tap to arm scene</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, color: "#e2e8f0", fontSize: 16 }}>Macro tweaks</h2>
            <span style={{ color: "#94a3b8", fontSize: 12 }}>Redo stack: {stage.state.future.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {stage.state.macros.map((macro) => (
              <label key={macro.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: 13 }}>
                  <span>{macro.name}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{Math.round(macro.value * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={macro.value}
                  onChange={(e) => stage.setMacroValue(macro.id, Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "#0b1220", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
        <h3 style={{ margin: "0 0 8px", color: "#e2e8f0", fontSize: 15 }}>Rig targets</h3>
        <p style={{ margin: "0 0 12px", color: "#94a3b8", fontSize: 12 }}>
          Panic will ping each configured device output with All Notes Off and All Sound Off.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {devices.map((device) => (
            <div
              key={device.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: 10,
                background: "#0f172a",
                color: "#cbd5e1"
              }}
            >
              <div style={{ fontWeight: 600 }}>{device.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>
                Out: {device.outputId ?? "unassigned"} · Ch {device.channel}
              </div>
            </div>
          ))}
          {!devices.length && (
            <div style={{ color: "#94a3b8", fontSize: 12 }}>No devices configured yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
