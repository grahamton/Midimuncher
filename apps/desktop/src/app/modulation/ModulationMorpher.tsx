import React from "react";
import {
  type ModulationEngineState,
  type ModulationScene,
} from "@midi-playground/core";
import { styles, palette } from "../styles";

export interface ModulationMorpherProps {
  state: ModulationEngineState;
  onChange: (updates: Partial<ModulationEngineState>) => void;
}

export function ModulationMorpher({ state, onChange }: ModulationMorpherProps) {
  function handleCapture(sceneId: string | null) {
    if (!sceneId) {
      // Create new scene
      const newScene: ModulationScene = {
        id: `scene-${Date.now()}`,
        label: `SCENE ${state.scenes.length + 1}`,
        sources: JSON.parse(JSON.stringify(state.sources)), // Deep copy
      };
      onChange({
        scenes: [...state.scenes, newScene],
      });
    } else {
      // Update existing
      onChange({
        scenes: state.scenes.map((s) =>
          s.id === sceneId
            ? { ...s, sources: JSON.parse(JSON.stringify(state.sources)) }
            : s
        ),
      });
    }
  }

  const activeScene = state.scenes.find((s) => s.id === state.activeSceneId);
  const targetScene = state.scenes.find((s) => s.id === state.targetSceneId);

  return (
    <div
      style={{
        ...styles.card,
        width: "100%",
        marginBottom: 24,
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${palette.tiBorder}`,
        padding: "16px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        {/* Scene A Selector */}
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>SCENE A (BASE)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={state.activeSceneId || ""}
              onChange={(e) =>
                onChange({ activeSceneId: e.target.value || null })
              }
              style={styles.selectWide}
            >
              <option value="">(LIVE EDIT)</option>
              {state.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleCapture(state.activeSceneId)}
              style={styles.btnTiny}
              title="Capture current settings to this scene"
            >
              REC
            </button>
          </div>
        </div>

        {/* Morph Slider */}
        <div style={{ flex: 2, textAlign: "center" }}>
          <label style={styles.badgeTitle}>
            MORPH: {Math.round(state.morph * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={state.morph}
            onChange={(e) => onChange({ morph: parseFloat(e.target.value) })}
            style={{ width: "100%", marginTop: 8 }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: palette.tiAmber,
              marginTop: 4,
              fontFamily: "monospace",
            }}
          >
            <span>{activeScene?.label || "LIVE"}</span>
            <span>{targetScene?.label || "NONE"}</span>
          </div>
        </div>

        {/* Scene B Selector */}
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>SCENE B (TARGET)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={state.targetSceneId || ""}
              onChange={(e) =>
                onChange({ targetSceneId: e.target.value || null })
              }
              style={styles.selectWide}
            >
              <option value="">(NONE)</option>
              {state.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleCapture(state.targetSceneId)}
              style={styles.btnTiny}
              title="Capture current settings to this scene"
            >
              REC
            </button>
          </div>
        </div>

        {/* New Scene Button */}
        <button
          onClick={() => handleCapture(null)}
          style={{ ...styles.btnPrimary, whiteSpace: "nowrap" }}
        >
          + NEW SCENE
        </button>
      </div>
    </div>
  );
}
