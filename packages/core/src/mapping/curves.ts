import type { Curve } from "./types";

export function applyCurve01(value01: number, curve: Curve): number {
  const x = clamp01(value01);
  switch (curve) {
    case "expo":
      return x * x;
    case "log":
      return Math.sqrt(x);
    case "linear":
    default:
      return x;
  }
}

export function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}
