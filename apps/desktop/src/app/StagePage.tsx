import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  addScene,
  exportActiveRig,
  importRigFromFile,
  removeInstrumentPreset,
  removeScene,
  resetStageSlice,
  setActiveRig,
  setMacro,
  upsertInstrumentPreset,
  updateScene
} from "../store/stageSlice";
import { defaultStageRigState, type StageRigExport, type StageState } from "../../shared/stageTypes";

const macroLabels = ["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"];

export function StagePage({ stage, onChange }: { stage: StageState; onChange: (next: StageState) => void }) {
  const rig = stage.rigs[stage.activeRigId] ?? defaultStageRigState();
  const [newRigId, setNewRigId] = useState("");
  const [newSceneName, setNewSceneName] = useState("New Scene");
  const [newPresetInstrument, setNewPresetInstrument] = useState("synth-1");
  const [newPresetName, setNewPresetName] = useState("Lead");
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const macroValues = useMemo(() => {
    return macroLabels.map((id) => ({ id, value: rig.macros[id] ?? 0 }));
  }, [rig.macros]);

  function handleExport() {
    const payload = exportActiveRig(stage);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.rigId || "stage"}-preset.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Exported rig "${payload.rigId}" to download.`);
  }

  async function handleImport(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StageRigExport;
      onChange(importRigFromFile(stage, parsed));
      setStatus(`Imported rig "${parsed.rigId || "default"}".`);
    } catch (err) {
      console.error("Failed to import stage preset", err);
      setStatus("Import failed: invalid file");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handleAddPreset() {
    if (!newPresetInstrument.trim()) return;
    onChange(
      upsertInstrumentPreset(stage, {
        instrumentId: newPresetInstrument.trim(),
        name: newPresetName.trim() || "Preset",
        values: { macro: 64 }
      })
    );
    setStatus(`Preset saved for ${newPresetInstrument.trim()}`);
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <div style={styles.muted}>Active rig</div>
          <div style={styles.row}>
            <select
              value={stage.activeRigId}
              onChange={(e) => onChange(setActiveRig(stage, e.target.value))}
              style={styles.select}
            >
              {Object.keys(stage.rigs).map((rigId) => (
                <option key={rigId}>{rigId}</option>
              ))}
            </select>
            <input
              style={styles.input}
              value={newRigId}
              placeholder="New rig id"
              onChange={(e) => setNewRigId(e.target.value)}
            />
            <button style={styles.button} onClick={() => onChange(setActiveRig(stage, newRigId || "default"))}>
              Set Rig
            </button>
            <button style={styles.secondary} onClick={() => onChange(resetStageSlice())}>
              Reset Stage
            </button>
          </div>
        </div>
        <div style={styles.row}>
          <button style={styles.secondary} onClick={() => fileRef.current?.click()}>
            Import preset
          </button>
          <button style={styles.button} onClick={handleExport}>
            Export preset
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileRef}
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
            }}
          />
        </div>
      </div>

      {status && <div style={styles.status}>{status}</div>}

      <div style={styles.grid}>
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Scenes</h3>
            <div style={styles.row}>
              <input
                style={styles.input}
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
              />
              <button style={styles.button} onClick={() => onChange(addScene(stage, newSceneName))}>
                Add
              </button>
            </div>
          </div>
          <div>
            {rig.scenes.length === 0 && <div style={styles.muted}>No scenes yet.</div>}
            {rig.scenes.map((scene) => (
              <div key={scene.id} style={styles.listRow}>
                <input
                  style={styles.input}
                  value={scene.name}
                  onChange={(e) => onChange(updateScene(stage, scene.id, { name: e.target.value }))}
                />
                <button style={styles.secondary} onClick={() => onChange(removeScene(stage, scene.id))}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <h3 style={styles.panelTitle}>Macros</h3>
          </div>
          <div>
            {macroValues.map((macro) => (
              <div key={macro.id} style={styles.macroRow}>
                <span style={styles.muted}>{macro.id}</span>
                <input
                  type="range"
                  min={0}
                  max={127}
                  value={macro.value}
                  onChange={(e) => onChange(setMacro(stage, macro.id, Number(e.target.value)))}
                  style={{ flex: 1 }}
                />
                <span style={styles.valueLabel}>{macro.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <h3 style={styles.panelTitle}>Instrument presets</h3>
          <div style={styles.row}>
            <input
              style={styles.input}
              value={newPresetInstrument}
              onChange={(e) => setNewPresetInstrument(e.target.value)}
              placeholder="Instrument id"
            />
            <input
              style={styles.input}
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name"
            />
            <button style={styles.button} onClick={handleAddPreset}>
              Save preset
            </button>
          </div>
        </div>
        <div>
          {Object.values(rig.instrumentPresets).length === 0 && <div style={styles.muted}>No presets captured.</div>}
          {Object.values(rig.instrumentPresets).map((preset) => (
            <div key={preset.instrumentId} style={styles.listRow}>
              <div>
                <strong>{preset.instrumentId}</strong>
                <div style={styles.muted}>{preset.name}</div>
              </div>
              <button style={styles.secondary} onClick={() => onChange(removeInstrumentPreset(stage, preset.instrumentId))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 16 },
  headerRow: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-end" },
  row: { display: "flex", alignItems: "center", gap: 8 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  panel: { background: "#111827", padding: 12, borderRadius: 8, border: "1px solid #1f2937" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 500 },
  input: {
    background: "#0b1323",
    border: "1px solid #1f2937",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#e5e7eb",
    minWidth: 140
  },
  select: {
    background: "#0b1323",
    border: "1px solid #1f2937",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#e5e7eb"
  },
  button: {
    background: "#0ea5e9",
    border: "none",
    color: "#0b1021",
    borderRadius: 6,
    padding: "8px 12px",
    fontWeight: 600,
    cursor: "pointer"
  },
  secondary: {
    background: "#1f2937",
    border: "1px solid #27324a",
    color: "#e5e7eb",
    borderRadius: 6,
    padding: "8px 12px",
    cursor: "pointer"
  },
  muted: { color: "#9ca3af", fontSize: 12 },
  status: {
    background: "#0b1323",
    border: "1px solid #1f2937",
    color: "#c7d2fe",
    padding: 10,
    borderRadius: 8
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: "8px 0",
    borderBottom: "1px solid #1f2937"
  },
  macroRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0" },
  valueLabel: { width: 28, textAlign: "right", color: "#e5e7eb" }
};
