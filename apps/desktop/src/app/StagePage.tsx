import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BridgeClock } from "../services/midiBridge";
import { describePhase, quantizeLaunch, type QuantizeKind } from "./lib/stage/transition";

export type StagePageProps = {
  clock: BridgeClock;
  snapshots: string[];
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string) => void;
};

type TransitionState =
  | { status: "idle" }
  | { status: "armed"; scene: string; dueAt: number; quantize: QuantizeKind }
  | { status: "executing"; scene: string };

const colors = ["#38bdf8", "#f472b6", "#22d3ee", "#f97316", "#a3e635", "#c084fc", "#facc15", "#fb7185"];

export function StagePage({ clock, snapshots, activeSnapshot, onSelectSnapshot }: StagePageProps) {
  const [quantize, setQuantize] = useState<QuantizeKind>("bar");
  const [transition, setTransition] = useState<TransitionState>({ status: "idle" });
  const timerRef = useRef<number | null>(null);

  const phase = useMemo(() => describePhase(clock), [clock]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const armScene = (scene: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const launch = quantizeLaunch(clock, quantize);
    if (launch.delayMs <= 0 || clock.stale) {
      executeScene(scene);
      return;
    }

    setTransition({ status: "armed", scene, dueAt: launch.dueAt, quantize });
    timerRef.current = window.setTimeout(() => {
      executeScene(scene);
    }, launch.delayMs);
  };

  const executeScene = (scene: string) => {
    setTransition({ status: "executing", scene });
    onSelectSnapshot(scene);
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
            <button
              key={scene}
              onClick={() => armScene(scene)}
              style={{
                ...styles.card,
                borderColor: color,
                background: isActive ? `${color}22` : "#0b1220",
                boxShadow: isExecuting ? `0 0 18px ${color}88` : "none"
              }}
            >
              <div style={styles.cardTitle}>{scene}</div>
              <div style={{ color, fontSize: 12 }}>{isActive ? "Active" : isArmed ? "Armed" : "Ready"}</div>
            </button>
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
    cursor: "pointer",
    transition: "all 0.15s",
    color: "inherit"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8
  }
};
