import type { PropsWithChildren, CSSProperties } from "react";

export function AppChrome({
  children,
  style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#0f172a",
        color: "#e2e8f0",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type TopStatusBarProps = {
  saveLabel: string;
  midiReady: boolean;
  tempo: number;
  onTempoChange: (bpm: number) => void;
  // We accept other props but might not render them all for now to save time
  [key: string]: any;
};

export function TopStatusBar(props: TopStatusBarProps) {
  const { saveLabel, midiReady, tempo, onTempoChange, style } = props;

  return (
    <div
      style={{
        height: 48,
        borderBottom: "1px solid #1f2937",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        background: "#1e293b",
        flexShrink: 0,
        justifyContent: "space-between",
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, letterSpacing: -0.5 }}>MIDIMuncher</div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Tempo Control */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#0f172a",
            padding: "4px 8px",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "#94a3b8",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            BPM
          </span>
          <input
            type="number"
            value={Math.round(tempo)}
            onChange={(e) => onTempoChange(e.target.valueAsNumber)}
            style={{
              background: "transparent",
              border: "none",
              color: "white",
              width: 40,
              textAlign: "right",
              fontWeight: 600,
              fontFamily: "monospace",
            }}
          />
        </div>

        {/* Status Indicators */}
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <span style={{ color: midiReady ? "#4ade80" : "#f87171" }}>
            ● {midiReady ? "MIDI OK" : "No MIDI"}
          </span>
          <span style={{ color: "#94a3b8" }}>{saveLabel}</span>
        </div>
      </div>
    </div>
  );
}

type LeftNavRailProps = {
  route: string;
  onChangeRoute: (route: any) => void;
  onPanic: () => void;
  style?: CSSProperties;
};

export function LeftNavRail({
  route,
  onChangeRoute,
  onPanic,
  style,
}: LeftNavRailProps) {
  const tabs = [
    { id: "setup", label: "Set" },
    { id: "routes", label: "Rte" },
    { id: "mapping", label: "Map" },
    { id: "stage", label: "Stg" },
    { id: "chains", label: "Chn" },
    { id: "snapshots", label: "Snp" },
    { id: "monitor", label: "Mon" },
    { id: "settings", label: "Cfg" },
  ];

  return (
    <div
      style={{
        width: 64,
        borderRight: "1px solid #1f2937",
        background: "#1e293b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: 12,
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChangeRoute(t.id)}
            title={t.id}
            style={{
              background: route === t.id ? "#38bdf8" : "transparent",
              color: route === t.id ? "#0f172a" : "#94a3b8",
              border: "none",
              borderRadius: 6,
              width: 48,
              height: 48,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        onClick={onPanic}
        style={{
          background: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: 4,
          width: 48,
          height: 32,
          fontSize: 10,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        !!!
      </button>
    </div>
  );
}

export function BodySplitPane({
  children,
  style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function MainContentArea({
  children,
  style,
}: PropsWithChildren<{ style?: CSSProperties }>) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BottomUtilityBar(props: any) {
  const { children, style, midiReady, saveLabel, version } = props;
  return (
    <div
      style={{
        height: 32,
        borderTop: "1px solid #1f2937",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        fontSize: 12,
        color: "#94a3b8",
        gap: 16,
        flexShrink: 0,
        justifyContent: "space-between",
        ...style,
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        {midiReady !== undefined && (
          <span style={{ color: midiReady ? "#4ade80" : "#f87171" }}>
            ● {midiReady ? "Ready" : "Error"}
          </span>
        )}
        {saveLabel && <span>{saveLabel}</span>}
      </div>
      {version && <span style={{ opacity: 0.5 }}>{version}</span>}
      {children}
    </div>
  );
}
