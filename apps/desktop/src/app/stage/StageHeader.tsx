import type { BridgeClock } from "../../services/midiBridge";
import type { SnapshotQuantizeKind, SnapshotQueueStatus } from "../../../shared/ipcTypes";
import { stageStyles } from "./styles";
import type { QuantizeKind } from "./lib/stage/transition";

type StageHeaderProps = {
  clock: BridgeClock;
  queueStatus: SnapshotQueueStatus | null;
  quantize: QuantizeKind;
  setQuantize: (next: QuantizeKind) => void;
  dropMacroControls: Array<{ id: string; label: string }>;
  dropMacroControlId: string | null;
  onChangeDropMacroControlId: (id: string | null) => void;
  dropMacroToValue: number;
  onChangeDropMacroToValue: (value: number) => void;
  dropDurationMs: number;
  onChangeDropDurationMs: (ms: number) => void;
  transitionStatus: "idle" | "armed" | "executing";
  transitionScene: string | null;
  transitionQuantize: QuantizeKind;
};

export function StageHeader({
  clock,
  queueStatus,
  quantize,
  setQuantize,
  dropMacroControls,
  dropMacroControlId,
  onChangeDropMacroControlId,
  dropMacroToValue,
  onChangeDropMacroToValue,
  dropDurationMs,
  onChangeDropDurationMs,
  transitionStatus,
  transitionScene,
  transitionQuantize
}: StageHeaderProps) {
  const phase = clock.phase ?? { phase: 0, bar: 1, beat: 1 };
  const statusBadge = (() => {
    switch (transitionStatus) {
      case "armed":
        return (
          <span style={{ ...stageStyles.badge, background: "#facc15", color: "#1f2937" }}>
            Armed • {transitionScene} ({transitionQuantize})
          </span>
        );
      case "executing":
        return (
          <span style={{ ...stageStyles.badge, background: "#22c55e", color: "#052e16" }}>Executing {transitionScene}</span>
        );
      default:
        return <span style={{ ...stageStyles.badge, background: "#1f2937", color: "#cbd5e1" }}>Idle</span>;
    }
  })();

  const queueLine = (() => {
    const head = queueStatus?.activeSnapshotName ?? null;
    const length = queueStatus?.queueLength ?? 0;
    if (!head || length <= 0) return <span style={{ ...stageStyles.badge, background: "#1f2937", color: "#cbd5e1" }}>Queue idle</span>;
    const state = queueStatus?.executing ? "Sending" : queueStatus?.armed ? "Armed" : "Queued";
    return (
      <span style={{ ...stageStyles.badge, background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b" }}>
        {state}: {head} (q={length})
      </span>
    );
  })();

  const queueProgress = (() => {
    const timing = queueStatus?.timing;
    if (!timing?.boundaryTicks || !timing?.dueTick) return 0;
    const remaining = timing.dueTick - timing.tickCount;
    return Math.min(Math.max(1 - remaining / timing.boundaryTicks, 0), 1);
  })();

  return (
    <header style={stageStyles.header}>
      <div>
        <p style={stageStyles.kicker}>Stage</p>
        <h1 style={stageStyles.title}>Scene launcher</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={stageStyles.meta}>BPM: {clock.bpm ? clock.bpm.toFixed(1) : "--"}</span>
          <span style={stageStyles.meta}>Bar {phase.bar} • Beat {phase.beat}</span>
          <div style={stageStyles.phaseTrack}>
            <div style={{ ...stageStyles.phaseFill, width: `${Math.min(1, phase.phase) * 100}%` }} />
          </div>
          <span style={stageStyles.meta}>{clock.stale ? "Waiting for clock" : "Clock linked"}</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
          {queueLine}
          <div style={{ ...stageStyles.phaseTrack, width: 220 }} title="Next scheduled boundary">
            <div
              style={{
                ...stageStyles.phaseFill,
                width: `${Math.round(queueProgress * 100)}%`,
                background: "linear-gradient(90deg, #f97316, #22c55e)"
              }}
            />
          </div>
          <span style={stageStyles.meta}>
            {queueStatus?.timing?.dueInMs != null ? `Next in ~${Math.round(queueStatus.timing.dueInMs)}ms` : ""}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {statusBadge}
        <select
          style={stageStyles.select}
          value={dropMacroControlId ?? ""}
          onChange={(e) => onChangeDropMacroControlId(e.target.value || null)}
          title="Control to ramp during Drop"
        >
          <option value="">Drop macro: none</option>
          {dropMacroControls.map((c) => (
            <option key={c.id} value={c.id}>
              Drop macro: {c.label}
            </option>
          ))}
        </select>
        <input
          style={{ ...stageStyles.select, width: 110 }}
          type="number"
          min={0}
          max={127}
          value={dropMacroToValue}
          onChange={(e) => onChangeDropMacroToValue(Number(e.target.value) || 0)}
          title="Drop macro target value"
        />
        <input
          style={{ ...stageStyles.select, width: 120 }}
          type="number"
          min={0}
          max={5000}
          value={dropDurationMs}
          onChange={(e) => onChangeDropDurationMs(Number(e.target.value) || 0)}
          title="Drop macro ramp duration in ms"
        />
        <select style={stageStyles.select} value={quantize} onChange={(e) => setQuantize(e.target.value as QuantizeKind)}>
          <option value="bar">Quantize to bar</option>
          <option value="beat">Quantize to beat</option>
        </select>
      </div>
    </header>
  );
}
