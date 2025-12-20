import type { MidiPortRef } from "@midi-playground/core";
import type { SessionLogStatus } from "../../../shared/ipcTypes";
import { Panel, Page, PageHeader } from "../components/layout";
import { styles } from "../styles";

export type MonitorRow = {
  _rowId: string;
  ts: number;
  src: MidiPortRef;
  label: string;
};

export type MonitorPageProps = {
  monitorRows: MonitorRow[];
  logCapReached: boolean;
  clearLog: () => void;
  sessionStatus: SessionLogStatus | null;
  onSessionStart: () => void;
  onSessionStop: () => void;
  onSessionReveal: () => void;
};

export function MonitorPage({
  monitorRows,
  logCapReached,
  clearLog,
  sessionStatus,
  onSessionStart,
  onSessionStop,
  onSessionReveal,
}: MonitorPageProps) {
  return (
    <Page>
      <PageHeader
        title="MIDI Monitor"
        right={
          <div style={styles.row}>
            {sessionStatus?.active ? (
              <span style={{ ...styles.pill, borderColor: "#ef4444", color: "#fecaca" }}>REC</span>
            ) : null}
            {logCapReached ? <span style={styles.pill}>Log capped</span> : null}
            <button
              style={styles.btnSecondary}
              onClick={sessionStatus?.active ? onSessionStop : onSessionStart}
            >
              {sessionStatus?.active ? "Stop Recording" : "Start Recording"}
            </button>
            <button style={styles.btnSecondary} onClick={onSessionReveal} disabled={!sessionStatus?.filePath}>
              Reveal Log
            </button>
            <button style={styles.btnSecondary} onClick={clearLog}>
              Clear Log
            </button>
          </div>
        }
      />
      <Panel title="Real-time Traffic">
        {sessionStatus?.filePath ? (
          <div style={{ ...styles.muted, marginBottom: 8 }}>
            Session log: {sessionStatus.filePath} ({sessionStatus.eventCount} lines)
          </div>
        ) : null}
        <div
          style={{
            height: "400px",
            backgroundColor: "#000",
            fontFamily: "monospace",
            padding: "12px",
            fontSize: "12px",
            color: "#35c96a",
            overflowY: "auto",
          }}
        >
          {monitorRows.length === 0 ? (
            <div style={{ color: "#666" }}>Waiting for MIDI activity...</div>
          ) : (
            monitorRows.map((row) => (
              <div key={row._rowId}>
                [{new Date(row.ts).toLocaleTimeString()}] {row.src.name}: {row.label}
              </div>
            ))
          )}
        </div>
      </Panel>
    </Page>
  );
}
