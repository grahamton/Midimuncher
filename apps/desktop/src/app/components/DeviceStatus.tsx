import { Activity, AlertTriangle, PlugZap, Power } from "lucide-react";
import type { CSSProperties } from "react";
import type { MidiPorts } from "../../../shared/ipcTypes";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { formatPortLabel, sortPortsWithOxiFirst } from "../lib/ports";

export type DeviceStatus = {
  device: DeviceConfig;
  inputPort: MidiPorts["inputs"][number] | null;
  outputPort: MidiPorts["outputs"][number] | null;
  online: boolean;
  lastActivity: number | null;
};

type DeviceStatusPanelProps = {
  statuses: DeviceStatus[];
  ports: MidiPorts;
  onChangeDevice: (id: string, partial: Partial<DeviceConfig>) => void;
  onAddDevice?: () => void;
};

export function DeviceStatusPanel({ statuses, ports, onChangeDevice, onAddDevice }: DeviceStatusPanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1" }}>
          <Activity size={16} />
          <span>Rig health</span>
        </div>
        {onAddDevice ? (
          <button style={styles.btnSecondary} onClick={onAddDevice}>
            Add device
          </button>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {statuses.length === 0 ? (
          <div style={styles.empty}>No devices configured yet.</div>
        ) : (
          statuses.map((status) => {
            const { device } = status;
            const missingInput = device.inputId && !status.inputPort;
            const missingOutput = device.outputId && !status.outputPort;
            return (
              <div key={device.id} style={styles.row}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{device.name}</span>
                    <StatusPill online={status.online} />
                    {missingInput || missingOutput ? (
                      <div style={styles.badgeWarn}>
                        <AlertTriangle size={12} /> Missing {missingInput && missingOutput ? "IO" : missingInput ? "IN" : "OUT"}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>
                    Last activity: {formatLastActivity(status.lastActivity)}
                  </div>
                </div>
                <div style={styles.pickerGroup}>
                  <label style={styles.label}>In</label>
                  <select
                    style={styles.select}
                    value={device.inputId ?? ""}
                    onChange={(e) => onChangeDevice(device.id, { inputId: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {missingInput ? (
                      <option value={device.inputId ?? ""}>
                        Missing: {device.inputId}
                      </option>
                    ) : null}
                    {ports.inputs.slice().sort(sortPortsWithOxiFirst).map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPortLabel(p.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={styles.pickerGroup}>
                  <label style={styles.label}>Out</label>
                  <select
                    style={styles.select}
                    value={device.outputId ?? ""}
                    onChange={(e) => onChangeDevice(device.id, { outputId: e.target.value || null })}
                  >
                    <option value="">None</option>
                    {missingOutput ? (
                      <option value={device.outputId ?? ""}>
                        Missing: {device.outputId}
                      </option>
                    ) : null}
                    {ports.outputs.slice().sort(sortPortsWithOxiFirst).map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatPortLabel(p.name)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatusPill({ online }: { online: boolean }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 12,
        color: online ? "#c7f9cc" : "#fcd34d",
        background: online ? "#1b433260" : "#92400e33",
        border: online ? "1px solid #34d39955" : "1px solid #fbbf2455"
      }}
    >
      {online ? <Power size={12} /> : <PlugZap size={12} />}
      <span>{online ? "Online" : "Offline"}</span>
    </div>
  );
}

function formatLastActivity(ts: number | null): string {
  if (!ts) return "No activity yet";
  const delta = Date.now() - ts;
  if (delta < 5_000) return "Just now";
  if (delta < 60_000) return `${Math.round(delta / 1000)}s ago`;
  const mins = Math.round(delta / 60000);
  if (mins < 90) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

const styles = {
  row: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr 1fr",
    gap: 12,
    padding: "10px 12px",
    border: "1px solid #1f2937",
    borderRadius: 8,
    background: "#0b1220",
    alignItems: "center"
  },
  pickerGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { color: "#94a3b8", fontSize: 12 },
  select: {
    background: "#0f172a",
    color: "#e2e8f0",
    border: "1px solid #1f2937",
    borderRadius: 6,
    padding: "6px 8px"
  },
  btnSecondary: {
    background: "#1c1f24",
    backgroundImage: "none",
    color: "#e1e8f0",
    border: "1px solid #29313a",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 12
  },
  empty: {
    padding: 12,
    border: "1px dashed #29313a",
    borderRadius: 8,
    color: "#94a3b8",
    textAlign: "center"
  },
  badgeWarn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    background: "#44260f",
    color: "#fbbf24",
    border: "1px solid #9a3412"
  }
} satisfies Record<string, CSSProperties>;
