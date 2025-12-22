import { useState, useMemo } from "react";
import {
  getInstrumentProfile,
  type InstrumentProfile,
} from "@midi-playground/core";
import { styles } from "../styles";
import type { DeviceConfig } from "../../../shared/projectTypes";

export type AssignmentWizardProps = {
  selectedControlId: string | null;
  selectedControlLabel?: string;
  devices: DeviceConfig[];
  targetDeviceId: string | null;
  onAssignCc: (deviceId: string, cc: number, label?: string) => void;
  onMultiBind: (
    deviceId: string,
    targets: Array<{ cc: number; label: string }>
  ) => void;
  onClose: () => void;
};

export function AssignmentWizard({
  selectedControlId,
  selectedControlLabel,
  devices,
  targetDeviceId,
  onAssignCc,
  onMultiBind,
  onClose,
}: AssignmentWizardProps) {
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"search" | "macro">("search");

  // Resolve target device
  const device = devices.find((d) => d.id === targetDeviceId) ?? devices[0];
  const profile: InstrumentProfile | null = device
    ? getInstrumentProfile(device.instrumentId)
    : null;

  // Filter CCs
  const filteredCcs = useMemo(() => {
    if (!profile) return [];
    const query = filter.toLowerCase();
    return profile.cc.filter(
      (c) =>
        c.label.toLowerCase().includes(query) || c.cc.toString().includes(query)
    );
  }, [profile, filter]);

  // Macro templates
  const macroTemplates = useMemo(() => {
    if (!profile) return [];

    return [
      {
        label: "Filter Sweep (Cutoff + Res)",
        targets: profile.cc.filter(
          (c) =>
            c.label.toLowerCase().includes("cutoff") ||
            c.label.toLowerCase().includes("resonance")
        ),
      },
      {
        label: "Envelope (Attack + Decay)",
        targets: profile.cc.filter(
          (c) =>
            c.label.toLowerCase().includes("attack") ||
            c.label.toLowerCase().includes("decay")
        ),
      },
      {
        label: "Oscillator (Wave + Timbre)",
        targets: profile.cc.filter(
          (c) =>
            c.label.toLowerCase().includes("wave") ||
            c.label.toLowerCase().includes("timbre") ||
            c.label.toLowerCase().includes("shape")
        ),
      },
    ].filter((t) => t.targets.length > 0);
  }, [profile]);

  if (!selectedControlId) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 600,
          maxHeight: "80vh",
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={styles.panelHeader}>
          <div style={styles.row}>
            <span style={{ fontWeight: 800, color: "#fff" }}>
              Assignment Wizard
            </span>
            <span style={styles.muted}>for</span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>
              {selectedControlLabel}
            </span>
          </div>
          <button style={styles.btnSecondary} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
          <button
            style={{
              ...styles.navItem,
              justifyContent: "center",
              borderBottom:
                activeTab === "search" ? "2px solid #38bdf8" : "none",
              color: activeTab === "search" ? "#fff" : "#888",
            }}
            onClick={() => setActiveTab("search")}
          >
            Search Parameter
          </button>
          <button
            style={{
              ...styles.navItem,
              justifyContent: "center",
              borderBottom:
                activeTab === "macro" ? "2px solid #38bdf8" : "none",
              color: activeTab === "macro" ? "#fff" : "#888",
            }}
            onClick={() => setActiveTab("macro")}
          >
            Macro Multi-Bind
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
          {activeTab === "search" ? (
            <>
              {profile ? (
                <>
                  <input
                    style={{ ...styles.input, marginBottom: 12 }}
                    placeholder="Search CC name or number..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    autoFocus
                  />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {filteredCcs.length > 0 ? (
                      filteredCcs.map((cc) => (
                        <button
                          key={cc.cc}
                          style={{
                            ...styles.btnSecondary,
                            justifyContent: "space-between",
                            display: "flex",
                          }}
                          onClick={() => {
                            onAssignCc(device.id, cc.cc, cc.label);
                            onClose();
                          }}
                        >
                          <span>{cc.label}</span>
                          <span style={{ color: "#666", fontSize: 10 }}>
                            CC {cc.cc}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div
                        style={{
                          color: "#888",
                          padding: 20,
                          textAlign: "center",
                          gridColumn: "span 2",
                        }}
                      >
                        No parameters match filters.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    color: "#fca5a5",
                    padding: 20,
                    textAlign: "center",
                    border: "1px dashed #ef444433",
                    borderRadius: 4,
                  }}
                >
                  No instrument profile selected. Assign an instrument in Setup
                  to see named parameters.
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <h3
                  style={{
                    fontSize: 14,
                    color: "#e2e8f0",
                    margin: "0 0 8px 0",
                  }}
                >
                  One-click Macros
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                  Bind multiple parameters to this control instantly. Great for
                  "Macro" knobs.
                </p>
              </div>

              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {macroTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    style={{
                      ...styles.card,
                      cursor: "pointer",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                    onClick={() => {
                      onMultiBind(device.id, t.targets);
                      onClose();
                    }}
                  >
                    <div style={{ fontWeight: 600, color: "#fff" }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      Binds: {t.targets.map((x) => x.label).join(" + ")}
                    </div>
                  </button>
                ))}

                {macroTemplates.length === 0 && (
                  <div style={{ color: "#888", fontStyle: "italic" }}>
                    No macro templates available for this instrument (needs
                    standard tags like Cutoff/Resonance).
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            background: "#111",
            borderTop: "1px solid #333",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            Target Device:{" "}
            <strong style={{ color: "#e2e8f0" }}>
              {device?.name ?? "None"}
            </strong>
            (Channel {device?.channel})
          </div>
        </div>
      </div>
    </div>
  );
}
