import type {
  MidiBackendInfo,
  MidiPorts,
  RouteConfig,
  SessionLogStatus,
  SnapshotClockSource,
  SnapshotQueueStatus,
  SnapshotQuantizeKind,
} from "../../shared/ipcTypes";
import type {
  AppView,
  ChainStep,
  DeviceConfig,
  ProjectState,
  SnapshotMode,
  SnapshotQuantize,
  SnapshotsState,
} from "../../shared/projectTypes";
import type {
  ControlElement,
  MappingSlot,
  MidiEvent,
} from "@midi-playground/core";
import type { BridgeClock } from "../services/midiBridge";

export type AppRouterProps = {
  route: AppView;
  ports: MidiPorts;
  clock: BridgeClock;
  devices: DeviceConfig[];
  updateDevice: (id: string, partial: Partial<DeviceConfig>) => void;
  selectedIn: string | null;
  selectedOut: string | null;
  onSelectIn: (id: string | null) => void;
  onSelectOut: (id: string | null) => void;
  diagMessage: string | null;
  diagRunning: boolean;
  onRunDiagnostics: () => void;
  onQuickStart: () => void;
  loadingPorts: boolean;
  logCapReached: boolean;
  sessionStatus: SessionLogStatus | null;
  onSessionStart: () => void;
  onSessionStop: () => void;
  onSessionReveal: () => void;
  monitorRows: MidiEvent[];
  clearLog: () => void;
  controls: ControlElement[];
  selectedControl: ControlElement | undefined;
  selectedControlId: string | null;
  setSelectedControlId: (id: string | null) => void;
  updateSlot: (
    controlId: string,
    slotIndex: number,
    partial: Partial<MappingSlot>
  ) => void;
  learnStatus: "idle" | "listening" | "captured" | "timeout";
  onLearn: (slotIndex: number) => void;
  onCancelLearn: () => void;
  note: number;
  ccValue: number;
  onSendNote: () => void;
  onSendCc: () => void;
  onQuickTest: (portId: string, ch: number) => void;
  onQuickCc: (portId: string, ch: number, cc: number, val: number) => void;
  onQuickProgram: (portId: string, ch: number, program: number) => void;
  onSendSnapshot: () => void;
  onAddDeviceRoutes: (deviceId: string) => void;
  routes: RouteConfig[];
  setRoutes: (routes: RouteConfig[]) => void;
  updateControl: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl: (control: ControlElement, value: number) => void;
  snapshots: SnapshotsState;
  activeSnapshotId: string | null;
  pendingSnapshotId: string | null;
  snapshotQueueStatus: SnapshotQueueStatus | null;
  onSelectSnapshot: (id: string, quantize?: SnapshotQuantizeKind) => void;
  onDropSnapshot: (id: string) => void;
  onStageSendCc: (deviceId: string, cc: number, val: number) => void;
  stageDropControlId: string | null;
  onChangeStageDropControlId: (id: string | null) => void;
  stageDropToValue: number;
  onChangeStageDropToValue: (val: number) => void;
  stageDropDurationMs: number;
  onChangeStageDropDurationMs: (ms: number) => void;
  onCaptureSnapshot: (id: string) => void;
  onCancelPendingSnapshot: () => void;
  onChangeSnapshotBank: (id: string) => void;
  snapshotQuantize: SnapshotQuantize;
  onChangeSnapshotQuantize: (q: SnapshotQuantize) => void;
  snapshotMode: SnapshotMode;
  onChangeSnapshotMode: (m: SnapshotMode) => void;
  snapshotFadeMs: number;
  onChangeSnapshotFade: (ms: number) => void;
  snapshotCommitDelayMs: number;
  onChangeSnapshotCommitDelay: (ms: number) => void;
  snapshotClockSource: SnapshotClockSource;
  onChangeSnapshotClockSource: (s: SnapshotClockSource) => void;
  snapshotCycleBars: number;
  onChangeSnapshotCycleBars: (bars: number) => void;
  chainSteps: ChainStep[];
  chainPlaying: boolean;
  chainIndex: number;
  onStartChain: () => void;
  onStopChain: () => void;
  onAddChainStep: () => void;
  onRemoveChainStep: (index: number) => void;
  onMoveChainStep: (from: number, to: number) => void;
  onUpdateChainBars: (index: number, bars: number) => void;
};
