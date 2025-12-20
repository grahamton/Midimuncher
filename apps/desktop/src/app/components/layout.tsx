import type { ReactNode } from "react";

import { styles } from "../styles";

export function Page({ children }: { children: ReactNode }) {
  return <div style={styles.page}>{children}</div>;
}

export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={styles.pageHeader}>
      <h1 style={styles.pageTitle}>{title}</h1>
      <div>{right}</div>
    </div>
  );
}

export function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>{title}</span>
        {right && <div>{right}</div>}
      </div>
      <div style={styles.panelContent}>{children}</div>
    </div>
  );
}

