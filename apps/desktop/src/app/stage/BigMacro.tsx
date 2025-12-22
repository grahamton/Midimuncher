import { useRef, useEffect } from "react";

type BigMacroProps = {
  id: string;
  label: string;
  value: number; // 0-127
  onChange: (val: number) => void;
  color?: string;
  locked?: boolean;
};

export function BigMacro({
  id,
  label,
  value,
  onChange,
  color = "#38bdf8", // Neon Blue default
  locked = false,
}: BigMacroProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Wheel handler for "Hover + Scroll" interaction
  useEffect(() => {
    const el = ref.current;
    if (!el || locked) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // DeltaY is usually +/- 100 per tick.
      // We want a smooth but reasonably fast scroll.
      // Let's say 127 range. 1 tick = +/- 2 seems okay for coarse.
      const direction = e.deltaY > 0 ? -1 : 1;
      const step = e.shiftKey ? 1 : 4; // Shift for fine control
      const next = Math.min(Math.max(value + direction * step, 0), 127);
      onChange(next);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [value, onChange, locked]);

  // Prevent dragging if locked/Stage mode requires it
  const handlePointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    // In stage mode, we primarily scroll.
    // But maybe we allow drag too? Plan said "No Dragging".
    // So we do nothing here, or strictly prevent default to stop selecting text.
    e.preventDefault();
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!locked) onChange(0); // Reset to 0? Or maybe 64? Defaulting to 0 for now.
  };

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onContextMenu={handleRightClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#0a0a0a",
        border: `2px solid ${locked ? "#222" : color}`,
        borderRadius: 16,
        position: "relative",
        boxShadow: `0 0 10px ${color}22`,
        transition: "border-color 0.2s, box-shadow 0.2s",
        cursor: locked ? "not-allowed" : "ns-resize",
        userSelect: "none",
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: color,
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      {/* Giant Value */}
      <div
        style={{ fontSize: 64, fontWeight: 900, color: "#fff", lineHeight: 1 }}
      >
        {Math.round(value)}
      </div>

      {/* Bar graph visual at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 12,
          background: "#1a1a1a",
          borderRadius: "0 0 12px 12px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${(value / 127) * 100}%`,
            height: "100%",
            background: color,
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {locked && (
        <div style={{ position: "absolute", top: 8, right: 8, color: "#444" }}>
          🔒
        </div>
      )}
    </div>
  );
}
