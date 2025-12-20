import { useEffect, useMemo, useRef, useState } from "react";
import type { DeviceConfig } from "../../shared/projectTypes";
import type { BridgeClock } from "../services/midiBridge";
import type { SnapshotQuantizeKind, SnapshotQueueStatus } from "../../shared/ipcTypes";
import { quantizeLaunch, type QuantizeKind } from "./lib/stage/transition";
import { StageHeader } from "./stage/StageHeader";
import { StageRigPanel } from "./stage/StageRigPanel";
import { StageSceneGrid } from "./stage/StageSceneGrid";
import { stageStyles } from "./stage/styles";

export type StagePageProps = {
  clock: BridgeClock;
  queueStatus: SnapshotQueueStatus | null;
  snapshots: string[];
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string, quantize: SnapshotQuantizeKind) => void;
  onDrop: (name: string) => void;
  devices: DeviceConfig[];
  onSendCc: (deviceId: string, cc: number, val: number) => void;
  dropMacroControls: Array<{ id: string; label: string }>;
  dropMacroControlId: string | null;
  onChangeDropMacroControlId: (id: string | null) => void;
  dropMacroToValue: number;
  onChangeDropMacroToValue: (value: number) => void;
  dropDurationMs: number;
  onChangeDropDurationMs: (ms: number) => void;
};

type TransitionState =
  | { status: "idle" }
  | { status: "armed"; scene: string; dueAt: number; quantize: QuantizeKind }
  | { status: "executing"; scene: string };

export function StagePage({
  clock,
  queueStatus,
  snapshots,
  activeSnapshot,
  onSelectSnapshot,
  onDrop,
  devices,
  onSendCc,
  dropMacroControls,
  dropMacroControlId,
  onChangeDropMacroControlId,
  dropMacroToValue,
  onChangeDropMacroToValue,
  dropDurationMs,
  onChangeDropDurationMs
}: StagePageProps) {
  const [quantize, setQuantize] = useState<QuantizeKind>("bar");
  const [transition, setTransition] = useState<TransitionState>({ status: "idle" });
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const mapQuantize = (kind: QuantizeKind, immediate: boolean): SnapshotQuantizeKind => {
    if (immediate) return "immediate";
    return kind === "beat" ? "beat" : "bar";
  };

  const armScene = (scene: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    const launch = quantizeLaunch(clock, quantize);
    setTransition({ status: "armed", scene, dueAt: launch.dueAt, quantize });

    const quantizeKind = mapQuantize(quantize, launch.delayMs <= 0 || clock.stale);
    onSelectSnapshot(scene, quantizeKind);

    executeScene(scene);
  };

  const dropScene = (scene: string) => {
    setTransition({ status: "armed", scene, dueAt: Date.now(), quantize: "bar" });
    onDrop(scene);
    executeScene(scene);
  };

  const rig = useMemo(() => {
    const lanes = [1, 2, 3, 4];
    return lanes.map((lane) => devices.find((d) => d.lane === lane) ?? null);
  }, [devices]);
  const [ccValues, setCcValues] = useState<Record<string, number>>({});
  const throttleRef = useRef<Map<string, { lastAt: number; timer: number | null }>>(new Map());

  const setCc = (deviceId: string, cc: number, next: number) => {
    const key = `${deviceId}:${cc}`;
    const clamped = Math.min(Math.max(Math.round(next), 0), 127);
    setCcValues((current) => ({ ...current, [key]: clamped }));

    const now = performance.now();
    const slot = throttleRef.current.get(key) ?? { lastAt: 0, timer: null };
    const minInterval = 20;
    const delta = now - slot.lastAt;

    const send = () => {
      slot.lastAt = performance.now();
      if (slot.timer != null) {
        window.clearTimeout(slot.timer);
        slot.timer = null;
      }
      throttleRef.current.set(key, slot);
      onSendCc(deviceId, cc, clamped);
    };

    if (delta >= minInterval) {
      send();
      return;
    }
    if (slot.timer != null) window.clearTimeout(slot.timer);
    slot.timer = window.setTimeout(send, Math.max(1, Math.round(minInterval - delta)));
    throttleRef.current.set(key, slot);
  };

  const executeScene = (scene: string) => {
    setTransition({ status: "executing", scene });
    timerRef.current = window.setTimeout(() => setTransition({ status: "idle" }), 400);
  };

  const currentTransitionScene = transition.status === "idle" ? null : transition.scene;
  const transitionQuantize = transition.status === "armed" ? transition.quantize : quantize;

  return (
    <div style={stageStyles.page}>
      <StageHeader
        clock={clock}
        queueStatus={queueStatus}
        quantize={quantize}
        setQuantize={setQuantize}
        dropMacroControls={dropMacroControls}
        dropMacroControlId={dropMacroControlId}
        onChangeDropMacroControlId={onChangeDropMacroControlId}
        dropMacroToValue={dropMacroToValue}
        onChangeDropMacroToValue={onChangeDropMacroToValue}
        dropDurationMs={dropDurationMs}
        onChangeDropDurationMs={onChangeDropDurationMs}
        transitionStatus={transition.status}
        transitionScene={currentTransitionScene}
        transitionQuantize={transitionQuantize}
      />

      <StageSceneGrid
        snapshots={snapshots}
        activeSnapshot={activeSnapshot}
        transitionStatus={transition.status}
        transitionScene={currentTransitionScene}
        onArmScene={armScene}
        onDropScene={dropScene}
      />

      <StageRigPanel rig={rig} ccValues={ccValues} onSendCc={setCc} />
    </div>
  );
}
