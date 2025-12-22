import { useEffect, useState, useMemo } from "react";
import type { DeviceConfig } from "../../shared/projectTypes";
import type { BridgeClock } from "../services/midiBridge";
import type {
  SnapshotQuantizeKind,
  SnapshotQueueStatus,
} from "../../shared/ipcTypes";
import { BigMacro } from "./stage/BigMacro";
import { HotKeyGrid } from "./stage/HotKeyGrid";
import { quantizeLaunch } from "./lib/stage/transition";

export type StagePageProps = {
  clock: BridgeClock;
  queueStatus: SnapshotQueueStatus | null;
  snapshots: string[]; // Names of snapshots
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string, quantize: SnapshotQuantizeKind) => void; // Standard select
  onDrop: (name: string) => void;
  devices: DeviceConfig[];
};

// Update Props to include Controls for Macros
export type ExtendedStagePageProps = StagePageProps & {
  controls?: import("@midi-playground/core").ControlElement[];
  onUpdateControl?: (id: string, partial: any) => void;
  onEmitControl?: (control: any, val: number) => void;
};

export function StagePage({
  clock,
  queueStatus,
  snapshots,
  activeSnapshot,
  onSelectSnapshot,
  onDrop,
  devices,
  controls = [],
  onUpdateControl,
  onEmitControl,
  onExit,
}: ExtendedStagePageProps & { onExit?: () => void }) {
  const [queuedScene, setQueuedScene] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  // Keyboard Lock listener
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Toggle Lock
      if (e.ctrlKey && e.code === "KeyL") {
        e.preventDefault();
        setLocked((l) => !l);
      }
      // Escape to Exit
      if (e.code === "Escape" && onExit) {
        onExit();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

  // ... (handlers omitted, they are unchanged)
  // Re-declaring handlers to keep the file valid if replace_file_content needs context?
  // I will assume I can just replace the top part and the map loop separately?
  // No, replace_file_content works on contiguous blocks.
  // I must be careful.
  // The 'macros' logic is inside the component body, I probably shouldn't replace the function signature AND the map loop in one go if they are far apart.
  // The file is small enough (230 lines).
  // I will replace the signature first.

  const handleQueue = (name: string) => {
    setQueuedScene(name);
  };

  const handleDrop = () => {
    if (queuedScene) {
      onDrop(queuedScene);
      setQueuedScene(null);
    }
  };

  // Filter macros
  const macros = useMemo(() => {
    return controls.slice(0, 8);
  }, [controls]);

  // Bar progress
  const barProgress = useMemo(() => {
    if (!clock.running) return 0;
    const ticksPerBar = clock.ppqn * 4;
    return (clock.tickCount % ticksPerBar) / ticksPerBar;
  }, [clock.tickCount, clock.ppqn, clock.running]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "60px 1fr 1fr",
        height: "100%",
        width: "100%",
        background: "#000",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
        padding: 20,
        gap: 20,
      }}
    >
      {/* --- TOP BAR --- */}
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {/* EXIT BUTTON */}
        <button
          onClick={onExit}
          style={{
            background: "#333",
            border: "none",
            color: "#ccc",
            padding: "8px 16px",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          EXIT
        </button>

        {/* BPM */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: clock.running ? "#22d3ee" : "#555",
            width: 120,
            textAlign: "center",
          }}
        >
          {Math.round(clock.bpm ?? 120)}{" "}
          <span style={{ fontSize: 16 }}>BPM</span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            flex: 1,
            height: 32,
            background: "#111",
            borderRadius: 16,
            overflow: "hidden", // ...
            position: "relative", // ...
          }}
        >
          <div
            style={{
              width: `${barProgress * 100}%`,
              height: "100%",
              background: "#333",
              transition: "width 0.1s linear",
            }}
          />
          {queueStatus?.queueLength ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                background:
                  "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(34, 211, 238, 0.2) 10px, rgba(34, 211, 238, 0.2) 20px)",
              }}
            />
          ) : null}
        </div>

        {/* Lock Icon */}
        <div
          onClick={() => setLocked(!locked)}
          style={{
            fontSize: 24,
            cursor: "pointer",
            color: locked ? "#ef4444" : "#444",
          }}
        >
          {locked ? "🔒 LOCKED" : "🔓"}
        </div>
      </div>

      {/* --- MACROS --- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          alignContent: "center",
        }}
      >
        {macros.map((c, i) => {
          // Neon Palette
          const neonColors = [
            "#f472b6",
            "#22d3ee",
            "#a78bfa",
            "#4ade80",
            "#fbbf24",
            "#f87171",
            "#e879f9",
            "#2dd4bf",
          ];
          const color = neonColors[i % neonColors.length];

          return (
            <BigMacro
              key={c.id}
              id={c.id}
              label={c.label || `Macro ${i + 1}`}
              value={c.value}
              onChange={(val) => {
                if (onUpdateControl && onEmitControl) {
                  onUpdateControl(c.id, { value: val });
                  onEmitControl({ ...c, value: val }, val);
                }
              }}
              color={color}
              locked={locked}
            />
          );
        })}
        {macros.length === 0 && (
          <div
            style={{ gridColumn: "span 4", textAlign: "center", color: "#333" }}
          >
            No Macros Found in Controller
          </div>
        )}
      </div>

      {/* --- GRID (Bottom) --- */}
      <div style={{ minHeight: 0 }}>
        <HotKeyGrid
          snapshots={snapshots}
          activeSnapshot={activeSnapshot}
          queuedSnapshot={queuedScene}
          onQueue={handleQueue}
          onDrop={handleDrop}
          locked={locked}
        />
      </div>
    </div>
  );
}
