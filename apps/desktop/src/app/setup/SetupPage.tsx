import { Play } from "lucide-react";
import type { MidiPorts } from "../../../shared/ipcTypes";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { DeviceStatusPanel } from "../components/DeviceStatus";
import { Page, PageHeader, Panel } from "../components/layout";
import { styles } from "../styles";

type SetupPageProps = {
  ports: MidiPorts;
  devices: DeviceConfig[];
  updateDevice: (id: string, partial: Partial<DeviceConfig>) => void;
  // Diagnostics
  diagMessage: string | null;
  diagRunning: boolean;
  onRunDiagnostics: () => void;
  selectedOut: string | null;
  onAddDevice?: () => void;
  onQuickOxiSetup?: () => void;
  onStandardOxiSetup?: () => void;
  transportChannel: number;
  setTransportChannel: (ch: number) => void;
};

export function SetupPage({
  ports,
  devices,
  updateDevice,
  diagMessage,
  diagRunning,
  onRunDiagnostics,
  selectedOut,
  onAddDevice,
  onQuickOxiSetup,
  onStandardOxiSetup,
  transportChannel,
  setTransportChannel,
}: SetupPageProps) {
  // Map devices to status format expected by panel
  // We don't track 'online' or 'lastActivity' in App state seemingly?
  // Or maybe we do?
  // App.tsx passes `devices` which is DeviceConfig[].
  // DeviceStatusPanel expects `DeviceStatus[]`.
  // DeviceStatus has `online`, `lastActivity`, `inputPort`, `outputPort`.

  // We need to derive inputPort/outputPort objects from IDs + ports list.

  const statuses = devices.map((d) => {
    const inputPort = ports.inputs.find((p) => p.id === d.inputId) ?? null;
    const outputPort = ports.outputs.find((p) => p.id === d.outputId) ?? null;
    return {
      device: d,
      inputPort,
      outputPort,
      online: Boolean((!d.inputId || inputPort) && (!d.outputId || outputPort)),
      lastActivity: null, // We don't have this in DeviceConfig currently
    };
  });

  return (
    <Page>
      <PageHeader
        title="Setup & Routing"
        right={
          <div style={styles.row}>
            <span style={styles.muted}>
              {ports.inputs.length} in, {ports.outputs.length} out
            </span>
          </div>
        }
      />

      <div style={styles.pageGrid2}>
        <Panel title="Devices">
          <DeviceStatusPanel
            statuses={statuses}
            ports={ports}
            onChangeDevice={updateDevice}
            onAddDevice={onAddDevice}
          />
        </Panel>

        <Panel title="OXI One Hub Best Practices">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              Recommended settings for using OXI One as your hardware MIDI hub:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  label: "USB Mode",
                  value: "DEVICE",
                  help: "How OXI connects to Windows (Device = acts as MIDI keyboard)",
                },
                {
                  label: "USB Thru",
                  value: "ENABLE (usually)",
                  help: "Pass MIDI messages through OXI to connected gear",
                },
                {
                  label: "Control Change Transport",
                  value: "ENABLE (CC 105-107)",
                  help: "Allows OXI to send Play/Stop/Record commands",
                },
                {
                  label: "OXI Split Mode",
                  value: "ENABLE (Port A/B/C)",
                  help: "Splits OXI into 3 virtual ports for more channels",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    ...styles.row,
                    justifyContent: "space-between",
                    padding: "4px 0",
                    borderBottom: "1px solid #1e242c",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 10, color: "#475569" }}>
                      {item.help}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      color: "#19b0d7",
                      fontWeight: "bold",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
              {/* Interactive Transport Channel Setting */}
              <div
                style={{
                  ...styles.row,
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #1e242c",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                    Transport Channel
                  </span>
                  <span style={{ fontSize: 10, color: "#475569" }}>
                    Channel for Play/Stop/Rec CCs
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={transportChannel}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val))
                        setTransportChannel(Math.min(Math.max(val, 1), 16));
                    }}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 4,
                      color: "#e2e8f0",
                      padding: "2px 8px",
                      width: 50,
                      textAlign: "center",
                      fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#64748b" }}>
                    Choose Ch
                  </span>
                </div>
              </div>
            </div>
            <p style={{ ...styles.muted, fontSize: 12, marginTop: 8 }}>
              Check OXI Config &gt; MIDI for these settings. Midimuncher uses
              the OXI as a router; synths stay connected to OXI's DIN/TRS outs.
            </p>
            <div
              style={{
                ...styles.row,
                gap: 8,
                marginTop: 12,
                padding: "8px 12px",
                background: "#1a2332",
                borderRadius: 4,
                border: "1px solid #2a3a4a",
              }}
            >
              <span style={{ fontSize: 20 }}>🔵</span>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#19b0d7",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                >
                  Bluetooth MIDI (Wireless)
                </p>
                <p style={{ ...styles.muted, fontSize: 12 }}>
                  Pair OXI One via Windows Settings → Bluetooth & Devices → Add
                  Device. Once paired, it will appear in the input/output
                  dropdowns above.
                </p>
              </div>
            </div>
            <div style={{ ...styles.row, gap: 12, marginTop: 8 }}>
              <button
                style={{
                  ...styles.btnPrimary,
                  alignSelf: "flex-start",
                }}
                onClick={onQuickOxiSetup}
                disabled={!selectedOut}
                title="Creates 3 virtual ports (Split A/B/C)"
              >
                🚀 Quick Split Setup
              </button>
              <button
                style={{
                  ...styles.btnSecondary,
                  alignSelf: "flex-start",
                }}
                onClick={onStandardOxiSetup}
                disabled={!selectedOut}
                title="Creates 1 master port (Standard)"
              >
                🎹 Standard Setup
              </button>
            </div>
          </div>
        </Panel>

        <Panel title="Diagnostics">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={styles.muted}>
              Select an Output Port in the top bar (or internal device route) to
              test basic MIDI connectivity.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                style={diagRunning ? styles.btnSecondary : styles.btnPrimary}
                onClick={onRunDiagnostics}
                disabled={diagRunning || !selectedOut}
              >
                <Play size={14} />
                {diagRunning ? "Running..." : "Send Test Note"}
              </button>
              <span
                style={{
                  fontSize: 13,
                  color: diagMessage?.includes("failed")
                    ? "#f87171"
                    : "#cbd5e1",
                }}
              >
                {diagMessage || "Ready"}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </Page>
  );
}
