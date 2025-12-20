import { CheckCircle2, Zap } from "lucide-react";

import { getInstrumentProfile } from "@midi-playground/core";
import type { ControlElement, Curve, MappingSlot } from "@midi-playground/core";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { Page, PageHeader, Panel } from "../components/layout";
import { clampChannel, clampMidi } from "../lib/clamp";
import { styles } from "../styles";

export function MappingPage({
  controls,
  selectedControl,
  selectedControlId,
  setSelectedControlId,
  updateSlot,
  updateControl,
  onEmitControl,
  learnStatus,
  onLearn,
  onCancelLearn,
  onSendNote,
  onSendCc,
  note,
  ccValue,
  devices
}: {
  controls: ControlElement[];
  selectedControl: ControlElement | undefined;
  selectedControlId: string | null;
  setSelectedControlId: (id: string) => void;
  updateSlot: (controlId: string, slotIndex: number, partial: Partial<MappingSlot>) => void;
  updateControl?: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl?: (control: ControlElement, rawValue: number) => void;
  learnStatus: "idle" | "listening" | "captured" | "timeout";
  onLearn: (slotIndex: number) => void;
  onCancelLearn: () => void;
  onSendNote: () => void;
  onSendCc: () => void;
  note: number;
  ccValue: number;
  devices: DeviceConfig[];
}) {
  const targetDevice = devices.find((d) => selectedControl?.slots[0]?.targetDeviceId === d.id) ?? devices[0];
  const targetProfile = targetDevice ? getInstrumentProfile(targetDevice.instrumentId) : null;
  const macroTargets = [
    {
      label: "Filter",
      cc: targetProfile?.cc[0]?.cc ?? 74,
      min: 0,
      max: 127,
      curve: "linear" as Curve
    },
    {
      label: "Resonance",
      cc: targetProfile?.cc[1]?.cc ?? 71,
      min: 0,
      max: 110,
      curve: "expo" as Curve
    },
    {
      label: "Env Amt",
      cc: targetProfile?.cc[2]?.cc ?? 79,
      min: 10,
      max: 120,
      curve: "log" as Curve
    }
  ];

  function applyPreset(ccNumber: number, slotIndex = 0) {
    if (!selectedControl) return;
    updateSlot(selectedControl.id, slotIndex, {
      kind: "cc",
      cc: clampMidi(ccNumber),
      enabled: true,
      targetDeviceId: targetDevice?.id ?? null,
      channel: clampChannel(targetDevice?.channel ?? 1)
    });
  }

  function applyMacroMultiBind() {
    if (!selectedControl) return;
    macroTargets.slice(0, selectedControl.slots.length).forEach((t, idx) => {
      updateSlot(selectedControl.id, idx, {
        enabled: true,
        kind: "cc",
        cc: clampMidi(t.cc),
        min: t.min,
        max: t.max,
        curve: t.curve,
        targetDeviceId: targetDevice?.id ?? null,
        channel: clampChannel(targetDevice?.channel ?? 1)
      });
    });
    if (updateControl) {
      updateControl(selectedControl.id, {
        label: `${selectedControl.label} (macro x${macroTargets.length})`
      });
    }
  }

  function nudgeControl(next: number) {
    if (!selectedControl || !onEmitControl || !updateControl) return;
    const clamped = clampMidi(next);
    updateControl(selectedControl.id, { value: clamped });
    onEmitControl({ ...selectedControl, value: clamped }, clamped);
  }

  return (
    <Page>
      <PageHeader
        title="MIDI Mapping"
        right={
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={() => onLearn(0)}>
              <Zap size={14} /> Learn Slot
            </button>
            <button style={styles.btnSecondary} onClick={onCancelLearn}>
              Cancel
            </button>
            <span style={styles.pill}>Status: {learnStatus}</span>
          </div>
        }
      />
      <div style={styles.pageGrid2}>
        <Panel title="Source Controls">
          <input style={styles.input} placeholder="Filter mappings..." />
          <div
            style={{
              height: "200px",
              marginTop: "12px",
              border: "1px solid #333",
              borderRadius: "4px",
              overflowY: "auto",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            {controls.map((control) => (
              <button
                key={control.id}
                style={{
                  ...styles.navItem,
                  backgroundColor: control.id === selectedControlId ? "#0078d422" : "transparent",
                  color: control.id === selectedControlId ? "#fff" : "#888"
                }}
                onClick={() => setSelectedControlId(control.id)}
              >
                <CheckCircle2 size={14} /> {control.label}
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title={`Targets ${selectedControl ? `(${selectedControl.label})` : ""}`}
          right={
            <div style={styles.row}>
              {targetProfile ? (
                <button
                  style={styles.btnSecondary}
                  onClick={() => applyPreset(targetProfile.cc[0]?.cc ?? 74)}
                  disabled={!selectedControl}
                >
                  Quick-assign {targetProfile.cc[0]?.label ?? "Cutoff"}
                </button>
              ) : null}
              <button style={styles.btnSecondary} onClick={applyMacroMultiBind} disabled={!selectedControl}>
                Macro bind 3 targets
              </button>
              <button
                style={styles.btnSecondary}
                disabled={!selectedControl}
                onClick={() => {
                  if (!selectedControl) return;
                  selectedControl.slots.forEach((_, idx) =>
                    updateSlot(selectedControl.id, idx, {
                      enabled: false,
                      kind: "empty"
                    })
                  );
                }}
              >
                Clear slots
              </button>
              <button style={styles.btnSecondary}>Add Target Slot</button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(selectedControl ? selectedControl.slots : []).map((slot, idx) => {
              const deviceName =
                devices.find((d) => d.id === slot.targetDeviceId)?.name ??
                (slot.targetDeviceId ? `Device ${slot.targetDeviceId}` : "No target");
              const isCc = slot.kind === "cc";
              const isPc = slot.kind === "pc";
              const isNote = slot.kind === "note";
              return (
                <div key={idx} style={styles.tableRow}>
                  <span style={styles.cellSmall}>S{idx + 1}</span>
                  <select
                    style={styles.select}
                    value={slot.kind}
                    onChange={(e) =>
                      updateSlot(selectedControl!.id, idx, {
                        kind: e.target.value as MappingSlot["kind"],
                        enabled: e.target.value !== "empty"
                      })
                    }
                  >
                    <option value="empty">Empty</option>
                    <option value="cc">CC</option>
                    <option value="pc">Program</option>
                    <option value="note">Note</option>
                  </select>
                  <label style={{ ...styles.toggleRow, marginLeft: 6 }}>
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={(e) =>
                        updateSlot(selectedControl!.id, idx, {
                          enabled: e.target.checked
                        })
                      }
                    />
                    <span style={styles.muted}>On</span>
                  </label>
                  {isCc ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.cc ?? 0}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            cc: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                      <select
                        style={styles.select}
                        value={slot.curve ?? "linear"}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            curve: e.target.value as Curve
                          })
                        }
                      >
                        <option value="linear">Linear</option>
                        <option value="expo">Expo</option>
                        <option value="log">Log</option>
                      </select>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.min ?? 0}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            min: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.max ?? 127}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            max: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                    </>
                  ) : isPc ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.min ?? 0}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            min: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.max ?? 127}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            max: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                      <select
                        style={styles.select}
                        value={slot.curve ?? "linear"}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            curve: e.target.value as Curve
                          })
                        }
                      >
                        <option value="linear">Linear</option>
                        <option value="expo">Expo</option>
                        <option value="log">Log</option>
                      </select>
                    </>
                  ) : isNote ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.note ?? 60}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            note: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.vel ?? 100}
                        onChange={(e) =>
                          updateSlot(selectedControl!.id, idx, {
                            vel: clampMidi(Number(e.target.value) || 0)
                          })
                        }
                      />
                    </>
                  ) : null}
                  <select
                    style={styles.select}
                    value={slot.targetDeviceId ?? ""}
                    onChange={(e) =>
                      updateSlot(selectedControl!.id, idx, {
                        targetDeviceId: e.target.value === "" ? null : e.target.value
                      })
                    }
                  >
                    <option value="">No target</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.id}
                      </option>
                    ))}
                  </select>
                  <span style={styles.muted}>{deviceName}</span>
                </div>
              );
            })}
          </div>
          {targetProfile ? (
            <div
              style={{
                ...styles.row,
                marginTop: "12px",
                flexWrap: "wrap",
                gap: "6px"
              }}
            >
              <span style={styles.muted}>Top CCs:</span>
              {targetProfile.cc.slice(0, 5).map((c) => (
                <button key={c.id} style={styles.btnTiny} onClick={() => applyPreset(c.cc)}>
                  CC {c.cc} - {c.label}
                </button>
              ))}
              <select
                style={styles.select}
                onChange={(e) => {
                  const ccNum = Number(e.target.value);
                  if (!Number.isNaN(ccNum)) applyPreset(ccNum);
                }}
              >
                <option value="">Assign CC to Slot 1</option>
                {targetProfile.cc.map((c) => (
                  <option key={c.id} value={c.cc}>
                    CC {c.cc} - {c.label}
                  </option>
                ))}
              </select>
              <button
                style={styles.btnTiny}
                onClick={() => selectedControl && updateSlot(selectedControl.id, 0, { enabled: false })}
              >
                Disable Slot 1
              </button>
            </div>
          ) : null}
          <div style={{ ...styles.row, marginTop: "12px" }}>
            <button style={styles.btnSecondary} onClick={onSendCc}>
              Send CC {ccValue}
            </button>
            <button style={styles.btnSecondary} onClick={onSendNote}>
              Send Note {note}
            </button>
            <div style={styles.row}>
              <span style={styles.muted}>Live send</span>
              <button style={styles.btnTiny} onClick={() => nudgeControl((selectedControl?.value ?? 0) - 8)}>
                -
              </button>
              <button style={styles.btnTiny} onClick={() => nudgeControl((selectedControl?.value ?? 0) + 8)}>
                +
              </button>
              <span style={styles.muted}>Value: {selectedControl?.value ?? 0}</span>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
