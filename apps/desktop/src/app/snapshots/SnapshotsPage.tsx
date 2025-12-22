import { Plus } from "lucide-react";

import type {
  SnapshotClockSource,
  SnapshotQueueStatus,
} from "../../../shared/ipcTypes";
import type {
  SnapshotMode,
  SnapshotQuantize,
  SnapshotsState,
} from "../../../shared/projectTypes";
import type { SnapshotState } from "@midi-playground/core";
import { Page, PageHeader, Panel } from "../components/layout";
import { styles } from "../styles";

const colors = [
  "#38bdf8",
  "#f472b6",
  "#22d3ee",
  "#f97316",
  "#a3e635",
  "#c084fc",
  "#facc15",
  "#fb7185",
];

export function makeSnapshotId(bankId: string, slotId: string) {
  return `${bankId}:${slotId}`;
}

export function parseSnapshotId(
  snapshotId: string
): { bankId: string; slotId: string } | null {
  const idx = snapshotId.indexOf(":");
  if (idx <= 0) return null;
  return {
    bankId: snapshotId.slice(0, idx),
    slotId: snapshotId.slice(idx + 1),
  };
}

export function findSnapshotSlot(
  snapshotId: string,
  state: SnapshotsState
): {
  bank: SnapshotsState["banks"][number];
  slot: SnapshotsState["banks"][number]["slots"][number];
} | null {
  const parsed = parseSnapshotId(snapshotId);
  if (!parsed) return null;
  const bank = state.banks.find((b) => b.id === parsed.bankId);
  if (!bank) return null;
  const slot = bank.slots.find((s) => s.id === parsed.slotId);
  if (!slot) return null;
  return { bank, slot };
}

export function findSnapshotIdByName(
  name: string,
  state: SnapshotsState
): string | null {
  for (const bank of state.banks) {
    for (const slot of bank.slots) {
      if (slot.name === name) return makeSnapshotId(bank.id, slot.id);
    }
  }
  return null;
}

export function listSnapshotNames(state: SnapshotsState): string[] {
  const bank =
    state.banks.find((b) => b.id === state.activeBankId) ?? state.banks[0];
  return (bank?.slots ?? []).map((s) => s.name);
}

export function writeSnapshotToSlot(
  state: SnapshotsState,
  snapshotId: string,
  snapshot: SnapshotState
): SnapshotsState {
  const parsed = parseSnapshotId(snapshotId);
  if (!parsed) return state;
  const nextBanks = state.banks.map((b) => {
    if (b.id !== parsed.bankId) return b;
    return {
      ...b,
      slots: b.slots.map((s) => {
        if (s.id !== parsed.slotId) return s;
        return { ...s, snapshot, lastCapturedAt: Date.now() };
      }),
    };
  });
  return { ...state, banks: nextBanks };
}

export function SnapshotsPage({
  snapshots,
  activeSnapshotId,
  pendingSnapshotId,
  queueStatus,
  onSelectSnapshot,
  onCapture,
  onCancelPending,
  onChangeBank,
  snapshotQuantize,
  snapshotMode,
  onChangeSnapshotQuantize,
  onChangeSnapshotMode,
  snapshotFadeMs,
  onChangeSnapshotFade,
  snapshotCommitDelayMs,
  onChangeSnapshotCommitDelay,
  snapshotClockSource,
  onChangeSnapshotClockSource,
  snapshotCycleBars,
  onChangeSnapshotCycleBars,
}: {
  snapshots: SnapshotsState;
  activeSnapshotId: string | null;
  pendingSnapshotId: string | null;
  queueStatus: SnapshotQueueStatus | null;
  onSelectSnapshot: (snapshotId: string) => void;
  onCapture: (snapshotId: string) => void;
  onCancelPending: () => void;
  onChangeBank: (bankId: string | null) => void;
  snapshotQuantize: SnapshotQuantize;
  snapshotMode: SnapshotMode;
  onChangeSnapshotQuantize: (q: SnapshotQuantize) => void;
  onChangeSnapshotMode: (m: SnapshotMode) => void;
  snapshotFadeMs: number;
  onChangeSnapshotFade: (ms: number) => void;
  snapshotCommitDelayMs: number;
  onChangeSnapshotCommitDelay: (ms: number) => void;
  snapshotClockSource: SnapshotClockSource;
  onChangeSnapshotClockSource: (source: SnapshotClockSource) => void;
  snapshotCycleBars: number;
  onChangeSnapshotCycleBars: (bars: number) => void;
}) {
  const queueLength = queueStatus?.queueLength ?? 0;
  const activeBank =
    snapshots.banks.find((b) => b.id === snapshots.activeBankId) ??
    snapshots.banks[0];
  const activeSlot = activeSnapshotId
    ? findSnapshotSlot(activeSnapshotId, snapshots)
    : null;
  const pendingSlot = pendingSnapshotId
    ? findSnapshotSlot(pendingSnapshotId, snapshots)
    : null;

  return (
    <Page>
      <PageHeader
        title="Snapshots"
        subtitle="Save and recall complete MIDI scenes with one click"
        right={
          <div style={styles.row}>
            <select
              style={styles.select}
              value={snapshots.activeBankId ?? ""}
              onChange={(e) => onChangeBank(e.target.value || null)}
            >
              {[...snapshots.banks].map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name ?? bank.id}
                </option>
              ))}
            </select>
            <span style={styles.muted}>Transition Time (ms)</span>
            <input
              style={styles.inputNarrow}
              value={snapshotFadeMs}
              onChange={(e) =>
                onChangeSnapshotFade(Number(e.target.value) || 0)
              }
              title="How smoothly to blend between scenes (0 = instant, 500 = half second)"
            />
            <span style={styles.muted}>Commit Delay (ms)</span>
            <input
              style={styles.inputNarrow}
              value={snapshotCommitDelayMs}
              onChange={(e) =>
                onChangeSnapshotCommitDelay(Number(e.target.value) || 0)
              }
              title="Commit delay in ms (fallback when not synced to clock)"
            />
            <span style={styles.muted}>Loop Length (bars)</span>
            <input
              style={styles.inputNarrow}
              value={snapshotCycleBars}
              onChange={(e) =>
                onChangeSnapshotCycleBars(
                  Math.min(Math.max(Number(e.target.value) || 1, 1), 32)
                )
              }
              title="Commit applies at the next cycle boundary (1–32 bars)."
            />
            <span style={styles.muted}>Clock</span>
            <select
              style={styles.select}
              value={snapshotClockSource}
              onChange={(e) =>
                onChangeSnapshotClockSource(
                  e.target.value as SnapshotClockSource
                )
              }
            >
              <option value="oxi">OXI (incoming MIDI clock)</option>
              <option value="internal">Internal</option>
            </select>
            <select
              style={styles.select}
              value={snapshotMode}
              onChange={(e) =>
                onChangeSnapshotMode(e.target.value as SnapshotMode)
              }
              title="Jump = change immediately, Commit @ cycle end = wait for loop to finish"
            >
              <option value="jump">Jump (Immediate)</option>
              <option value="commit">Wait for Loop End</option>
            </select>
            <select
              style={styles.select}
              value={snapshotQuantize}
              onChange={(e) =>
                onChangeSnapshotQuantize(e.target.value as SnapshotQuantize)
              }
              title="When the snapshot change happens (sync to beats)"
            >
              <option value="immediate">Immediate (Now)</option>
              <option value="bar1">Wait 1 Measure</option>
              <option value="bar4">Wait 4 Measures</option>
            </select>
            {queueLength > 0 ? (
              <span style={styles.muted}>
                Queue: {queueLength}
                {queueStatus?.executing
                  ? " (sending)"
                  : queueStatus?.armed
                  ? " (armed)"
                  : ""}
              </span>
            ) : null}
            <button
              style={styles.btnPrimary}
              onClick={() =>
                activeSnapshotId && onSelectSnapshot(activeSnapshotId)
              }
            >
              Send Snapshot
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => activeSnapshotId && onCapture(activeSnapshotId)}
              disabled={!activeSnapshotId}
            >
              Capture
            </button>
            {queueLength > 0 ? (
              <button style={styles.btnSecondary} onClick={onCancelPending}>
                Flush Queue
              </button>
            ) : null}
          </div>
        }
      />
      <div style={styles.pageGrid2}>
        <Panel title="Snapshot Pads">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {(activeBank?.slots ?? []).map((slot, idx) => {
              const id = activeBank
                ? makeSnapshotId(activeBank.id, slot.id)
                : slot.id;
              const color = colors[idx % colors.length];
              const isActive = activeSnapshotId === id;
              const isPending = pendingSnapshotId === id;
              return (
                <button
                  key={id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onCapture(id);
                      return;
                    }
                    onSelectSnapshot(id);
                  }}
                  style={{
                    height: 96,
                    borderRadius: 14,
                    border: `2px solid ${isActive ? color : "#1f2937"}`,
                    background: isActive ? `${color}22` : "#0b1220",
                    color: "#e2e8f0",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 0 20px rgba(0,0,0,0.35)" : "none",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      fontSize: 11,
                      color: "#cbd5e1",
                    }}
                  >
                    {slot.name}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      fontSize: 11,
                      color,
                    }}
                  >
                    {isPending ? "Pending" : isActive ? "Active" : "Ready"}
                  </div>
                </button>
              );
            })}
            <div style={{ ...styles.tile, border: "1px dashed #444" }}>
              <Plus size={20} color="#666" />
            </div>
          </div>
        </Panel>
        <Panel title={`Selected: ${activeSlot?.slot.name ?? "None"}`}>
          <div style={styles.card}>
            <div style={styles.row}>
              <span style={{ color: "#35c96a", fontSize: "12px" }}>
                {activeSlot ? "* Active" : "* Idle"}
              </span>
              {pendingSlot ? (
                <span style={styles.muted}>
                  Pending: {pendingSlot.slot.name}
                </span>
              ) : null}
            </div>
            <div style={styles.row}>
              <span style={styles.muted}>Targets</span>
              <span style={styles.pill}>8 mapped</span>
            </div>
            <div style={styles.muted}>
              Add per-parameter curves and slew here.
            </div>
          </div>
        </Panel>
        <Panel title="Morph (conceptual)">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={styles.row}>
              <div style={{ ...styles.pillRow, border: "1px solid #1f2937" }}>
                <span style={styles.muted}>A</span>
                <select style={styles.select}>
                  {listSnapshotNames(snapshots).map((s) => (
                    <option key={`a-${s}`}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...styles.pillRow, border: "1px solid #1f2937" }}>
                <span style={styles.muted}>B</span>
                <select style={styles.select}>
                  {listSnapshotNames(snapshots).map((s) => (
                    <option key={`b-${s}`}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={styles.muted}>Crossfade</span>
              <input type="range" min={0} max={100} defaultValue={0} />
              <span style={styles.muted}>
                Future: interpolate per-parameter with curves and staged fades
                (filters slow, mutes fast).
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <div style={styles.queueStrip}>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>
          NEXT ACTION:
        </span>
        <span style={styles.pill}>
          {pendingSlot ? `Pending: ${pendingSlot.slot.name}` : "Idle"}
        </span>
        {pendingSlot ? (
          <button style={styles.btnTiny} onClick={onCancelPending}>
            Cancel
          </button>
        ) : null}
      </div>
    </Page>
  );
}
