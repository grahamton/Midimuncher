import { useMemo, useState, useEffect } from "react";
import type { Curve } from "@midi-playground/core";
import { getInstrumentProfile, type InstrumentProfile } from "@midi-playground/core";
import type { ControlElement, MappingSlot as MappingSlotType } from "@midi-playground/core";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { clampMidi } from "../lib/clamp";

type WizardStyles = {
  btnPrimary: React.CSSProperties;
  btnSecondary: React.CSSProperties;
  muted: React.CSSProperties;
  select: React.CSSProperties;
  inputNarrow: React.CSSProperties;
};

export type AssignmentWizardStubProps = {
  devices: DeviceConfig[];
  controls: ControlElement[];
  selectedControlId: string | null;
  styles: WizardStyles;
  updateSlot: (controlId: string, slotIndex: number, partial: Partial<MappingSlotType>) => void;
  onSetQuickCc: (cc: number) => void;
};

export function AssignmentWizardStub({
  devices,
  controls,
  selectedControlId,
  styles,
  updateSlot,
  onSetQuickCc,
}: AssignmentWizardStubProps) {
  const [showWizard, setShowWizard] = useState(false);
  const [wizardSelected, setWizardSelected] = useState<number[]>([]);
  const [wizardColor, setWizardColor] = useState("#38bdf8");
  const [wizardCurve, setWizardCurve] = useState<Curve>("linear");
  const [wizardMin, setWizardMin] = useState(0);
  const [wizardMax, setWizardMax] = useState(127);
  const [wizardStartSlot, setWizardStartSlot] = useState(0);
  const [wizardDeviceId, setWizardDeviceId] = useState<string | null>(null);
  const [targetControlId, setTargetControlId] = useState<string | null>(null);

  const targetDevice = useMemo(() => {
    if (wizardDeviceId) return devices.find((d) => d.id === wizardDeviceId) ?? null;
    return devices[0] ?? null;
  }, [devices, wizardDeviceId]);

  const targetProfile: InstrumentProfile | null = useMemo(() => {
    return targetDevice ? getInstrumentProfile(targetDevice.instrumentId) : null;
  }, [targetDevice]);

  const clearSelection = () => {
    setWizardSelected([]);
    setWizardColor("#38bdf8");
    setWizardCurve("linear");
    setWizardMin(0);
    setWizardMax(127);
    setWizardStartSlot(0);
    setWizardDeviceId(targetDevice?.id ?? null);
  };

  useEffect(() => {
    setTargetControlId(selectedControlId ?? controls[0]?.id ?? null);
  }, [selectedControlId, controls]);

  const handleAssign = () => {
    if (!targetDevice || wizardSelected.length === 0 || !targetControlId) return;
    const slotChannel = targetDevice.channel ?? 1;
    wizardSelected.forEach((cc, idx) => {
      const slotIndex = Math.min(7, wizardStartSlot + idx);
      updateSlot(targetControlId, slotIndex, {
        enabled: true,
        kind: "cc",
        cc,
        channel: slotChannel,
        min: wizardMin,
        max: wizardMax,
        curve: wizardCurve,
        targetDeviceId: targetDevice.id,
      });
    });
    onSetQuickCc(clampMidi(wizardSelected[0]));
    setShowWizard(false);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <p style={styles.muted}>
          Multi-bind flow with instrument-aware picker and color tags. Select parameters and bind them to a macro or pad in
          one pass.
        </p>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#cbd5e1" }}>Target control</span>
          <select
            style={styles.select}
            value={targetControlId ?? ""}
            onChange={(e) => setTargetControlId(e.target.value || null)}
          >
            {controls.map((control) => (
              <option key={control.id} value={control.id}>
                {control.label ?? control.id}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button style={styles.btnPrimary} onClick={() => setShowWizard(true)} disabled={!targetProfile}>
        Open wizard
      </button>
      {showWizard && targetProfile ? (
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))",
            gap: 8
          }}
        >
          {targetProfile.cc.slice(0, 6).map((c) => (
            <div
              key={c.id}
              style={{
                padding: 10,
                borderRadius: 10,
                border: `2px solid ${wizardSelected.includes(c.cc) ? wizardColor : "#1f2937"}`,
                background: wizardSelected.includes(c.cc) ? `${wizardColor}22` : "#0b1220",
                color: "#e2e8f0"
              }}
              onClick={() =>
                setWizardSelected((prev) => (prev.includes(c.cc) ? prev.filter((id) => id !== c.cc) : [...prev, c.cc]))
              }
            >
              <div
                style={{
                  fontWeight: 600,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <span>{c.label}</span>
                <span
                  style={{
                    color: wizardSelected.includes(c.cc) ? "#38bdf8" : "#94a3b8",
                    fontSize: 12
                  }}
                >
                  CC {c.cc}
                </span>
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                Tap to {wizardSelected.includes(c.cc) ? "remove" : "select"}
              </div>
            </div>
          ))}
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap"
                }}
              >
                <span style={styles.muted}>Curve</span>
                <select style={styles.select} value={wizardCurve} onChange={(e) => setWizardCurve(e.target.value as Curve)}>
                  <option value="linear">Linear</option>
                  <option value="expo">Expo</option>
                  <option value="log">Log</option>
                </select>
                <span style={styles.muted}>Min</span>
                <input
                  style={styles.inputNarrow}
                  type="number"
                  min={0}
                  max={127}
                  value={wizardMin}
                  onChange={(e) => setWizardMin(clampMidi(Number(e.target.value) || 0))}
                />
                <span style={styles.muted}>Max</span>
                <input
                  style={styles.inputNarrow}
                  type="number"
                  min={0}
                  max={127}
                  value={wizardMax}
                  onChange={(e) => setWizardMax(clampMidi(Number(e.target.value) || 0))}
                />
                <span style={styles.muted}>Start slot</span>
                <input
                  style={styles.inputNarrow}
                  type="number"
                  min={1}
                  max={8}
                  value={wizardStartSlot + 1}
                  onChange={(e) => setWizardStartSlot(Math.max(0, Math.min(7, Number(e.target.value) - 1 || 0)))}
                />
                <span style={styles.muted}>Device</span>
                <select style={styles.select} value={wizardDeviceId ?? ""} onChange={(e) => setWizardDeviceId(e.target.value || null)}>
                  <option value="">No target</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.id}
                    </option>
                  ))}
                </select>
                <span style={styles.muted}>Color</span>
                <input
                  type="color"
                  value={wizardColor}
                  onChange={(e) => setWizardColor(e.target.value)}
                  style={{
                    width: 40,
                    height: 30,
                    border: "1px solid #1f2937",
                    borderRadius: 6,
                    background: "#0b1220"
                  }}
                />
                <button
                  style={styles.btnPrimary}
                  disabled={!targetControlId || wizardSelected.length === 0}
                  onClick={handleAssign}
                >
                  Assign ({wizardSelected.length})
                </button>
                <button style={styles.btnSecondary} onClick={clearSelection}>
                  Clear selection
                </button>
              </div>
        </div>
      ) : null}
    </>
  );
}
