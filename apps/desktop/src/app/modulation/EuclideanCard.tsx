import React from "react";
import type {
  EuclideanConfig,
  ModulationTarget,
  ControlElement,
} from "@midi-playground/core";
import { generateEuclidean } from "@midi-playground/core";
import { styles, palette } from "../styles";

export interface EuclideanCardProps {
  config: EuclideanConfig;
  targets: ModulationTarget[];
  availableControls: ControlElement[];
  onChange: (updates: Partial<EuclideanConfig>) => void;
  onDelete: () => void;
  onAddTarget: (controlId: string) => void;
  onRemoveTarget: (controlId: string) => void;
  onUpdateTarget: (controlId: string, amount: number) => void;
}

export function EuclideanCard({
  config,
  targets,
  availableControls,
  onChange,
  onDelete,
  onAddTarget,
  onRemoveTarget,
  onUpdateTarget,
}: EuclideanCardProps) {
  const pattern = generateEuclidean(config.steps, config.pulses);

  return (
    <div
      style={{
        ...styles.card,
        width: 320,
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

      {/* Rhythmic Visualization */}
      <div
        style={{
          display: "flex",
          gap: 2,
          marginBottom: 16,
          height: 30,
          background: "rgba(0,0,0,0.3)",
          padding: 4,
          borderRadius: 4,
          alignItems: "center",
        }}
      >
        {pattern.map((isHit, i) => {
          const shiftedIdx = (i + (config.rotate || 0)) % config.steps;
          // Note: visualization shows the static pattern,
          // we should indicate rotation if we want to be fancy.
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: isHit ? "100%" : "20%",
                background: isHit
                  ? config.enabled
                    ? palette.tiAmber
                    : "#444"
                  : "rgba(255,255,255,0.05)",
                borderRadius: 1,
              }}
            />
          );
        })}
      </div>

      {/* Params */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.badgeTitle}>STEPS</label>
            <input
              type="number"
              min={1}
              max={32}
              value={config.steps}
              onChange={(e) =>
                onChange({ steps: parseInt(e.target.value) || 1 })
              }
              style={styles.selectWide}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.badgeTitle}>HITS</label>
            <input
              type="number"
              min={0}
              max={config.steps}
              value={config.pulses}
              onChange={(e) =>
                onChange({ pulses: parseInt(e.target.value) || 0 })
              }
              style={styles.selectWide}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.badgeTitle}>ROTATE</label>
            <input
              type="number"
              value={config.rotate}
              onChange={(e) =>
                onChange({ rotate: parseInt(e.target.value) || 0 })
              }
              style={styles.selectWide}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.badgeTitle}>RATE</label>
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
            </select>
          </div>
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
