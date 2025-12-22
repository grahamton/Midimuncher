import type {
  SequencerConfig,
  ModulationTarget,
  ControlElement,
} from "@midi-playground/core";
import { styles, palette } from "../styles";

export interface SequencerCardProps {
  config: SequencerConfig;
  targets: ModulationTarget[];
  availableControls: ControlElement[];
  onChange: (updates: Partial<SequencerConfig>) => void;
  onDelete: () => void;
  onAddTarget: (controlId: string) => void;
  onRemoveTarget: (controlId: string) => void;
  onUpdateTarget: (controlId: string, amount: number) => void;
}

export function SequencerCard({
  config,
  targets,
  availableControls,
  onChange,
  onDelete,
  onAddTarget,
  onRemoveTarget,
  onUpdateTarget,
}: SequencerCardProps) {
  function handleStepChange(idx: number, val: number) {
    const nextSteps = [...config.steps];
    nextSteps[idx] = val;
    onChange({ steps: nextSteps });
  }

  return (
    <div
      style={{
        ...styles.card,
        width: 450, // Wider for sequencer steps
        border: config.enabled
          ? `1px solid ${palette.tiAmber}`
          : `1px solid ${palette.tiBorder}`,
        boxShadow: config.enabled
          ? `0 0 10px ${palette.tiAmber}33`
          : styles.card.boxShadow,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            style={{ cursor: "pointer" }}
          />
          <input
            type="text"
            value={config.label}
            onChange={(e) => onChange({ label: e.target.value })}
            style={{
              background: "transparent",
              color: palette.tiAmber,
              border: "none",
              fontWeight: "bold",
              width: 150,
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          />
        </div>
        <button
          onClick={onDelete}
          style={{
            ...styles.btnTiny,
            color: "#ef4444",
            border: "none",
            fontSize: 18,
            padding: 0,
            background: "none",
          }}
        >
          ×
        </button>
      </div>

      {/* Step Grid */}
      <div style={{ marginBottom: 16 }}>
        <label style={styles.badgeTitle}>STEPS</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${config.steps.length}, 1fr)`,
            gap: 2,
            height: 80,
            background: "rgba(0,0,0,0.3)",
            padding: 4,
            borderRadius: 4,
            alignItems: "flex-end",
          }}
        >
          {config.steps.map((val, i) => (
            <div
              key={i}
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  height: `${val * 100}%`,
                  background: config.enabled ? palette.tiAmber : "#444",
                  width: "100%",
                  minHeight: 2,
                }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={val}
                onChange={(e) =>
                  handleStepChange(i, parseFloat(e.target.value))
                }
                style={{
                  position: "absolute",
                  width: 80,
                  transform: "rotate(-90deg) translate(35px, 0)",
                  transformOrigin: "center left",
                  opacity: 0,
                  cursor: "ns-resize",
                  zIndex: 2,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Row 1: Rate & Smooth */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>DIV</label>
          <select
            value={config.rate}
            onChange={(e) => onChange({ rate: parseFloat(e.target.value) })}
            style={styles.selectWide}
          >
            <option value={1}>1 Bar</option>
            <option value={0.5}>1/2</option>
            <option value={0.25}>1/4</option>
            <option value={0.125}>1/8</option>
            <option value={0.0625}>1/16</option>
            <option value={0.03125}>1/32</option>
          </select>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
          <label
            style={{
              ...styles.muted,
              fontSize: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              paddingBottom: 4,
            }}
          >
            <input
              type="checkbox"
              checked={config.smooth}
              onChange={(e) => onChange({ smooth: e.target.checked })}
            />
            SMOOTH
          </label>
        </div>
      </div>

      {/* Targets */}
      <div
        style={{
          borderTop: `1px solid ${palette.tiBorder}`,
          paddingTop: 8,
          marginTop: 4,
        }}
      >
        <label
          style={{ ...styles.badgeTitle, display: "block", marginBottom: 8 }}
        >
          ASSIGNMENTS
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {targets.map((t) => {
            const ctl = availableControls.find(
              (c) => c.id === t.targetControlId
            );
            return (
              <div
                key={t.targetControlId}
                style={{
                  ...styles.row,
                  fontSize: 12,
                  background: "rgba(0,0,0,0.2)",
                  padding: "4px 8px",
                  borderRadius: 4,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: palette.tiLcdBg,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                >
                  {ctl
                    ? (ctl.label || ctl.id).toUpperCase()
                    : t.targetControlId}
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={t.amount}
                  onChange={(e) =>
                    onUpdateTarget(
                      t.targetControlId,
                      parseFloat(e.target.value)
                    )
                  }
                  style={{ width: 60 }}
                />
                <button
                  onClick={() => onRemoveTarget(t.targetControlId)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 16,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          <select
            style={styles.selectWide}
            value=""
            onChange={(e) => {
              if (e.target.value) onAddTarget(e.target.value);
            }}
          >
            <option value="">+ ASSIGN TO...</option>
            {availableControls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label || c.id}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
