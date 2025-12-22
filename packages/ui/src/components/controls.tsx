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
  trackColor?: string;
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
  color = "var(--ti-amber, #fdb813)",
  fill = true,
  style,
  trackColor = "var(--ti-dark, #131821)",
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
          borderRadius: 8,
          background: trackColor,
          border: "1px solid rgba(255,255,255,0.05)",
          padding: orientation === "vertical" ? "10px 20px" : "16px 10px",
          position: "relative",
          boxShadow:
            "inset 2px 2px 4px rgba(0,0,0,0.5), 1px 1px 1px rgba(255,255,255,0.05)",
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
            background: "rgba(0,0,0,0.3)",
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
              opacity: 0.3,
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
            width: orientation === "vertical" ? "calc(100% - 30px)" : 48,
            height: orientation === "vertical" ? 24 : "calc(100% - 16px)",
            borderRadius: 4,
            background: "var(--ti-func-blue, #5a7fa1)",
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 5px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "0 4px 8px rgba(0,0,0,0.5), inset 1px 1px 1px rgba(255,255,255,0.1)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80%",
              height: 2,
              background: color,
              borderRadius: 999,
            }}
          />
        </div>
      </div>
      {label ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: "var(--ti-amber, #fdb813)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          fontSize: 12,
          color: "var(--ti-lcd-bg, #a9b29e)",
          fontFamily: "monospace",
        }}
      >
        {Math.round(value * 127)}
      </span>
    </div>
  );
}

export function Knob({
  label,
  value,
  onChange,
  size = "md",
  color = "var(--ti-amber, #fdb813)",
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
          background: "radial-gradient(circle at 30% 30%, #2a3142, #131821)",
          border: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
          boxShadow:
            "0 4px 10px rgba(0,0,0,0.4), inset 1px 1px 1px rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 8,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.3)",
            background: "#131821",
            boxShadow: "inset 1px 1px 4px rgba(0,0,0,0.5)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 4,
            height: finalDim / 2.5,
            background: color,
            transform: `translate(-50%, -100%) rotate(${angle}deg)`,
            transformOrigin: "bottom center",
            borderRadius: 999,
            boxShadow: "0 0 4px rgba(0,0,0,0.5)",
          }}
        />
      </div>
      {label ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: "var(--ti-amber, #fdb813)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          fontSize: 12,
          color: "var(--ti-lcd-bg, #a9b29e)",
          fontFamily: "monospace",
        }}
      >
        {Math.round(value * 127)}
      </span>
    </div>
  );
}

export function Crossfader({
  label,
  value,
  onChange,
  color = "var(--ti-amber, #fdb813)",
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
          borderRadius: 8,
          background: "var(--ti-dark, #131821)",
          border: "1px solid rgba(255,255,255,0.05)",
          position: "relative",
          padding: "14px 12px",
          boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: "50%",
            height: 2,
            background: "rgba(0,0,0,0.5)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${value * 100}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 64,
            height: 32,
            borderRadius: 4,
            background: "var(--ti-white-key, #f4f1e5)",
            border: "1px solid rgba(0,0,0,0.2)",
            boxShadow:
              "0 4px 8px rgba(0,0,0,0.5), inset 1px 1px 1px rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 2,
              height: "60%",
              background: "rgba(0,0,0,0.2)",
              margin: "0 2px",
            }}
          />
          <div
            style={{
              width: 2,
              height: "60%",
              background: "rgba(0,0,0,0.5)",
              margin: "0 2px",
            }}
          />
          <div
            style={{
              width: 2,
              height: "60%",
              background: "rgba(0,0,0,0.2)",
              margin: "0 2px",
            }}
          />
        </div>
      </div>
      {label ? (
        <span
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: "var(--ti-amber, #fdb813)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </span>
      ) : null}
      <span
        style={{
          fontSize: 12,
          color: "var(--ti-lcd-bg, #a9b29e)",
          fontFamily: "monospace",
        }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

export function PadButton({
  label,
  active,
  onToggle,
  color = "var(--ti-amber, #fdb813)",
  style,
}: PadButtonProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: 96,
        height: 60,
        borderRadius: 4,
        border: active
          ? `2px solid ${color}`
          : "1px solid rgba(255,255,255,0.1)",
        background: active ? color : "var(--ti-func-blue, #5a7fa1)",
        backgroundImage: active
          ? "none"
          : "repeating-linear-gradient(180deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 5px)",
        color: active ? "var(--ti-dark, #131821)" : "white",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 1,
        cursor: "pointer",
        boxShadow: active ? `0 0 12px ${color}66` : "0 4px 6px rgba(0,0,0,0.3)",
        transition: "all 0.1s",
        fontSize: 12,
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
  color = "var(--ti-amber, #fdb813)",
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
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 6,
        background: "var(--ti-extra-dark, #0b0f15)",
        padding: 8,
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.5)",
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
              width: "100%",
              height: "100%",
              minHeight: 32,
              borderRadius: 2,
              border: "none",
              background: active ? color : "var(--ti-func-blue, #5a7fa1)",
              backgroundImage: active
                ? "none"
                : "repeating-linear-gradient(180deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 5px)",
              color: active
                ? "var(--ti-dark, #131821)"
                : "rgba(255,255,255,0.8)",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 10,
              boxShadow: active
                ? `0 0 8px ${color}44`
                : "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}
