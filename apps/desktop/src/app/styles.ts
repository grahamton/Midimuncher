import type { CSSProperties } from "react";

export const styles = {
  window: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#0a0a0a",
    color: "#e0e0e0",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  chrome: {
    display: "flex",
    flexDirection: "column",
    height: "100%"
  },
  topBar: {
    height: "60px",
    backgroundColor: "#1a1a1a",
    borderBottom: "1px solid #333",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: "24px"
  },
  cluster: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  badgeTitle: {
    fontSize: "10px",
    textTransform: "uppercase",
    color: "#888",
    letterSpacing: "0.05em"
  },
  badgeValue: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  pillRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#252525",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden"
  },
  nav: {
    width: "240px",
    background: "linear-gradient(180deg, #0f2435 0%, #0b1b28 100%)",
    borderRight: "1px solid #0e3a50",
    display: "flex",
    flexDirection: "column"
  },
  navHeader: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  logo: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: "0.1em"
  },
  navSection: {
    flex: 1,
    padding: "10px 0"
  },
  navItem: {
    width: "100%",
    padding: "12px 20px",
    border: "none",
    textAlign: "left",
    color: "#b5b5b5",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.2s",
    background: "none",
    backgroundImage: "none"
  },
  navFooter: {
    padding: "20px",
    borderTop: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  content: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    overflowY: "auto",
    padding: "24px"
  },
  bottomBar: {
    height: "32px",
    backgroundColor: "#101010",
    borderTop: "1px solid #1e1e1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    fontSize: "11px",
    color: "#888"
  },
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #222",
    paddingBottom: "16px"
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "300",
    margin: 0
  },
  pageGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  panel: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column"
  },
  panelHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#222"
  },
  panelTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#bbb"
  },
  panelContent: {
    padding: "16px",
    flex: 1
  },
  btnPrimary: {
    backgroundColor: "#1a89c8",
    background: "#1a89c8",
    backgroundImage: "none",
    color: "white",
    border: "none",
    padding: "6px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500"
  },
  btnSecondary: {
    backgroundColor: "#1c1f24",
    background: "#1c1f24",
    backgroundImage: "none",
    color: "#e1e8f0",
    border: "1px solid #29313a",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px"
  },
  btnDanger: {
    backgroundColor: "#a11b1b",
    background: "#a11b1b",
    backgroundImage: "none",
    color: "white",
    border: "1px solid #c02424",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px"
  },
  btnTiny: {
    backgroundColor: "#2a2a2a",
    background: "#2a2a2a",
    backgroundImage: "none",
    color: "#ccc",
    border: "1px solid #444",
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "10px",
    cursor: "pointer"
  },
  input: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
    color: "#eee",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    width: "100%"
  },
  inputNarrow: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
    color: "#eee",
    padding: "4px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    width: "50px",
    textAlign: "center"
  },
  select: {
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    color: "#eee",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px"
  },
  selectWide: {
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    color: "#eee",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    width: "100%"
  },
  pill: {
    padding: "2px 8px",
    backgroundColor: "#333",
    borderRadius: "10px",
    fontSize: "10px",
    color: "#aaa"
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%"
  },
  valueText: {
    fontSize: "13px",
    fontWeight: "500"
  },
  kpi: {
    fontSize: "16px",
    fontWeight: "bold",
    fontFamily: "monospace",
    color: "#35c96a"
  },
  table: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    backgroundColor: "#222",
    borderRadius: "4px"
  },
  cellSmall: {
    width: "40px",
    color: "#666",
    fontSize: "11px",
    fontFamily: "monospace"
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer"
  },
  muted: {
    fontSize: "12px",
    color: "#666"
  },
  card: {
    padding: "12px",
    backgroundColor: "#222",
    borderRadius: "4px",
    border: "1px solid #333",
    marginBottom: "8px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: "8px"
  },
  tile: {
    aspectRatio: "1/1",
    backgroundColor: "#222",
    border: "1px solid #333",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    padding: "8px",
    textAlign: "center",
    transition: "all 0.1s"
  },
  tileTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "4px"
  },
  tileMeta: {
    fontSize: "9px",
    color: "#555"
  },
  queueStrip: {
    height: "40px",
    backgroundColor: "#111",
    borderTop: "1px solid #333",
    marginTop: "20px",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: "12px"
  }
} satisfies Record<string, CSSProperties>;

