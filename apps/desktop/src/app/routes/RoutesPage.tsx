import { Trash2 } from "lucide-react";
import type { RouteConfig } from "../../../shared/ipcTypes";
import { Page, PageHeader, Panel } from "../components/layout";
import { styles } from "../styles";

type RoutesPageProps = {
  routes: RouteConfig[];
  setRoutes: (routes: RouteConfig[]) => void;
};

export function RoutesPage({ routes, setRoutes }: RoutesPageProps) {
  const removeRoute = (id: string) => {
    setRoutes(routes.filter((r) => r.id !== id));
  };

  return (
    <Page>
      <PageHeader
        title="Routes"
        right={
          <div style={styles.row}>
            <span style={styles.muted}>{routes.length} active routes</span>
          </div>
        }
      />

      <div style={styles.pageGrid2}>
        <Panel title="Routing Table">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {routes.length === 0 ? (
              <div style={(styles as any).empty}>No routes configured.</div>
            ) : (
              routes.map((route) => (
                <div key={route.id} style={styles.row}>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "#e2e8f0" }}>
                      {route.fromId} → {route.toId}
                    </span>
                    <span style={styles.muted}>
                      Ch:{" "}
                      {route.channelMode === "force"
                        ? `Force ${route.forceChannel}`
                        : "Passthrough"}
                    </span>
                  </div>
                  <div style={styles.pill}>
                    {route.filter?.allowTypes
                      ? route.filter.allowTypes.join(", ")
                      : "All Events"}
                  </div>
                  <button
                    style={styles.btnTiny}
                    onClick={() => removeRoute(route.id)}
                    title="Remove Route"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Help">
          <p style={styles.muted}>
            Routes are typically created automatically when you configure
            devices in the Setup page. You can verify active signal flow here.
          </p>
        </Panel>
      </div>
    </Page>
  );
}
