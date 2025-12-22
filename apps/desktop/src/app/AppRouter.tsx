import { type AppView } from "../../shared/projectTypes";
import { MappingPage } from "./mapping/MappingPage";
import { StagePage } from "./StagePage";
import { MonitorPage } from "./monitor/MonitorPage";
import { SnapshotsPage } from "./snapshots/SnapshotsPage";
import { ChainsPage } from "./chains/ChainsPage";
import { SurfaceBoardPage } from "./SurfaceBoardPage";
import { SetupPage } from "./setup/SetupPage";
import { RoutesPage } from "./routes/RoutesPage";
import { SettingsPage } from "./StubPages";
import { ControlLabPage } from "./ControlLabPage";
import {
  findSnapshotIdByName,
  findSnapshotSlot,
  listSnapshotNames,
} from "./snapshots/SnapshotsPage";
import type { AppRouterProps } from "./appProps";
import { ModulationPage } from "./modulation/ModulationPage";

export function AppRouter(props: AppRouterProps) {
  const route = props.route;

  switch (route) {
    case "setup":
      return (
        <SetupPage
          ports={props.ports}
          devices={props.devices}
          updateDevice={props.updateDevice}
          diagMessage={props.diagMessage}
          diagRunning={props.diagRunning}
          onRunDiagnostics={props.onRunDiagnostics}
          selectedOut={props.selectedOut}
          onAddDevice={props.onAddDevice}
          onQuickOxiSetup={props.onQuickOxiSetup}
          onStandardOxiSetup={props.onStandardOxiSetup}
          transportChannel={props.transportChannel}
          setTransportChannel={props.setTransportChannel}
        />
      );
    case "routes":
      return <RoutesPage routes={props.routes} setRoutes={props.setRoutes} />;
    case "mapping":
      return (
        <MappingPage {...props} instrumentLibrary={props.instrumentLibrary} />
      );
    case "surfaces":
      return (
        <SurfaceBoardPage
          controls={props.controls}
          onUpdateControl={props.updateControl}
          onEmitControl={props.onEmitControl}
          hardwareState={props.hardwareState}
        />
      );
    case "stage": {
      const snapshotNames = listSnapshotNames(props.snapshots);
      const activeSnapshotName = props.activeSnapshotId
        ? findSnapshotSlot(props.activeSnapshotId, props.snapshots)?.slot
            .name ?? null
        : null;

      const dropMacroControls = (props.controls || []).map((c: any) => ({
        id: c.id,
        label: c.label || c.id,
      }));

      return (
        <StagePage
          snapshots={snapshotNames}
          activeSnapshot={activeSnapshotName}
          queueStatus={props.snapshotQueueStatus}
          onSelectSnapshot={(name: string, quantize: any) => {
            const id = findSnapshotIdByName(name, props.snapshots);
            if (id) {
              props.onSelectSnapshot(id, quantize);
            }
          }}
          onDrop={(name: string) => {
            const id = findSnapshotIdByName(name, props.snapshots);
            if (id) {
              props.onDropSnapshot(id);
            }
          }}
          devices={props.devices}
          clock={props.clock}
          controls={props.controls}
          onUpdateControl={props.updateControl}
          onEmitControl={props.onEmitControl}
          onExit={() => props.onNavigate("setup")}
        />
      );
    }
    case "monitor":
      return (
        <MonitorPage
          monitorRows={props.monitorRows as any}
          logCapReached={props.logCapReached}
          clearLog={props.clearLog}
          sessionStatus={props.sessionStatus}
          onSessionStart={props.onSessionStart}
          onSessionStop={props.onSessionStop}
          onSessionReveal={props.onSessionReveal}
        />
      );
    case "snapshots":
      return (
        <SnapshotsPage
          snapshots={props.snapshots}
          activeSnapshotId={props.activeSnapshotId}
          pendingSnapshotId={props.pendingSnapshotId}
          queueStatus={props.snapshotQueueStatus}
          onSelectSnapshot={(id) => props.onSelectSnapshot(id)}
          onCapture={props.onCaptureSnapshot}
          onCancelPending={props.onCancelPendingSnapshot}
          onChangeBank={(id) => props.onChangeSnapshotBank(id ?? "")}
          snapshotQuantize={props.snapshotQuantize}
          snapshotMode={props.snapshotMode}
          onChangeSnapshotQuantize={props.onChangeSnapshotQuantize}
          onChangeSnapshotMode={props.onChangeSnapshotMode}
          snapshotFadeMs={props.snapshotFadeMs}
          onChangeSnapshotFade={props.onChangeSnapshotFade}
          snapshotCommitDelayMs={props.snapshotCommitDelayMs}
          onChangeSnapshotCommitDelay={props.onChangeSnapshotCommitDelay}
          snapshotClockSource={props.snapshotClockSource}
          onChangeSnapshotClockSource={props.onChangeSnapshotClockSource}
          snapshotCycleBars={props.snapshotCycleBars}
          onChangeSnapshotCycleBars={props.onChangeSnapshotCycleBars}
        />
      );
    case "chains":
      return (
        <ChainsPage
          state={props.snapshotChains}
          onChange={props.setSnapshotChains}
          snapshots={props.snapshots}
        />
      );
    case "settings":
      return <SettingsPage />;
    case "modulation":
      return (
        <ModulationPage
          state={props.modulationState}
          devices={props.devices}
          controls={props.controls}
          onChange={props.setModulationState}
        />
      );
    case "help":
      // Maybe ControlLab is help?
      return <ControlLabPage />;
    default:
      return <div style={{ padding: 20 }}>Unknown Route: {route}</div>;
  }
}
