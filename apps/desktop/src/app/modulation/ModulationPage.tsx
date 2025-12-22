import {
  type ModulationEngineState,
  type LFOConfig,
  type SequencerConfig,
  type EuclideanConfig,
  type ModulationSource,
  type ControlElement,
} from "@midi-playground/core";
import { type DeviceConfig } from "../../../shared/projectTypes";
import { LFOCard } from "./LFOCard";
import { SequencerCard } from "./SequencerCard";
import { EuclideanCard } from "./EuclideanCard";
import { ModulationMorpher } from "./ModulationMorpher";
import { styles } from "../styles";

interface ModulationPageProps {
  state: ModulationEngineState;
  devices: DeviceConfig[];
  controls: ControlElement[];
  onChange: (next: ModulationEngineState) => void;
}

export function ModulationPage({
  state,
  devices,
  controls,
  onChange,
}: ModulationPageProps) {
  function handleAddLFO() {
    const newLFO: LFOConfig = {
      id: `lfo-${Date.now()}`,
      type: "lfo",
      label: `LFO ${state.sources.length + 1}`,
      enabled: true,
      shape: "sine",
      rate: 1, // 1 bar
      depth: 1,
      phase: 0,
      bias: 0,
      bipolar: true,
    };
    onChange({
      ...state,
      sources: [...state.sources, newLFO],
    });
  }

  function handleAddSequencer() {
    const newSeq: SequencerConfig = {
      id: `seq-${Date.now()}`,
      type: "sequencer",
      label: `SEQ ${state.sources.length + 1}`,
      enabled: true,
      steps: Array(16).fill(0.5),
      rate: 0.0625, // 1/16th
      smooth: false,
    };
    onChange({
      ...state,
      sources: [...state.sources, newSeq],
    });
  }

  function handleAddEuclidean() {
    const newEucl: EuclideanConfig = {
      id: `eucl-${Date.now()}`,
      type: "euclidean",
      label: `EUCL ${state.sources.length + 1}`,
      enabled: true,
      steps: 16,
      pulses: 7,
      rotate: 0,
      rate: 0.0625, // 1/16th
    };
    onChange({
      ...state,
      sources: [...state.sources, newEucl],
    });
  }

  function handleUpdateSource(id: string, updates: Partial<ModulationSource>) {
    const nextSources = state.sources.map((src) =>
      src.id === id ? { ...src, ...updates } : src
    ) as ModulationSource[];
    onChange({ ...state, sources: nextSources });
  }

  function handleDeleteSource(id: string) {
    onChange({
      ...state,
      sources: state.sources.filter((s) => s.id !== id),
      // Also cleanup targets for this source
      targets: state.targets.filter((t) => t.sourceId !== id),
    });
  }

  return (
    <div style={styles.content}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          borderBottom: styles.pageHeader.borderBottom,
          paddingBottom: 16,
        }}
      >
        <h2 style={styles.pageTitle}>Modulation Sources</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleAddLFO} style={styles.btnPrimary}>
            + ADD LFO
          </button>
          <button onClick={handleAddSequencer} style={styles.btnPrimary}>
            + ADD SEQ
          </button>
          <button onClick={handleAddEuclidean} style={styles.btnPrimary}>
            + ADD EUCL
          </button>
        </div>
      </div>

      <ModulationMorpher
        state={state}
        onChange={(u) => onChange({ ...state, ...u })}
      />

      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        {state.sources.map((src) => {
          const targets = state.targets.filter((t) => t.sourceId === src.id);

          const commonProps = {
            targets,
            availableControls: controls,
            onDelete: () => handleDeleteSource(src.id),
            onAddTarget: (controlId: string) => {
              if (targets.some((t) => t.targetControlId === controlId)) return;
              onChange({
                ...state,
                targets: [
                  ...state.targets,
                  { sourceId: src.id, targetControlId: controlId, amount: 1 },
                ],
              });
            },
            onRemoveTarget: (controlId: string) => {
              onChange({
                ...state,
                targets: state.targets.filter(
                  (t) =>
                    !(t.sourceId === src.id && t.targetControlId === controlId)
                ),
              });
            },
            onUpdateTarget: (controlId: string, amount: number) => {
              onChange({
                ...state,
                targets: state.targets.map((t) =>
                  t.sourceId === src.id && t.targetControlId === controlId
                    ? { ...t, amount }
                    : t
                ),
              });
            },
          };

          if (src.type === "lfo") {
            return (
              <LFOCard
                key={src.id}
                lfo={src as LFOConfig}
                {...commonProps}
                onChange={(u) => handleUpdateSource(src.id, u)}
              />
            );
          }

          if (src.type === "sequencer") {
            return (
              <SequencerCard
                key={src.id}
                config={src as SequencerConfig}
                {...commonProps}
                onChange={(u) => handleUpdateSource(src.id, u)}
              />
            );
          }

          if (src.type === "euclidean") {
            return (
              <EuclideanCard
                key={src.id}
                config={src as EuclideanConfig}
                {...commonProps}
                onChange={(u) => handleUpdateSource(src.id, u)}
              />
            );
          }

          return null;
        })}
        {state.sources.length === 0 && (
          <p style={styles.muted}>No modulation sources defined.</p>
        )}
      </div>
    </div>
  );
}
