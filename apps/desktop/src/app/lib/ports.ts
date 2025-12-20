import type { MidiPortInfo } from "../../../shared/ipcTypes";

export type OxiAnalysis = { isOxi: boolean; oxiTag: "A" | "B" | "C" | "?" | null; rank: number };

export function analyzeOxiPortName(name: string): OxiAnalysis {
  const n = (name ?? "").toLowerCase();
  const isOxi = n.includes("oxi");
  if (!isOxi) return { isOxi: false, oxiTag: null, rank: 1000 };

  const match = n.match(/(?:midi|usb)\s*([123])\b/) ?? n.match(/\b([123])\b/);
  const num = match?.[1];
  const oxiTag = num === "1" ? "A" : num === "2" ? "B" : num === "3" ? "C" : "?";
  const rank = oxiTag === "A" ? 0 : oxiTag === "B" ? 1 : oxiTag === "C" ? 2 : 3;
  return { isOxi: true, oxiTag, rank };
}

export function formatPortLabel(name: string): string {
  const a = analyzeOxiPortName(name);
  if (!a.isOxi) return name;
  const prefix = a.oxiTag && a.oxiTag !== "?" ? `OXI ${a.oxiTag}` : "OXI";
  return `${prefix} - ${name}`;
}

export function sortPortsWithOxiFirst(a: MidiPortInfo, b: MidiPortInfo): number {
  const aa = analyzeOxiPortName(a.name);
  const bb = analyzeOxiPortName(b.name);
  if (aa.isOxi !== bb.isOxi) return aa.isOxi ? -1 : 1;
  if (aa.isOxi && bb.isOxi && aa.rank !== bb.rank) return aa.rank - bb.rank;
  return a.name.localeCompare(b.name);
}
