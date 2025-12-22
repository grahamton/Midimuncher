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
  // Optional add device for future
  onAddDevice?: () => void;
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
