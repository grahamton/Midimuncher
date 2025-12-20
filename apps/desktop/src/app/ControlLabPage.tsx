import { useMemo, useRef, useState } from "react";
import { Crossfader, Fader, Knob, PadButton, StepGrid } from "@midi-playground/ui";

export function ControlLabPage() {
  const [vertFader, setVertFader] = useState(0.35);
  const [horizFader, setHorizFader] = useState(0.5);
  const [macro, setMacro] = useState(0.42);
  const [knob, setKnob] = useState(0.2);
  const [cross, setCross] = useState(0.5);
  const [pads, setPads] = useState([false, false]);
  const [steps, setSteps] = useState(Array.from({ length: 16 }, (_, idx) => (idx % 4 === 0 ? 1 : 0)));
  const [rateLimitMs, setRateLimitMs] = useState(10);
  const lastSendRef = useRef<number>(performance.now());
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sentMacro, setSentMacro] = useState(macro);

  const targets = useMemo(
    () => [
      { id: "cutoff", label: "Cutoff", min: 20, max: 127, curve: "linear" as CurveKind, color: "#38bdf8" },
      { id: "resonance", label: "Resonance", min: 0, max: 90, curve: "exponential" as CurveKind, color: "#f472b6" },
      { id: "env", label: "Env Amt", min: 10, max: 110, curve: "inverse" as CurveKind, color: "#22d3ee" }
    ],
    []
  );

  const mappedTargets = useMemo(
    () =>
      targets.map((t) => ({
        ...t,
        value: applyCurve(sentMacro, t.min, t.max, t.curve)
      })),
    [sentMacro, targets]
  );

  const handleMacroChange = (next: number) => {
    setMacro(next);
    const now = performance.now();
    const delta = now - lastSendRef.current;
    if (delta >= rateLimitMs) {
      lastSendRef.current = now;
      setSentMacro(next);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    } else {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = setTimeout(() => {
        lastSendRef.current = performance.now();
        setSentMacro(next);
        throttleTimerRef.current = null;
      }, rateLimitMs - delta);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ margin: 0, color: "#38bdf8", letterSpacing: "0.1em", fontSize: 12 }}>SURFACE LAB</p>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>Control primitives</h1>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", maxWidth: 720 }}>
            Drag to test coarse/fine gestures (hold Shift for fine). Components are controlled and reflect incoming value
            updates for bi-directional feedback. Colors hint at grouping/macro use.
          </p>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 12 }}>
          <div>Shift = fine drag</div>
          <div>Vertical = Y drag, Horizontal = X drag</div>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        <Card title="Faders (vertical)">
          <div style={{ display: "flex", gap: 16 }}>
            <Fader label="Cutoff" value={vertFader} onChange={setVertFader} size="md" color="#38bdf8" />
            <Fader label="Resonance" value={macro} onChange={setMacro} size="lg" color="#f472b6" />
          </div>
        </Card>

        <Card title="Faders (horizontal)">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Fader orientation="horizontal" label="Macro A" value={horizFader} onChange={setHorizFader} color="#22d3ee" />
            <Fader orientation="horizontal" label="Macro B" value={macro} onChange={setMacro} color="#f97316" />
          </div>
        </Card>

        <Card title="Knobs">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <Knob label="Timbre" value={knob} onChange={setKnob} size="md" color="#f472b6" />
            <Knob label="Drive" value={macro} onChange={setMacro} size="lg" color="#38bdf8" />
          </div>
        </Card>

        <Card title="Crossfader + pads">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Crossfader label="Morph" value={cross} onChange={setCross} color="#f97316" />
            <div style={{ display: "flex", gap: 10 }}>
              <PadButton label="DROP" active={pads[0]} onToggle={() => togglePad(0, pads, setPads)} color="#38bdf8" />
              <PadButton label="RISE" active={pads[1]} onToggle={() => togglePad(1, pads, setPads)} color="#f472b6" />
            </div>
          </div>
        </Card>

        <Card title="Step grid">
          <StepGrid
            rows={4}
            cols={4}
            values={steps}
            onChange={(values) => setSteps(values.map((v) => (v ? 1 : 0) as 1 | 0))}
          />
        </Card>

        <Card title="Macro multi-bind + rate limit">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Fader orientation="horizontal" label="Macro send" value={macro} onChange={handleMacroChange} color="#22d3ee" />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {mappedTargets.map((t) => (
                <div
                  key={t.id}
                  style={{
                    minWidth: 160,
                    padding: 10,
                    borderRadius: 10,
                    border: `1px solid ${t.color}55`,
                    background: "#0f172a",
                    color: "#e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: t.color }}>{t.label}</strong>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{t.curve}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                    {Math.round(t.value)} (range {t.min}-{t.max})
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{ color: "#94a3b8", fontSize: 12 }}>Rate limit (ms)</label>
              <input
                type="number"
                min={1}
                max={200}
                value={rateLimitMs}
                onChange={(e) => setRateLimitMs(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                style={{
                  width: 80,
                  background: "#0f172a",
                  border: "1px solid #1f2937",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  padding: "6px 8px"
                }}
              />
              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                Last sent: {Math.round(sentMacro * 100)}% (throttled)
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#0b1220",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
      }}
    >
      <div style={{ color: "#cbd5e1", fontSize: 13, fontWeight: 600 }}>{title}</div>
      {children}
    </div>
  );
}

function togglePad(idx: number, pads: boolean[], setPads: (next: boolean[]) => void) {
  const next = [...pads];
  next[idx] = !next[idx];
  setPads(next);
}

type CurveKind = "linear" | "inverse" | "exponential" | "log";

function applyCurve(norm: number, min: number, max: number, curve: CurveKind) {
  const clamped = Math.min(Math.max(norm, 0), 1);
  const span = max - min;
  switch (curve) {
    case "inverse": {
      const v = 1 - clamped;
      return min + v * span;
    }
    case "exponential": {
      const shaped = Math.pow(clamped, 2);
      return min + shaped * span;
    }
    case "log": {
      const shaped = Math.log10(1 + clamped * 9); // log curve from 0-1
      return min + shaped * span;
    }
    case "linear":
    default:
      return min + clamped * span;
  }
}
