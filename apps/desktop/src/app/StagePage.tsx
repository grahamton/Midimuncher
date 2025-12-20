import { useEffect, useMemo, useState } from "react";
import { Activity, RefreshCw, Waves } from "lucide-react";
import { Fader, Knob } from "./components/controls";

type MacroStrip = {
  id: string;
  name: string;
  color: string;
  macros: {
    level: number;
    tone: number;
    fx: number;
    send: number;
  };
};

type StageState = {
  global: {
    drive: number;
    space: number;
    grit: number;
    master: number;
  };
  instruments: MacroStrip[];
};

type SceneTemplate = {
  id: string;
  name: string;
  tag: string;
  durationSec: number;
  target: StageState;
};

type TransitionState = {
  sceneId: string;
  start: number;
  durationMs: number;
  from: StageState;
  to: StageState;
};

function cloneState(state: StageState): StageState {
  return {
    global: { ...state.global },
    instruments: state.instruments.map((inst) => ({
      ...inst,
      macros: { ...inst.macros }
    }))
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateState(from: StageState, to: StageState, t: number): StageState {
  const map = new Map(to.instruments.map((inst) => [inst.id, inst]));

  return {
    global: {
      drive: lerp(from.global.drive, to.global.drive, t),
      space: lerp(from.global.space, to.global.space, t),
      grit: lerp(from.global.grit, to.global.grit, t),
      master: lerp(from.global.master, to.global.master, t)
    },
    instruments: from.instruments.map((inst) => {
      const target = map.get(inst.id) ?? inst;
      return {
        ...inst,
        macros: {
          level: lerp(inst.macros.level, target.macros.level, t),
          tone: lerp(inst.macros.tone, target.macros.tone, t),
          fx: lerp(inst.macros.fx, target.macros.fx, t),
          send: lerp(inst.macros.send, target.macros.send, t)
        }
      };
    })
  };
}

const baseInstruments: MacroStrip[] = [
  {
    id: "pad",
    name: "Wavetable Pad",
    color: "#60a5fa",
    macros: { level: 0.55, tone: 0.42, fx: 0.48, send: 0.52 }
  },
  {
    id: "bass",
    name: "Bass Synth",
    color: "#34d399",
    macros: { level: 0.62, tone: 0.38, fx: 0.35, send: 0.28 }
  },
  {
    id: "lead",
    name: "Lead",
    color: "#f472b6",
    macros: { level: 0.51, tone: 0.6, fx: 0.55, send: 0.46 }
  }
];

const scenes: SceneTemplate[] = [
  {
    id: "drop",
    name: "The Drop",
    tag: "Push subs + open filter",
    durationSec: 8,
    target: {
      global: { drive: 0.82, space: 0.32, grit: 0.54, master: 0.9 },
      instruments: [
        { ...baseInstruments[0], macros: { level: 0.65, tone: 0.55, fx: 0.52, send: 0.6 } },
        { ...baseInstruments[1], macros: { level: 0.92, tone: 0.62, fx: 0.42, send: 0.32 } },
        { ...baseInstruments[2], macros: { level: 0.7, tone: 0.75, fx: 0.65, send: 0.58 } }
      ]
    }
  },
  {
    id: "break",
    name: "Breathe",
    tag: "Spacey breakdown",
    durationSec: 10,
    target: {
      global: { drive: 0.38, space: 0.78, grit: 0.32, master: 0.62 },
      instruments: [
        { ...baseInstruments[0], macros: { level: 0.48, tone: 0.32, fx: 0.7, send: 0.72 } },
        { ...baseInstruments[1], macros: { level: 0.42, tone: 0.22, fx: 0.4, send: 0.35 } },
        { ...baseInstruments[2], macros: { level: 0.55, tone: 0.48, fx: 0.72, send: 0.64 } }
      ]
    }
  },
  {
    id: "lift",
    name: "Lift",
    tag: "Build with tension",
    durationSec: 6,
    target: {
      global: { drive: 0.68, space: 0.45, grit: 0.74, master: 0.84 },
      instruments: [
        { ...baseInstruments[0], macros: { level: 0.72, tone: 0.58, fx: 0.62, send: 0.66 } },
        { ...baseInstruments[1], macros: { level: 0.7, tone: 0.48, fx: 0.38, send: 0.35 } },
        { ...baseInstruments[2], macros: { level: 0.82, tone: 0.78, fx: 0.58, send: 0.52 } }
      ]
    }
  }
];

export function StagePage() {
  const initialState: StageState = useMemo(
    () => ({
      global: { drive: 0.5, space: 0.5, grit: 0.5, master: 0.72 },
      instruments: baseInstruments
    }),
    []
  );

  const [macroState, setMacroState] = useState<StageState>(initialState);
  const [transition, setTransition] = useState<TransitionState | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [clockLinked, setClockLinked] = useState(true);
  const [driftMs, setDriftMs] = useState(2.4);

  const setGlobalMacro = (key: keyof StageState["global"], value: number) => {
    setMacroState((prev) => ({
      ...prev,
      global: { ...prev.global, [key]: value }
    }));
  };

  const setInstrumentMacro = (id: string, key: keyof MacroStrip["macros"], value: number) => {
    setMacroState((prev) => ({
      ...prev,
      instruments: prev.instruments.map((inst) =>
        inst.id === id ? { ...inst, macros: { ...inst.macros, [key]: value } } : inst
      )
    }));
  };

  useEffect(() => {
    if (!transition) return;
    let frame: number;

    const loop = (ts: number) => {
      const elapsed = ts - transition.start;
      const t = Math.min(elapsed / transition.durationMs, 1);
      setProgress(t);
      setMacroState(interpolateState(transition.from, transition.to, t));

      if (t < 1) {
        frame = requestAnimationFrame(loop);
      } else {
        setTransition(null);
      }
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [transition]);

  const launchScene = (scene: SceneTemplate) => {
    setActiveSceneId(scene.id);
    setProgress(0);
    setTransition({
      sceneId: scene.id,
      start: performance.now(),
      durationMs: scene.durationSec * 1000,
      from: cloneState(macroState),
      to: cloneState(scene.target)
    });
  };

  const pendingScene = scenes.find((s) => s.id === activeSceneId);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr 280px",
        gap: 24,
        height: "100%"
      }}
    >
      <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Waves size={18} color="#38bdf8" />
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Scenes
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#e2e8f0" }}>Performance deck</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            const pct = isActive && transition ? Math.round(progress * 100) : 0;
            return (
              <button
                key={scene.id}
                onClick={() => launchScene(scene)}
                style={{
                  textAlign: "left",
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                  padding: 12,
                  background: isActive ? "linear-gradient(120deg,#0ea5e9,#312e81)" : "#0b1220",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
                  transition: "border-color 0.2s, transform 0.15s",
                  transform: isActive ? "translateY(-1px)" : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 700 }}>{scene.name}</div>
                  <span style={{ fontSize: 12, color: "#bfdbfe" }}>{scene.durationSec}s</span>
                </div>
                <div style={{ fontSize: 13, color: isActive ? "#e0f2fe" : "#94a3b8", marginTop: 4 }}>
                  {scene.tag}
                </div>
                {isActive ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 6, background: "#0b1220", borderRadius: 999, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "rgba(226, 232, 240, 0.85)",
                          transition: "width 0.2s"
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>Transitioning… {pct}%</div>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Macro Columns
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
              {pendingScene ? pendingScene.name : "Live State"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#cbd5e1" }}>
            <Activity size={16} />
            <span style={{ fontSize: 13 }}>{Math.round(macroState.global.master * 100)}% master</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
          <Fader
            label="Drive"
            value={macroState.global.drive}
            onChange={(next) => setGlobalMacro("drive", next)}
            color="#f97316"
          />
          <Fader
            label="Space"
            value={macroState.global.space}
            onChange={(next) => setGlobalMacro("space", next)}
            color="#38bdf8"
          />
          <Fader
            label="Grit"
            value={macroState.global.grit}
            onChange={(next) => setGlobalMacro("grit", next)}
            color="#a855f7"
          />
          <Fader
            label="Master"
            value={macroState.global.master}
            onChange={(next) => setGlobalMacro("master", next)}
            color="#22d3ee"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {macroState.instruments.map((inst) => (
            <div
              key={inst.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 10,
                padding: 12,
                background: "#0b1220",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 999, background: inst.color }} />
                  <div style={{ color: "#e2e8f0", fontWeight: 600 }}>{inst.name}</div>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{Math.round(inst.macros.level * 100)}%</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                <Knob
                  label="Level"
                  value={inst.macros.level}
                  onChange={(next) => setInstrumentMacro(inst.id, "level", next)}
                  color={inst.color}
                />
                <Knob
                  label="Tone"
                  value={inst.macros.tone}
                  onChange={(next) => setInstrumentMacro(inst.id, "tone", next)}
                  color="#fbbf24"
                />
                <Knob
                  label="FX"
                  value={inst.macros.fx}
                  onChange={(next) => setInstrumentMacro(inst.id, "fx", next)}
                  color="#22d3ee"
                />
                <Knob
                  label="Send"
                  value={inst.macros.send}
                  onChange={(next) => setInstrumentMacro(inst.id, "send", next)}
                  color="#c084fc"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              OXI Sync
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0" }}>
              Clock + transport
            </div>
          </div>
          <button
            onClick={() => setClockLinked((v) => !v)}
            style={{
              borderRadius: 8,
              border: "1px solid #1f2937",
              background: clockLinked ? "#064e3b" : "#3f1d2e",
              color: clockLinked ? "#bbf7d0" : "#fecdd3",
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            {clockLinked ? "Linked" : "Link"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <div style={{ border: "1px solid #1f2937", borderRadius: 10, padding: 12, background: "#0b1220" }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 6 }}>Clock drift</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Knob
                label={"ms"}
                value={Math.min(driftMs / 12, 1)}
                onChange={(next) => setDriftMs(Number((next * 12).toFixed(1)))}
                color="#38bdf8"
              />
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 700 }}>{driftMs.toFixed(1)} ms</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>vs OXI clock</div>
              </div>
            </div>
          </div>
          <div style={{ border: "1px solid #1f2937", borderRadius: 10, padding: 12, background: "#0b1220" }}>
            <div style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 6 }}>Transport</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={16} color="#22d3ee" />
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 700 }}>Bar sync locked</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>Listening for start/stop</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, borderTop: "1px solid #1f2937", paddingTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#cbd5e1", fontSize: 13 }}>Last sync event</span>
            <span style={{ color: "#e2e8f0", fontWeight: 700 }}>-3.1 ms</span>
          </div>
          <div style={{ height: 6, background: "#0b1220", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min(100, (Math.abs(driftMs) / 12) * 100)}%`, background: "#22d3ee" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
