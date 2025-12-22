import { useMemo, useRef } from "react";
import type { PointerEvent, CSSProperties } from "react";

type DragControlProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  coarseStep?: number;
  fineStep?: number;
};

type FaderProps = DragControlProps & {
  label?: string;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md" | "lg";
  color?: string;
  fill?: boolean;
  style?: CSSProperties;
};

type KnobProps = DragControlProps & {
  label?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
  style?: CSSProperties;
};

type CrossfaderProps = DragControlProps & {
  label?: string;
  color?: string;
  style?: CSSProperties;
};

type PadButtonProps = {
  label: string;
  active: boolean;
  onToggle: () => void;
  color?: string;
  style?: CSSProperties;
};

type StepGridProps = {
  rows: number;
  cols: number;
  values: number[];
  onChange: (values: number[]) => void;
  color?: string;
  style?: CSSProperties;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useDragValue({
  value,
  onChange,
  min = 0,
  max = 1,
  coarseStep = 0.004,
  fineStep = 0.001,
  axis = "vertical",
}: DragControlProps & { axis?: "vertical" | "horizontal" }) {
  const lastValueRef = useRef(value);
  const pointerRef = useRef<number | null>(null);

  const startDrag = (e: PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerRef.current = e.pointerId;
    lastValueRef.current = value;
  };

  const moveDrag = (e: PointerEvent) => {
    if (pointerRef.current !== e.pointerId) return;
    const delta = axis === "vertical" ? -e.movementY : e.movementX;
    const step = e.shiftKey ? fineStep : coarseStep;
    const next = clamp(lastValueRef.current + delta * step, min, max);
    lastValueRef.current = next;
    onChange(next);
  };

  const endDrag = (e: PointerEvent) => {
    if (pointerRef.current !== e.pointerId) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    pointerRef.current = null;
  };

  return { startDrag, moveDrag, endDrag };
}

export function Fader({
  label,
  value,
  onChange,
  orientation = "vertical",
  size = "md",
  color = "#38bdf8",
  fill = true,
  style,
  ...rest
}: FaderProps) {
  const axis = orientation === "vertical" ? "vertical" : "horizontal";
  const { startDrag, moveDrag, endDrag } = useDragValue({
    value,
    onChange,
    axis,
    ...rest,
  });

  const defaultDims = useMemo(() => {
    switch (size) {
      case "sm":
        return orientation === "vertical"
          ? { width: 56, height: 140 }
          : { width: 180, height: 40 };
      case "lg":
        return orientation === "vertical"
          ? { width: 72, height: 220 }
          : { width: 260, height: 52 };
      default:
        return orientation === "vertical"
          ? { width: 64, height: 180 }
          : { width: 220, height: 46 };
    }
  }, [orientation, size]);

  const handlePosition = (axis === "vertical" ? 1 - value : value) * 100;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
        ...style,
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          width: style?.width ?? defaultDims.width,
          height: style?.height ?? defaultDims.height,
          borderRadius: 10,
          background: "#0f172a",
          border: "1px solid #1f2937",
          padding: orientation === "vertical" ? "10px 20px" : "16px 10px",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: orientation === "vertical" ? 8 : "50%",
            bottom: orientation === "vertical" ? 8 : "50%",
            left: orientation === "vertical" ? "50%" : 8,
            right: orientation === "vertical" ? "50%" : 8,
            width: orientation === "vertical" ? 2 : undefined,
            height: orientation === "vertical" ? undefined : 2,
            background: "#1f2937",
            transform:
              orientation === "vertical"
                ? "translateX(-50%)"
                : "translateY(-50%)",
          }}
        />
        {fill ? (
          <div
            style={{
              position: "absolute",
              left: orientation === "vertical" ? "50%" : 8,
              right: orientation === "vertical" ? "50%" : 8,
              bottom: orientation === "vertical" ? 8 : "50%",
              top: orientation === "vertical" ? undefined : 8,
              height: orientation === "vertical" ? `${value * 100}%` : 6,
              width: orientation === "vertical" ? 6 : `${value * 100}%`,
              transform:
                orientation === "vertical"
                  ? "translateX(-50%)"
                  : "translateY(-50%)",
              borderRadius: 999,
              background: color,
              opacity: 0.4,
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: orientation === "vertical" ? "50%" : `${handlePosition}%`,
            bottom: orientation === "vertical" ? `${handlePosition}%` : "50%",
            transform:
              orientation === "vertical"
                ? "translate(-50%, 50%)"
                : "translate(-50%, 50%)",
            width: orientation === "vertical" ? "calc(100% - 40px)" : 48,
            height: orientation === "vertical" ? 22 : "calc(100% - 20px)",
            borderRadius: 12,
            background: "#0b1220",
            border: `2px solid ${color}`,
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        />
      </div>
      {label ? (
        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      ) : null}
      <span style={{ fontSize: 12, color: "#94a3b8" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function Knob({
  label,
  value,
  onChange,
  size = "md",
  color = "#f472b6",
  style,
  ...rest
}: KnobProps) {
  const { startDrag, moveDrag, endDrag } = useDragValue({
    value,
    onChange,
    axis: "vertical",
    ...rest,
  });
  const dims = useMemo(() => {
    switch (size) {
      case "sm":
        return 56;
      case "lg":
        return 84;
      default:
        return 68;
    }
  }, [size]);

  // If width/height provided mainly via style, use that as base dim, or fallback to size preset
  const finalDim = typeof style?.width === "number" ? style.width : dims;

  const angle = -135 + value * 270;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        userSelect: "none",
        ...style,
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          width: finalDim,
          height: finalDim,
          borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, #1f2937, #0b1220)",
          border: "1px solid #1f2937",
          position: "relative",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 10,
            borderRadius: "50%",
            border: "1px solid #111826",
            background: "#0a0f1a",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 12,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: finalDim / 2.2,
            background: color,
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: "bottom center",
            borderRadius: 999,
            boxShadow: "0 0 8px rgba(0,0,0,0.4)",
          }}
        />
      </div>
      {label ? (
        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      ) : null}
      <span style={{ fontSize: 12, color: "#94a3b8" }}>
        {Math.round(value * 127)}
      </span>
    </div>
  );
}

export function Crossfader({
  label,
  value,
  onChange,
  color = "#f97316",
  style,
  ...rest
}: CrossfaderProps) {
  const { startDrag, moveDrag, endDrag } = useDragValue({
    value,
    onChange,
    axis: "horizontal",
    ...rest,
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        userSelect: "none",
        ...style,
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          width: style?.width ?? 260,
          height: style?.height ?? 54,
          borderRadius: 12,
          background: "#0f172a",
          border: "1px solid #1f2937",
          position: "relative",
          padding: "14px 12px",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: "50%",
            height: 3,
            background: "#1f2937",
            transform: "translateY(-50%)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: "50%",
            height: 3,
            background: color,
            transform: "translateY(-50%)",
            width: `${value * 100}%`,
            borderRadius: 999,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${value * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 60,
            height: 28,
            borderRadius: 12,
            background: "#0b1220",
            border: `2px solid ${color}`,
            boxShadow:
              "0 2px 12px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        />
      </div>
      {label ? (
        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      ) : null}
      <span style={{ fontSize: 12, color: "#94a3b8" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function PadButton({
  label,
  active,
  onToggle,
  color = "#22d3ee",
  style,
}: PadButtonProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 96,
        height: 60,
        borderRadius: 12,
        border: `2px solid ${active ? color : "#1f2937"}`,
        background: active
          ? `radial-gradient(circle at 30% 30%, ${color}55, ${color}22)`
          : "#0b1220",
        color: "#e2e8f0",
        fontWeight: 700,
        letterSpacing: 0.4,
        cursor: "pointer",
        boxShadow: active ? "0 0 16px rgba(0,0,0,0.4)" : "none",
        transition: "all 0.12s",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function StepGrid({
  rows,
  cols,
  values,
  onChange,
  color = "#7c3aed",
  style,
}: StepGridProps) {
  const handleToggle = (idx: number) => {
    const next = [...values];
    next[idx] = next[idx] === 1 ? 0 : 1;
    onChange(next);
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 6,
        background: "#0b1220",
        padding: 8,
        borderRadius: 10,
        border: "1px solid #1f2937",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
        ...style,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, idx) => {
        const active = values[idx] === 1;
        return (
          <button
            key={idx}
            onClick={() => handleToggle(idx)}
            style={{
              aspectRatio: "1 / 1",
              borderRadius: 8,
              border: `1px solid ${active ? color : "#1f2937"}`,
              background: active ? `${color}22` : "#0f172a",
              color: active ? "#e2e8f0" : "#94a3b8",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
