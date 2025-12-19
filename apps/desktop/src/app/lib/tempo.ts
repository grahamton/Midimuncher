import type { SnapshotQuantize } from "../../../shared/projectTypes";

export function quantizeToMs(q: SnapshotQuantize, bpm: number): number {
  const safeBpm = bpm > 0 ? bpm : 120;
  const quarterMs = 60000 / safeBpm;
  switch (q) {
    case "immediate":
      return 0;
    case "bar4":
      return quarterMs * 16;
    default:
      return quarterMs * 4;
  }
}
