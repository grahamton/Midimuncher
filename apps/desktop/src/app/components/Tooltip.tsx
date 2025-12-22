import { ReactNode, useState } from "react";

type TooltipProps = {
  text: string;
  children: ReactNode;
  delay?: number;
};

export function Tooltip({ text, children, delay = 500 }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const t = setTimeout(() => setShow(true), delay);
    setTimer(t);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setShow(false);
  };

  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      tabIndex={0}
    >
      {children}
      {show && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1e293b",
            color: "#e2e8f0",
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 1000,
            border: "1px solid #334155",
            pointerEvents: "none",
          }}
        >
          {text}
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid #1e293b",
            }}
          />
        </span>
      )}
    </span>
  );
}

type HelpIconProps = {
  tooltip: string;
};

export function HelpIcon({ tooltip }: HelpIconProps) {
  return (
    <Tooltip text={tooltip}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: "50%",
          backgroundColor: "#475569",
          color: "#e2e8f0",
          fontSize: 11,
          fontWeight: "bold",
          cursor: "help",
          marginLeft: 4,
        }}
      >
        ?
      </span>
    </Tooltip>
  );
}
