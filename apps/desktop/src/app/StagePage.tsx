import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BridgeClock } from "../services/midiBridge";
import type { SnapshotQuantizeKind } from "../../shared/ipcTypes";
import { describePhase, quantizeLaunch, type QuantizeKind } from "./lib/stage/transition";

export type StagePageProps = {
  clock: BridgeClock;
  snapshots: string[];
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string, quantize: SnapshotQuantizeKind) => void;
  onDrop: (name: string) => void;
  dropMacroControls: Array<{ id: string; label: string }>;
  dropMacroControlId: string | null;
  onChangeDropMacroControlId: (id: string | null) => void;
  dropMacroToValue: number;
  onChangeDropMacroToValue: (value: number) => void;
  dropDurationMs: number;
  onChangeDropDurationMs: (ms: number) => void;
};

type TransitionState =
  | { status: "idle" }
  | { status: "armed"; scene: string; dueAt: number; quantize: QuantizeKind }
  | { status: "executing"; scene: string };

const colors = ["#38bdf8", "#f472b6", "#22d3ee", "#f97316", "#a3e635", "#c084fc", "#facc15", "#fb7185"];

export function StagePage({
  clock,
  snapshots,
  activeSnapshot,
  onSelectSnapshot,
  onDrop,
  dropMacroControls,
  dropMacroControlId,
  onChangeDropMacroControlId,
  dropMacroToValue,
  onChangeDropMacroToValue,
  dropDurationMs,
  onChangeDropDurationMs
}: StagePageProps) {
  const [quantize, setQuantize] = useState<QuantizeKind>("bar");
  const [transition, setTransition] = useState<TransitionState>({ status: "idle" });
  const timerRef = useRef<number | null>(null);

  const phase = useMemo(() => describePhase(clock), [clock]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const mapQuantize = (kind: QuantizeKind, immediate: boolean): SnapshotQuantizeKind => {
    if (immediate) return "immediate";
    return kind === "beat" ? "beat" : "bar";
  };

  const armScene = (scene: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const launch = quantizeLaunch(clock, quantize);
    setTransition({ status: "armed", scene, dueAt: launch.dueAt, quantize });

    const quantizeKind = mapQuantize(quantize, launch.delayMs <= 0 || clock.stale);
    onSelectSnapshot(scene, quantizeKind);

    executeScene(scene);
  };

  const dropScene = (scene: string) => {
    setTransition({ status: "armed", scene, dueAt: Date.now(), quantize: "bar" });
    onDrop(scene);
    executeScene(scene);
  };

  const executeScene = (scene: string) => {
    setTransition({ status: "executing", scene });
    timerRef.current = window.setTimeout(() => setTransition({ status: "idle" }), 400);
  };

  const statusBadge = (() => {
    switch (transition.status) {
      case "armed":
        return (
          <span style={{ ...styles.badge, background: "#facc15", color: "#1f2937" }}>
            Armed → {transition.scene} ({transition.quantize})
          </span>
        );
      case "executing":
        return (
          <span style={{ ...styles.badge, background: "#22c55e", color: "#052e16" }}>
            Executing {transition.scene}
          </span>
        );
      default:
        return <span style={{ ...styles.badge, background: "#1f2937", color: "#cbd5e1" }}>Idle</span>;
    }
  })();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>Stage</p>
          <h1 style={styles.title}>Scene launcher</h1>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={styles.meta}>BPM: {clock.bpm ? clock.bpm.toFixed(1) : "--"}</span>
            <span style={styles.meta}>Bar {phase.bar} • Beat {phase.beat}</span>
            <div style={styles.phaseTrack}>
              <div style={{ ...styles.phaseFill, width: `${Math.min(1, phase.phase) * 100}%` }} />
            </div>
            <span style={styles.meta}>{clock.stale ? "Waiting for clock" : "Clock linked"}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {statusBadge}
          <select
            style={styles.select}
            value={dropMacroControlId ?? ""}
            onChange={(e) => onChangeDropMacroControlId(e.target.value || null)}
            title="Control to ramp during Drop (uses mapping slots for fan-out)."
          >
            <option value="">Drop macro: none</option>
            {dropMacroControls.map((c) => (
              <option key={c.id} value={c.id}>
                Drop macro: {c.label}
              </option>
            ))}
          </select>
          <input
            style={{ ...styles.select, width: 110 }}
            type="number"
            min={0}
            max={127}
            value={dropMacroToValue}
            onChange={(e) => onChangeDropMacroToValue(Number(e.target.value) || 0)}
            title="Drop macro target value (0–127)."
          />
          <input
            style={{ ...styles.select, width: 120 }}
            type="number"
            min={0}
            max={5000}
            value={dropDurationMs}
            onChange={(e) => onChangeDropDurationMs(Number(e.target.value) || 0)}
            title="Drop macro ramp duration in ms."
          />
          <select style={styles.select} value={quantize} onChange={(e) => setQuantize(e.target.value as QuantizeKind)}>
            <option value="bar">Quantize to bar</option>
            <option value="beat">Quantize to beat</option>
          </select>
        </div>
      </header>

      <div style={styles.grid}>
        {snapshots.map((scene, idx) => {
          const color = colors[idx % colors.length];
          const isActive = activeSnapshot === scene;
          const isArmed = transition.status === "armed" && transition.scene === scene;
          const isExecuting = transition.status === "executing" && transition.scene === scene;
          return (
            <div
              key={scene}
              style={{
                ...styles.card,
                borderColor: color,
                background: isActive ? `${color}22` : "#0b1220",
                boxShadow: isExecuting ? `0 0 18px ${color}88` : "none"
              }}
            >
              <div style={styles.cardTitle}>{scene}</div>
              <div style={{ color, fontSize: 12 }}>{isActive ? "Active" : isArmed ? "Armed" : "Ready"}</div>
              <div style={styles.cardActions}>
                <button
                  onClick={() => armScene(scene)}
                  style={{ ...styles.cardActionBtn, borderColor: "#1f2937" }}
                  disabled={isExecuting}
                >
                  Launch
                </button>
                <button
                  onClick={() => dropScene(scene)}
                  style={{ ...styles.cardActionBtn, borderColor: color }}
                  disabled={isExecuting}
                  title="Commit at next cycle boundary (Drop)."
                >
                  Drop
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 1100,
    margin: "0 auto",
    color: "#e2e8f0"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #1f2937",
    paddingBottom: 12
  },
  kicker: {
    margin: 0,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontSize: 11,
    color: "#94a3b8"
  },
  title: {
    margin: 0,
    fontWeight: 600,
    fontSize: 24,
    color: "#f8fafc"
  },
  meta: {
    fontSize: 12,
    color: "#cbd5e1"
  },
  phaseTrack: {
    width: 140,
    height: 8,
    borderRadius: 999,
    background: "#0f172a",
    border: "1px solid #1e293b",
    overflow: "hidden"
  },
  phaseFill: {
    height: "100%",
    background: "linear-gradient(90deg, #38bdf8, #22c55e)"
  },
  select: {
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 8,
    border: "1px solid #1f2937",
    padding: "8px 10px"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12
  },
  card: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 16,
    background: "#0b1220",
    textAlign: "left",
    transition: "all 0.15s",
    color: "inherit"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8
  },
  cardActions: {
    marginTop: 12,
    display: "flex",
    gap: 10
  },
  cardActionBtn: {
    flex: 1,
    borderRadius: 10,
    border: "1px solid #1f2937",
    padding: "10px 12px",
    background: "#0f172a",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 700
  }
};
