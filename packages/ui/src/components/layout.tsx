import {
  type PropsWithChildren,
  type CSSProperties,
  type ReactNode,
  useState,
} from "react";

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
        background: "var(--ti-body, #1e2433)",
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
  actions?: ReactNode;
  [key: string]: any;
};

export function TopStatusBar(props: TopStatusBarProps) {
  const { saveLabel, midiReady, tempo, onTempoChange, style } = props;

  return (
    <div
      style={{
        height: 60,
        borderBottom: "2px solid var(--ti-amber, #fdb813)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        background: "var(--ti-dark, #131821)",
        flexShrink: 0,
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          letterSpacing: 2,
          color: "var(--ti-amber, #fdb813)",
          fontSize: 18,
        }}
      >
        MIDIMUNCHER
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Tempo Control */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--ti-lcd-bg, #a9b29e)",
            color: "var(--ti-lcd-text, #21231e)",
            padding: "4px 12px",
            borderRadius: 2,
            boxShadow: "inset 1px 1px 3px rgba(0,0,0,0.3)",
          }}
        >
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              fontWeight: 800,
              opacity: 0.7,
            }}
            title="Beats Per Minute - controls music tempo/speed"
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
              color: "inherit",
              width: 45,
              textAlign: "right",
              fontWeight: 700,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 14,
            }}
          />
        </div>

        {props.actions && (
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            {props.actions}
          </div>
        )}

        {/* Status Indicators */}
        <div
          style={{ display: "flex", gap: 12, fontSize: 12, fontWeight: 600 }}
        >
          <span style={{ color: midiReady ? "#4ade80" : "#f87171" }}>
            ● {midiReady ? "MIDI READY" : "NO MIDI"}
          </span>
          <span style={{ color: "var(--ti-amber, #fdb813)", opacity: 0.8 }}>
            {saveLabel.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

export type NavItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type LeftNavRailProps = {
  route: string;
  onChangeRoute: (route: any) => void;
  onPanic: () => void;
  items: NavItem[];
  style?: CSSProperties;
};

export function LeftNavRail({
  route,
  onChangeRoute,
  onPanic,
  items,
  style,
}: LeftNavRailProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        width: expanded ? 240 : 72,
        borderRight: "1px solid var(--ti-dark, #131821)",
        background: "var(--ti-dark, #131821)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px 0",
        gap: 12,
        flexShrink: 0,
        transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "4px 0 10px rgba(0,0,0,0.2)",
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          width: "100%",
          padding: "0 12px",
          boxSizing: "border-box",
        }}
      >
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => onChangeRoute(t.id)}
            title={t.label}
            style={{
              background:
                route === t.id ? "var(--ti-amber, #fdb813)" : "transparent",
              color: route === t.id ? "var(--ti-dark, #131821)" : "#94a3b8",
              border: "none",
              borderRadius: 4,
              height: 48,
              width: "100%",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: expanded ? "flex-start" : "center",
              padding: expanded ? "0 12px" : "0",
              gap: expanded ? 12 : 0,
              transition: "all 0.2s ease",
              overflow: "hidden",
              boxShadow: route === t.id ? "0 2px 4px rgba(0,0,0,0.3)" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {t.icon ? t.icon : t.label.substring(0, 3)}
            </div>
            {expanded && (
              <span
                style={{
                  whiteSpace: "nowrap",
                  opacity: 1,
                  animation: "fadeIn 0.2s",
                }}
              >
                {t.label}
              </span>
            )}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          padding: "0 12px",
          boxSizing: "border-box",
          alignItems: "center",
        }}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "var(--ti-func-blue, #5a7fa1)",
            backgroundImage:
              "repeating-linear-gradient(180deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 5px)",
            color: "white",
            border: "none",
            borderRadius: 4,
            width: "100%",
            height: 32,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {expanded ? "«" : "»"}
        </button>

        <button
          onClick={onPanic}
          title="Valid Panic"
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: 4,
            width: "100%",
            maxWidth: expanded ? 240 : 48,
            height: 32,
            fontSize: 11,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(239,68,68,0.3)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            transition: "all 0.2s ease",
          }}
        >
          {expanded ? "PANIC (ALL OFF)" : "!!!"}
        </button>
      </div>
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
        borderTop: "1px solid var(--ti-dark, #131821)",
        background: "var(--ti-dark, #131821)",
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
            ● {midiReady ? "READY" : "ERROR"}
          </span>
        )}
        {saveLabel && <span>{saveLabel.toUpperCase()}</span>}
      </div>
      {version && <span style={{ opacity: 0.5 }}>{version}</span>}
      {children}
    </div>
  );
}
