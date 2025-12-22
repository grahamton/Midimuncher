import type { CSSProperties } from "react";
import { Page, PageHeader } from "./components/layout";

export function SettingsPage() {
  return (
    <Page>
      <PageHeader title="Settings" />
      <div style={{ padding: 20 }}>
        Global Application settings coming soon.
      </div>
    </Page>
  );
}
