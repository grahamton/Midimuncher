import { useEffect, useMemo, useState } from "react";
import type { Curve, MappingSlot } from "@midi-playground/core";
import type { DeviceConfig } from "../../../shared/projectTypes";

const baseStyles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50
  },
  dialog: {
    width: "640px",
    maxWidth: "95vw",
    backgroundColor: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "10px",
    padding: "18px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
    color: "#e2e8f0"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "10px"
  },
  muted: {
    color: "#94a3b8",
    fontSize: "12px"
  },
  pill: {
    padding: "2px 8px",
    borderRadius: "999px",
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    fontSize: "12px"
  },
  input: {
    backgroundColor: "#0b1220",
    border: "1px solid #1f2937",
    borderRadius: "6px",
    padding: "6px 8px",
    color: "#e2e8f0",
    width: "80px"
  },
  select: {
    backgroundColor: "#0b1220",
    border: "1px solid #1f2937",
    borderRadius: "6px",
    padding: "6px 8px",
    color: "#e2e8f0"
  },
  btnPrimary: {
    backgroundColor: "#0ea5e9",
    border: "1px solid #0284c7",
    color: "#0b1220",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600
  },
  btnSecondary: {
    backgroundColor: "#111827",
    border: "1px solid #1f2937",
    color: "#e5e7eb",
    padding: "8px 12px",
    borderRadius: "8px",
    cursor: "pointer"
  }
};

type MacroTargetEditorProps = {
  open: boolean;
  slots: MappingSlot[];
  devices: DeviceConfig[];
  onClose: () => void;
  onApply: (slots: MappingSlot[]) => void;
};

function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

export function MacroTargetEditor({ open, slots, devices, onClose, onApply }: MacroTargetEditorProps) {
  const [drafts, setDrafts] = useState<MappingSlot[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts(slots.map((slot) => ({ ...slot })));
    }
  }, [open, slots]);

  const targetNames = useMemo(() => {
    const map = new Map<string, string>();
    devices.forEach((d) => map.set(d.id, d.name || d.id));
    return map;
  }, [devices]);

  if (!open) return null;

  const applyChanges = () => {
    onApply(drafts);
    onClose();
  };

  const updateDraft = (index: number, mutate: (slot: MappingSlot) => MappingSlot) => {
    setDrafts((current) => current.map((slot, idx) => (idx === index ? mutate(slot) : slot)));
  };

  return (
    <div style={baseStyles.overlay}>
      <div style={baseStyles.dialog}>
        <div style={{ ...baseStyles.row, justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Macro target editor</h3>
          <button style={baseStyles.btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>
        <p style={{ ...baseStyles.muted, marginTop: 0, marginBottom: 12 }}>
          Adjust scaling, curves, and routing for each macro target in one place.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
          {drafts.map((slot, idx) => {
            const disabled = slot.kind !== "cc";
            const ccSlot = slot.kind === "cc" || slot.kind === "pc" ? slot : null;
            const resolvedCurve = ccSlot?.curve ?? "linear";
            const resolvedMin = ccSlot?.min ?? 0;
            const resolvedMax = ccSlot?.max ?? 127;
            const resolvedTarget = slot.kind === "empty" ? "" : slot.targetDeviceId ?? "";
            const resolvedChannel = slot.kind === "empty" ? 1 : slot.channel ?? 1;
            return (
              <div
                key={idx}
                style={{
                  ...baseStyles.row,
                  justifyContent: "space-between",
                  padding: "10px",
                  borderRadius: 8,
                  border: "1px solid #1f2937",
                  backgroundColor: disabled ? "#0b1220" : "#111827",
                  opacity: disabled ? 0.65 : 1
                }}
              >
                <div style={{ ...baseStyles.row, flex: 1 }}>
                  <span style={baseStyles.pill}>S{idx + 1}</span>
                  <span style={baseStyles.muted}>{disabled ? "Not a CC slot" : "CC target"}</span>
                </div>
                <div style={{ ...baseStyles.row, flex: 3, justifyContent: "flex-end" }}>
                  <select
                    style={baseStyles.select}
                    value={resolvedCurve}
                    disabled={disabled}
                    onChange={(e) =>
                      updateDraft(idx, (s) =>
                        s.kind === "cc" || s.kind === "pc" ? { ...s, curve: e.target.value as Curve } : s
                      )
                    }
                  >
                    <option value="linear">Linear</option>
                    <option value="expo">Expo</option>
                    <option value="log">Log</option>
                  </select>
                  <input
                    style={baseStyles.input}
                    type="number"
                    min={0}
                    max={127}
                    disabled={disabled}
                    value={resolvedMin}
                    onChange={(e) =>
                      updateDraft(idx, (s) =>
                        s.kind === "cc" || s.kind === "pc"
                          ? { ...s, min: clampMidi(Number(e.target.value) || 0) }
                          : s
                      )
                    }
                  />
                  <input
                    style={baseStyles.input}
                    type="number"
                    min={0}
                    max={127}
                    disabled={disabled}
                    value={resolvedMax}
                    onChange={(e) =>
                      updateDraft(idx, (s) =>
                        s.kind === "cc" || s.kind === "pc"
                          ? { ...s, max: clampMidi(Number(e.target.value) || 0) }
                          : s
                      )
                    }
                  />
                  <select
                    style={baseStyles.select}
                    disabled={disabled}
                    value={resolvedTarget}
                    onChange={(e) =>
                      updateDraft(idx, (s) =>
                        s.kind === "empty"
                          ? s
                          : { ...s, targetDeviceId: e.target.value === "" ? null : e.target.value }
                      )
                    }
                  >
                    <option value="">No target</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.id}
                      </option>
                    ))}
                  </select>
                  <input
                    style={{ ...baseStyles.input, width: "70px" }}
                    type="number"
                    min={1}
                    max={16}
                    disabled={disabled}
                    value={resolvedChannel}
                    onChange={(e) =>
                      updateDraft(idx, (s) =>
                        s.kind === "empty"
                          ? s
                          : { ...s, channel: Math.min(16, Math.max(1, Number(e.target.value) || 1)) }
                      )
                    }
                  />
                  <span style={baseStyles.muted}>{targetNames.get(resolvedTarget) ?? "Unassigned"}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...baseStyles.row, justifyContent: "flex-end", marginTop: 12 }}>
          <button style={baseStyles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button style={baseStyles.btnPrimary} onClick={applyChanges}>
            Apply changes
          </button>
        </div>
      </div>
    </div>
  );
}
