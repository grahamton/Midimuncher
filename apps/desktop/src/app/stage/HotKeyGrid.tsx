import { useEffect, useState } from "react";

// The mapped keys in order of the 4x4 grid (0-15)
// Row 1: 1 2 3 4
// Row 2: Q W E R
// Row 3: A S D F
// Row 4: Z X C V
const KEY_MAP = [
  "1",
  "2",
  "3",
  "4",
  "q",
  "w",
  "e",
  "r",
  "a",
  "s",
  "d",
  "f",
  "z",
  "x",
  "c",
  "v",
];

const DISPLAY_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "Q",
  "W",
  "E",
  "R",
  "A",
  "S",
  "D",
  "F",
  "Z",
  "X",
  "C",
  "V",
];

type HotKeyGridProps = {
  snapshots: string[]; // Names of snapshots in slots 0-15
  activeSnapshot: string | null; // Name of currently playing snapshot
  queuedSnapshot: string | null; // Name of queued snapshot
  onQueue: (name: string) => void;
  onDrop: () => void; // Triggered by Spacebar
  locked?: boolean;
};

export function useKeyboardGrid(
  onQueue: (idx: number) => void,
  onDrop: () => void,
  locked: boolean
) {
  useEffect(() => {
    if (locked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is typing in an input, ignore (though Stage Mode shouldn't have inputs)
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if (e.code === "Space") {
        e.preventDefault();
        onDrop();
        return;
      }

      const key = e.key.toLowerCase();
      const idx = KEY_MAP.indexOf(key);
      if (idx !== -1) {
        onQueue(idx);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onQueue, onDrop, locked]);
}

export function HotKeyGrid({
  snapshots,
  activeSnapshot,
  queuedSnapshot,
  onQueue,
  onDrop,
  locked = false,
}: HotKeyGridProps) {
  // We need to map slot index -> snapshot name
  // Assuming 'snapshots' array is ordered 0-15 corresponding to slots.
  // If the array is just names, we blindly map index.

  const handleQueue = (idx: number) => {
    if (idx < snapshots.length) {
      onQueue(snapshots[idx]);
    }
  };

  useKeyboardGrid(handleQueue, onDrop, locked);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gridTemplateRows: "repeat(4, 1fr)",
        gap: 12,
        width: "100%",
        height: "100%",
      }}
    >
      {Array.from({ length: 16 }).map((_, idx) => {
        const name = snapshots[idx] || "Empty";
        const isEmpty = !snapshots[idx];
        const isActive = name === activeSnapshot;
        const isQueued = name === queuedSnapshot;
        const hotKey = DISPLAY_KEYS[idx];

        // "Neon" styling logic
        let borderColor = "#333";
        let bgColor = "#111";
        let textColor = "#555";

        if (isActive) {
          borderColor = "#22d3ee"; // Cyan
          bgColor = "#22d3ee";
          textColor = "#000";
        } else if (isQueued) {
          borderColor = "#f472b6"; // Pink
          textColor = "#f472b6"; // Outline style
          // Blink animation handled via class or simple JS toggling?
          // Inline style blink is tricky. Let's just use a high-contrast outline.
        } else if (!isEmpty) {
          borderColor = "#444";
          textColor = "#fff";
        }

        return (
          <div
            key={idx}
            onPointerDown={() => !locked && handleQueue(idx)}
            style={{
              border: `2px solid ${borderColor}`,
              background: bgColor,
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              cursor: isEmpty || locked ? "default" : "pointer",
              opacity: isEmpty ? 0.3 : 1,
              animation: isQueued ? "pulse 0.5s infinite alternate" : "none",
            }}
          >
            {/* Hotkey Overlay */}
            <div
              style={{
                position: "absolute",
                top: 4,
                left: 8,
                fontSize: 12,
                fontWeight: 800,
                color: isActive ? "#000" : "#666",
                opacity: 0.8,
              }}
            >
              {hotKey}
            </div>

            {/* Snapshot Name */}
            <div
              style={{
                color: textColor,
                fontWeight: 600,
                fontSize: 14,
                textAlign: "center",
                padding: "0 4px",
                wordBreak: "break-word",
              }}
            >
              {name}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse {
            from { background: transparent; }
            to { background: rgba(244, 114, 182, 0.2); }
        }
      `}</style>
    </div>
  );
}
