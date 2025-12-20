import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getInstrumentProfile } from "@midi-playground/core";
import type { DeviceConfig } from "../../shared/projectTypes";
import type { BridgeClock } from "../services/midiBridge";
import type { SnapshotQuantizeKind, SnapshotQueueStatus } from "../../shared/ipcTypes";
import { describePhase, quantizeLaunch, type QuantizeKind } from "./lib/stage/transition";

export type StagePageProps = {
  clock: BridgeClock;
  queueStatus: SnapshotQueueStatus | null;
  snapshots: string[];
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string, quantize: SnapshotQuantizeKind) => void;
  onDrop: (name: string) => void;
  devices: DeviceConfig[];
  onSendCc: (deviceId: string, cc: number, val: number) => void;
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
  queueStatus,
  snapshots,
  activeSnapshot,
  onSelectSnapshot,
  onDrop,
  devices,
  onSendCc,
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
  const queueProgress = useMemo(() => {
    const timing = queueStatus?.timing;
    if (!timing?.boundaryTicks || !timing?.dueTick) return null;
    const remaining = timing.dueTick - timing.tickCount;
    if (!Number.isFinite(remaining)) return null;
    const progress = 1 - remaining / timing.boundaryTicks;
    return Math.min(Math.max(progress, 0), 1);
  }, [queueStatus]);

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

  const rig = useMemo(() => {
    const lanes = [1, 2, 3, 4];
    return lanes.map((lane) => devices.find((d) => d.lane === lane) ?? null);
  }, [devices]);
  const [ccValues, setCcValues] = useState<Record<string, number>>({});
  const throttleRef = useRef<Map<string, { lastAt: number; timer: number | null }>>(new Map());

  const setCc = (deviceId: string, cc: number, next: number) => {
    const key = `${deviceId}:${cc}`;
    const clamped = Math.min(Math.max(Math.round(next), 0), 127);
    setCcValues((current) => ({ ...current, [key]: clamped }));

    const now = performance.now();
    const slot = throttleRef.current.get(key) ?? { lastAt: 0, timer: null };
    const minInterval = 20;
    const delta = now - slot.lastAt;

    const send = () => {
      slot.lastAt = performance.now();
      if (slot.timer != null) {
        window.clearTimeout(slot.timer);
        slot.timer = null;
      }
      throttleRef.current.set(key, slot);
      onSendCc(deviceId, cc, clamped);
    };

    if (delta >= minInterval) {
      send();
      return;
    }
    if (slot.timer != null) window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(send, Math.max(1, Math.round(minInterval - delta)));
    throttleRef.current.set(key, slot);
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

  const queueLine = (() => {
    const headName = queueStatus?.activeSnapshotName ?? null;
    const qLen = queueStatus?.queueLength ?? 0;
    if (!headName || qLen <= 0) return <span style={{ ...styles.badge, background: "#1f2937", color: "#cbd5e1" }}>Queue idle</span>;
    const suffix = queueStatus?.executing ? "Sending" : queueStatus?.armed ? "Armed" : "Queued";
    return (
      <span style={{ ...styles.badge, background: "#0f172a", color: "#e2e8f0", border: "1px solid #1e293b" }}>
        {suffix}: {headName} (q={qLen})
      </span>
    );
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
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            {queueLine}
            <div style={{ ...styles.phaseTrack, width: 220 }} title="Next scheduled boundary (from queue timing)">
              <div
                style={{
                  ...styles.phaseFill,
                  width: `${Math.round(((queueProgress ?? phase.phase) || 0) * 100)}%`,
                  background: "linear-gradient(90deg, #f97316, #22c55e)"
                }}
              />
            </div>
            <span style={styles.meta}>
              {queueStatus?.timing?.dueInMs != null ? `Next in ~${Math.round(queueStatus.timing.dueInMs)}ms` : ""}
            </span>
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

      <div style={{ ...styles.panel, marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 800, letterSpacing: "0.06em", color: "#cbd5e1" }}>Rig strips (send-only)</div>
          <div style={styles.meta}>
            Instruments don’t need MIDI OUT connected; strips use your configured device instrument + CC map and send to its output.
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {rig.map((d, idx) => {
            if (!d) {
              return (
                <div
                  key={`lane-${idx + 1}`}
                  style={{
                    border: "1px solid #1f2937",
                    borderRadius: 12,
                    padding: 12,
                    background: "#0b1220",
                    opacity: 0.75
                  }}
                >
                  <div style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Lane {idx + 1}
                  </div>
                  <div style={{ fontWeight: 800, color: "#e2e8f0", marginTop: 4 }}>Unassigned</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                    Assign a device to Lane {idx + 1} in the Setup tab.
                  </div>
                </div>
              );
            }

            const profile = getInstrumentProfile(d.instrumentId);
            const ccList = (profile?.cc ?? []).slice(0, 3);
            const outputOk = Boolean(d.outputId);
            return (
              <div
                key={d.id}
                style={{
                  border: "1px solid #1f2937",
                  borderRadius: 12,
                  padding: 12,
                  background: "#0b1220"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                      Lane {idx + 1}
                    </div>
                    <div style={{ fontWeight: 800, color: "#e2e8f0" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {profile ? profile.name : "No instrument selected"} · Ch {d.channel} · Out {d.outputId ?? "unassigned"}
                    </div>
                  </div>
                  <div
                    style={{
                      ...styles.pill,
                      background: outputOk ? "#22c55e22" : "#ef444422",
                      border: `1px solid ${outputOk ? "#22c55e55" : "#ef444455"}`,
                      color: outputOk ? "#86efac" : "#fecaca"
                    }}
                    title={outputOk ? "Output assigned" : "No output port assigned"}
                  >
                    {outputOk ? "Wired" : "No out"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                  {ccList.length ? (
                    ccList.map((cc) => {
                      const key = `${d.id}:${cc.cc}`;
                      const value = ccValues[key] ?? 0;
                      return (
                        <label key={cc.cc} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#cbd5e1" }}>
                            <span>
                              {cc.label} (CC {cc.cc})
                            </span>
                            <span style={{ color: "#94a3b8" }}>{value}</span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={127}
                            value={value}
                            onChange={(e) => setCc(d.id, cc.cc, Number(e.target.value))}
                            disabled={!outputOk}
                          />
                        </label>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      No CC map found for this instrument. Assign an instrument in Setup/Devices to enable quick controls.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
  panel: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 14,
    background: "#0b1220"
  },
  pill: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800
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
