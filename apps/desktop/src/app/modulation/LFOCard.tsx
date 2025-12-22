import type {
  LFOConfig,
  ModulationTarget,
  ControlElement,
} from "@midi-playground/core";
import { styles, palette } from "../styles";

export interface LFOCardProps {
  lfo: LFOConfig;
  targets: ModulationTarget[];
  availableControls: ControlElement[];
  onChange: (updates: Partial<LFOConfig>) => void;
  onDelete: () => void;
  onAddTarget: (controlId: string) => void;
  onRemoveTarget: (controlId: string) => void;
  onUpdateTarget: (controlId: string, amount: number) => void;
}

export function LFOCard({
  lfo,
  targets,
  availableControls,
  onChange,
  onDelete,
  onAddTarget,
  onRemoveTarget,
  onUpdateTarget,
}: LFOCardProps) {
  return (
    <div
      style={{
        ...styles.card,
        width: 300,
        border: lfo.enabled
          ? `1px solid ${palette.tiAmber}`
          : `1px solid ${palette.tiBorder}`,
        boxShadow: lfo.enabled
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
            checked={lfo.enabled}
            onChange={(e) => onChange({ enabled: e.target.checked })}
            style={{ cursor: "pointer" }}
          />
          <input
            type="text"
            value={lfo.label}
            onChange={(e) => onChange({ label: e.target.value })}
            style={{
              background: "transparent",
              color: palette.tiAmber,
              border: "none",
              fontWeight: "bold",
              width: 120,
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

      {/* Row 1: Shape & Rate */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>SHAPE</label>
          <select
            value={lfo.shape}
            onChange={(e) => onChange({ shape: e.target.value as any })}
            style={styles.selectWide}
          >
            <option value="sine">Sine</option>
            <option value="triangle">Triangle</option>
            <option value="saw">Saw</option>
            <option value="square">Square</option>
            <option value="random">Random</option>
            <option value="noise">Noise</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>RATE</label>
          <select
            value={lfo.rate}
            onChange={(e) => onChange({ rate: parseFloat(e.target.value) })}
            style={styles.selectWide}
          >
            <option value={4}>4 Bars</option>
            <option value={2}>2 Bars</option>
            <option value={1}>1 Bar</option>
            <option value={0.5}>1/2</option>
            <option value={0.25}>1/4</option>
            <option value={0.125}>1/8</option>
            <option value={0.0625}>1/16</option>
          </select>
        </div>
      </div>

      {/* Row 2: Depth & Phase */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>DEPTH</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={lfo.depth}
              onChange={(e) => onChange({ depth: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontSize: 10,
                color: palette.tiLcdBg,
                fontFamily: "monospace",
                width: 25,
              }}
            >
              {Math.round(lfo.depth * 100)}
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.badgeTitle}>PHASE</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={lfo.phase}
              onChange={(e) => onChange({ phase: parseFloat(e.target.value) })}
              style={{ flex: 1 }}
            />
            <span
              style={{
                fontSize: 10,
                color: palette.tiLcdBg,
                fontFamily: "monospace",
                width: 25,
              }}
            >
              {Math.round(lfo.phase * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* Row 3: Bipolar */}
      <div>
        <label
          style={{
            ...styles.muted,
            color: "#ccc",
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={lfo.bipolar}
            onChange={(e) => onChange({ bipolar: e.target.checked })}
          />
          BIPOLAR (-1 TO 1)
        </label>
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
