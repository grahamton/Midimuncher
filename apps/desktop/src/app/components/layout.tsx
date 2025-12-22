import type { ReactNode } from "react";

import { styles } from "../styles";

export function Page({ children }: { children: ReactNode }) {
  return <div style={styles.page}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.pageTitle}>{title}</h1>
        {subtitle && (
          <p style={{ ...styles.muted, fontSize: 13, marginTop: 4 }}>
            {subtitle}
          </p>
        )}
      </div>
      <div>{right}</div>
    </div>
  );
}

export function Panel({
  title,
  right,
  children,
}: {
  title: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelTitle}>{title}</div>
        {right && <div>{right}</div>}
      </div>
      <div style={styles.panelContent}>{children}</div>
    </div>
  );
}
