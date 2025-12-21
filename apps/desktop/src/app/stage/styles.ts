import type { CSSProperties } from "react";

export const stageStyles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    maxWidth: 1100,
    margin: "0 auto",
    color: "#e2e8f0"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #1f2937",
    paddingBottom: 12
  },
  kicker: {
    margin: 0,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontSize: 11,
    color: "#94a3b8"
  },
  title: {
    margin: 0,
    fontWeight: 600,
    fontSize: 24,
    color: "#f8fafc"
  },
  meta: {
    fontSize: 12,
    color: "#cbd5e1"
  },
  phaseTrack: {
    width: 140,
    height: 8,
    borderRadius: 999,
    background: "#0f172a",
    border: "1px solid #1e293b",
    overflow: "hidden"
  },
  phaseFill: {
    height: "100%",
    background: "linear-gradient(90deg, #38bdf8, #22c55e)"
  },
  select: {
    background: "#0f172a",
    color: "#e2e8f0",
    borderRadius: 8,
    border: "1px solid #1f2937",
    padding: "8px 10px"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700
  },
  panel: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 14,
    background: "#0b1220"
  },
  pill: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12
  },
  card: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 16,
    background: "#0b1220",
    textAlign: "left",
    transition: "all 0.15s",
    color: "inherit"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 8
  },
  cardActions: {
    marginTop: 12,
    display: "flex",
    gap: 10
  },
  cardActionBtn: {
    flex: 1,
    borderRadius: 10,
    border: "1px solid #1f2937",
    padding: "10px 12px",
    background: "#0f172a",
    color: "#e2e8f0",
    cursor: "pointer",
    fontWeight: 700
  },
  rigPanel: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 14,
    background: "#0b1220"
  },
  rigGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12
  },
  rigEmpty: {
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: 12,
    background: "#0b1220",
    opacity: 0.75
  },
  rigHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10
  },
  rigTitle: {
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "#cbd5e1"
  }
  ,
  experimental: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
    fontStyle: "italic"
  }
};

export const stageColors = [
  "#38bdf8",
  "#f472b6",
  "#22d3ee",
  "#f97316",
  "#a3e635",
  "#c084fc",
  "#facc15",
  "#fb7185"
];
