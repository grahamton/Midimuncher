import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultSlots,
  type ControlElement,
  type MappingSlot,
  type MidiEvent,
  type MidiMsg,
  type MidiPortRef,
} from "@midi-playground/core";
import type {
  MidiBackendInfo,
  MidiPorts,
  RouteConfig,
  SessionLogStatus,
  SnapshotClockSource,
  SnapshotQueueStatus,
  SnapshotQuantizeKind,
} from "../../shared/ipcTypes";
import {
  defaultProjectState,
  type AppView,
  type ChainStep,
  type DeviceConfig,
  type ProjectState,
  type SnapshotMode,
  type SnapshotQuantize,
} from "../../shared/projectTypes";
import { useMidiBridgeClock } from "../services/midiBridge";
import {
  findSnapshotSlot,
  writeSnapshotToSlot,
} from "./snapshots/SnapshotsPage";
import { clampChannel, clampMidi } from "./lib/clamp";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;

export function defaultControls(): ControlElement[] {
  return [
    {
      id: "knob-1",
      type: "knob",
      label: "Knob 1",
      value: 0,
      slots: defaultSlots(),
    },
    {
      id: "knob-2",
      type: "knob",
      label: "Knob 2",
      value: 0,
      slots: defaultSlots(),
    },
    {
      id: "fader-1",
      type: "fader",
      label: "Fader 1",
      value: 0,
      slots: defaultSlots(),
    },
    {
      id: "button-1",
      type: "button",
      label: "Button 1",
      value: 0,
      slots: defaultSlots(),
    },
  ];
}

export function useAppController() {
  const defaults = defaultProjectState();
  const midiApi = typeof window !== "undefined" ? window.midi : undefined;

  // -- State --
  const [ports, setPorts] = useState<MidiPorts>({ inputs: [], outputs: [] });
  const [backends, setBackends] = useState<MidiBackendInfo[]>([]);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceConfig[]>([]);
  const { clock, relinkClock } = useMidiBridgeClock(midiApi);
  const clockBpm = clock.bpm;
  const [log, setLog] = useState<MidiEvent[]>([]);
  const [ccValue, setCcValue] = useState(64);
  const [note, setNote] = useState(60);
  const [loadingPorts, setLoadingPorts] = useState(false);
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [forceChannelEnabled, setForceChannelEnabled] = useState(true);
  const [routeChannel, setRouteChannel] = useState(1);
  const [allowNotes, setAllowNotes] = useState(true);
  const [allowCc, setAllowCc] = useState(true);
  const [allowExpression, setAllowExpression] = useState(true);
  const [allowTransport, setAllowTransport] = useState(true);
  const [allowClock, setAllowClock] = useState(true);
  const [clockDiv, setClockDiv] = useState(1);
  const [diagMessage, setDiagMessage] = useState<string | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [activeView, setActiveView] = useState<AppView>(defaults.activeView);

  // Snapshots
  const [snapshotsState, setSnapshotsState] = useState(defaults.snapshots);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [pendingSnapshotId, setPendingSnapshotId] = useState<string | null>(
    null
  );
  const [snapshotQuantize, setSnapshotQuantize] = useState<SnapshotQuantize>(
    defaults.snapshotQuantize
  );
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>(
    defaults.snapshotMode
  );
  const [snapshotFadeMs, setSnapshotFadeMs] = useState(defaults.snapshotFadeMs);
  const [snapshotClockSource, setSnapshotClockSource] =
    useState<SnapshotClockSource>(defaults.snapshotClockSource);
  const [snapshotCycleBars, setSnapshotCycleBars] = useState<number>(
    defaults.snapshotCycleBars
  );
  const [snapshotQueueStatus, setSnapshotQueueStatus] =
    useState<SnapshotQueueStatus | null>(null);

  // Stage Drop
  const [stageDropControlId, setStageDropControlId] = useState<string | null>(
    defaults.stageDropControlId
  );
  const [stageDropToValue, setStageDropToValue] = useState<number>(
    defaults.stageDropToValue
  );
  const [stageDropDurationMs, setStageDropDurationMs] = useState<number>(
    defaults.stageDropDurationMs
  );
  const [stageDropStepMs, setStageDropStepMs] = useState<number>(
    defaults.stageDropStepMs
  );
  const [stageDropPerSendSpacingMs, setStageDropPerSendSpacingMs] =
    useState<number>(defaults.stageDropPerSendSpacingMs);

  // Global Settings
  const [tempoBpm, setTempoBpm] = useState(defaults.tempoBpm);
  const [useClockSync, setUseClockSync] = useState(defaults.useClockSync);
  const [followClockStart, setFollowClockStart] = useState(
    defaults.followClockStart
  );

  // Chains
  const [chainSteps, setChainSteps] = useState<ChainStep[]>(
    defaults.chainSteps
  );
  const [chainPlaying, setChainPlaying] = useState(false);
  const chainTimerRef = useRef<number | null>(null);
  const [chainIndex, setChainIndex] = useState<number>(0);

  // Controls & Mapping
  const [controls, setControls] = useState<ControlElement[]>(() =>
    defaultControls()
  );
  const [selectedControlId, setSelectedControlId] = useState<string | null>(
    "knob-1"
  );
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Refs for callbacks
  const lastSentStateJsonRef = useRef<string | null>(null);
  const selectedInRef = useRef<string | null>(null);
  const devicesRef = useRef<DeviceConfig[]>([]);
  const selectedDeviceIdRef = useRef<string | null>(null);

  // Learn
  const [learnTarget, setLearnTarget] = useState<{
    controlId: string;
    slotIndex: number;
  } | null>(null);
  const learnTargetRef = useRef<{
    controlId: string;
    slotIndex: number;
  } | null>(null);
  const [learnStatus, setLearnStatus] = useState<
    "idle" | "listening" | "captured" | "timeout"
  >("idle");
  const learnTimerRef = useRef<number | null>(null);

  // Session
  const [sessionStatus, setSessionStatus] = useState<SessionLogStatus | null>(
    null
  );

  // -- Derived State updates (Refs) --
  useEffect(() => {
    selectedInRef.current = selectedIn;
  }, [selectedIn]);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);
  useEffect(() => {
    learnTargetRef.current = learnTarget;
  }, [learnTarget]);

  // -- Actions --
  async function refreshPorts() {
    if (!midiApi) return;
    setLoadingPorts(true);
    try {
      const available = await midiApi.listPorts();
      setPorts(available);
      setSelectedIn((current) => current ?? available.inputs[0]?.id ?? null);
      setSelectedOut((current) => current ?? available.outputs[0]?.id ?? null);
    } finally {
      setLoadingPorts(false);
    }
  }

  async function refreshBackends() {
    if (!midiApi) return;
    const list = await midiApi.listBackends();
    setBackends(list);
  }

  async function selectBackend(id: string) {
    if (!midiApi) return;
    await midiApi.setBackend(id);
    await refreshBackends();
    await refreshPorts();
  }

  // -- Hydration --
  useEffect(() => {
    if (!midiApi) return;

    let cancelled = false;

    (async () => {
      const loaded = await midiApi.loadProject();
      if (cancelled) return;

      const state = loaded?.state;
      if (state) {
        setSelectedIn(state.selectedIn);
        setSelectedOut(state.selectedOut);
        setActiveView(state.activeView ?? "setup");
        setSelectedDeviceId(state.selectedDeviceId);
        setDevices(
          Array.isArray(state.devices)
            ? state.devices.slice(0, MAX_DEVICES)
            : []
        );
        setRoutes(Array.isArray(state.routes) ? state.routes : []);
        setControls(
          Array.isArray(state.controls) && state.controls.length > 0
            ? state.controls
            : defaultControls()
        );
        setSelectedControlId(state.selectedControlId ?? "knob-1");

        // Settings hydration
        setForceChannelEnabled(
          state.ui?.routeBuilder?.forceChannelEnabled ?? true
        );
        setRouteChannel(state.ui?.routeBuilder?.routeChannel ?? 1);
        setAllowNotes(state.ui?.routeBuilder?.allowNotes ?? true);
        setAllowCc(state.ui?.routeBuilder?.allowCc ?? true);
        setAllowExpression(state.ui?.routeBuilder?.allowExpression ?? true);
        setAllowTransport(state.ui?.routeBuilder?.allowTransport ?? true);
        setAllowClock(state.ui?.routeBuilder?.allowClock ?? true);
        setClockDiv(state.ui?.routeBuilder?.clockDiv ?? 1);
        setNote(state.ui?.diagnostics?.note ?? 60);
        setCcValue(state.ui?.diagnostics?.ccValue ?? 64);
        setTempoBpm(state.tempoBpm ?? defaults.tempoBpm);
        setUseClockSync(state.useClockSync ?? defaults.useClockSync);
        setFollowClockStart(
          state.followClockStart ?? defaults.followClockStart
        );

        // Snapshot hydration
        setSnapshotQuantize(
          state.snapshotQuantize ?? defaults.snapshotQuantize
        );
        const nextSnapshots = state.snapshots ?? defaults.snapshots;
        const nextMode =
          state.snapshotMode ?? nextSnapshots.strategy ?? defaults.snapshotMode;
        const nextFadeMs =
          state.snapshotFadeMs ??
          nextSnapshots.fadeMs ??
          defaults.snapshotFadeMs;
        setSnapshotMode(nextMode);
        setSnapshotFadeMs(nextFadeMs);
        setSnapshotClockSource(
          state.snapshotClockSource ?? defaults.snapshotClockSource
        );
        setSnapshotCycleBars(
          state.snapshotCycleBars ?? defaults.snapshotCycleBars
        );
        setStageDropControlId(
          state.stageDropControlId ?? defaults.stageDropControlId
        );
        setStageDropToValue(
          state.stageDropToValue ?? defaults.stageDropToValue
        );
        setStageDropDurationMs(
          state.stageDropDurationMs ?? defaults.stageDropDurationMs
        );
        setStageDropStepMs(state.stageDropStepMs ?? defaults.stageDropStepMs);
        setStageDropPerSendSpacingMs(
          state.stageDropPerSendSpacingMs ?? defaults.stageDropPerSendSpacingMs
        );
        setSnapshotsState({
          ...nextSnapshots,
          strategy: nextMode,
          fadeMs: nextFadeMs,
        });

        setChainSteps(
          Array.isArray(state.chainSteps) && state.chainSteps.length
            ? state.chainSteps
            : defaults.chainSteps
        );
      }

      await refreshBackends();
      if (state?.backendId) {
        await selectBackend(state.backendId);
      } else {
        await refreshPorts();
      }

      const available = await midiApi.listPorts();
      if (cancelled) return;

      // Validate ports
      const validIn =
        state?.selectedIn &&
        available.inputs.some((p) => p.id === state.selectedIn)
          ? state.selectedIn
          : null;
      const validOut =
        state?.selectedOut &&
        available.outputs.some((p) => p.id === state.selectedOut)
          ? state.selectedOut
          : null;

      setSelectedIn(validIn ?? available.inputs[0]?.id ?? null);
      setSelectedOut(validOut ?? available.outputs[0]?.id ?? null);

      // Validate Devices/Routes against ports
      setDevices((current) =>
        current.slice(0, MAX_DEVICES).map((d) => ({
          ...d,
          inputId:
            d.inputId && available.inputs.some((p) => p.id === d.inputId)
              ? d.inputId
              : null,
          outputId:
            d.outputId && available.outputs.some((p) => p.id === d.outputId)
              ? d.outputId
              : null,
        }))
      );
      setRoutes((current) =>
        current.filter(
          (r) =>
            available.inputs.some((p) => p.id === r.fromId) &&
            available.outputs.some((p) => p.id === r.toId)
        )
      );

      setProjectHydrated(true);
    })().catch((err) => {
      console.error("Failed to load project", err);
      // Even if flush fails, we mark hydrated so we don't overwrite with empty state immediately
      setProjectHydrated(true);
    });

    // Subscriptions
    const unsubscribe = midiApi.onEvent((evt) => {
      // Learn Logic
      const target = learnTargetRef.current;
      const msg = evt.msg;
      if (target && msg.t === "cc") {
        const currentSelectedIn = selectedInRef.current;
        if (!currentSelectedIn || evt.src.id === currentSelectedIn) {
          learnTargetRef.current = null;
          setLearnTarget(null);
          if (learnTimerRef.current) {
            window.clearTimeout(learnTimerRef.current);
            learnTimerRef.current = null;
          }
          setLearnStatus("captured");

          setControls((current) =>
            current.map((c) => {
              if (c.id !== target.controlId) return c;
              const slots = [...c.slots];
              const existing = slots[target.slotIndex];
              // Fallback target logic
              const fallbackTarget =
                selectedDeviceIdRef.current ??
                devicesRef.current[0]?.id ??
                null;

              if (!existing || existing.kind !== "cc") {
                slots[target.slotIndex] = {
                  enabled: true,
                  kind: "cc",
                  cc: clampMidi(msg.cc),
                  channel: clampChannel(msg.ch),
                  min: 0,
                  max: 127,
                  curve: "linear",
                  targetDeviceId: fallbackTarget,
                };
              } else {
                slots[target.slotIndex] = {
                  ...existing,
                  enabled: true,
                  cc: clampMidi(msg.cc),
                  channel: clampChannel(msg.ch),
                  targetDeviceId: existing.targetDeviceId ?? fallbackTarget,
                };
              }
              return { ...c, slots };
            })
          );
        }
      }

      setLog((current) => [evt, ...current].slice(0, LOG_LIMIT));

      if (evt.msg.t === "start" && followClockStart) {
        // startChain(); // Defined below, we might need to expose this via ref or move logic
      }
      if (evt.msg.t === "stop" && followClockStart) {
        // stopChain();
      }
    });

    const unsubscribeSnapshotStatus = midiApi.onSnapshotStatus((status) => {
      setSnapshotQueueStatus(status);
      if (status.queueLength === 0) {
        setPendingSnapshotId(null);
      } else if (status.activeSnapshotId) {
        setPendingSnapshotId(status.activeSnapshotId);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeSnapshotStatus();
    };
  }, [midiApi]); // Minimal deps, mostly on mount/api availability

  // -- Port Opening --
  useEffect(() => {
    if (midiApi && selectedIn) midiApi.openIn(selectedIn);
  }, [selectedIn, midiApi]);

  useEffect(() => {
    if (midiApi && selectedOut) midiApi.openOut(selectedOut);
  }, [selectedOut, midiApi]);

  useEffect(() => {
    if (midiApi) void midiApi.setRoutes(routes);
  }, [routes, midiApi]);

  // -- Auto Save --
  useEffect(() => {
    if (!midiApi || !projectHydrated) return;

    const selectedBackendId = backends.find((b) => b.selected)?.id ?? null;
    const state: ProjectState = {
      backendId: selectedBackendId,
      selectedIn,
      selectedOut,
      activeView,
      selectedDeviceId,
      tempoBpm,
      useClockSync,
      followClockStart,
      snapshotQuantize,
      snapshotMode: snapshotsState.strategy,
      snapshotFadeMs: snapshotsState.fadeMs,
      snapshotClockSource,
      snapshotCycleBars,
      stageDropControlId,
      stageDropToValue,
      stageDropDurationMs,
      stageDropStepMs,
      stageDropPerSendSpacingMs,
      snapshots: snapshotsState,
      chainSteps,
      devices,
      routes,
      controls,
      selectedControlId,
      sequencer: defaults.sequencer,
      ui: {
        routeBuilder: {
          forceChannelEnabled,
          routeChannel,
          allowNotes,
          allowCc,
          allowExpression,
          allowTransport,
          allowClock,
          clockDiv,
        },
        diagnostics: { note, ccValue },
      },
    };

    const json = JSON.stringify(state);
    if (lastSentStateJsonRef.current === json) return;

    setSaveStatus("saving");
    const timer = setTimeout(() => {
      void midiApi
        .setProjectState(state)
        .then((ok) => {
          if (!ok) {
            setSaveStatus("error");
            return;
          }
          lastSentStateJsonRef.current = json;
          setLastSavedAt(Date.now());
          setSaveStatus("saved");
        })
        .catch((err) => {
          console.error("Failed to save project", err);
          setSaveStatus("error");
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [
    midiApi,
    projectHydrated,
    backends,
    selectedIn,
    selectedOut,
    activeView,
    selectedDeviceId,
    devices,
    routes,
    controls,
    selectedControlId,
    tempoBpm,
    useClockSync,
    followClockStart,
    snapshotQuantize,
    snapshotMode,
    snapshotFadeMs,
    snapshotClockSource,
    snapshotCycleBars,
    stageDropControlId,
    stageDropToValue,
    stageDropDurationMs,
    stageDropStepMs,
    stageDropPerSendSpacingMs,
    snapshotsState,
    chainSteps,
    forceChannelEnabled,
    routeChannel,
    allowNotes,
    allowCc,
    allowExpression,
    allowTransport,
    allowClock,
    clockDiv,
    note,
    ccValue,
  ]);

  // -- Session Status --
  useEffect(() => {
    if (!midiApi) return;
    let cancelled = false;
    void midiApi.sessionStatus().then((status) => {
      if (cancelled) return;
      setSessionStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [midiApi]);

  return {
    midiApi,
    ports,
    setPorts,
    backends,
    setBackends,
    refreshPorts,
    refreshBackends,
    selectBackend,
    selectedIn,
    setSelectedIn,
    selectedOut,
    setSelectedOut,
    selectedDeviceId,
    setSelectedDeviceId,
    devices,
    setDevices,
    clock,
    relinkClock,
    clockBpm,
    log,
    setLog,
    ccValue,
    setCcValue,
    note,
    setNote,
    loadingPorts,
    setLoadingPorts,
    routes,
    setRoutes,
    forceChannelEnabled,
    setForceChannelEnabled,
    routeChannel,
    setRouteChannel,
    allowNotes,
    setAllowNotes,
    allowCc,
    setAllowCc,
    allowExpression,
    setAllowExpression,
    allowTransport,
    setAllowTransport,
    allowClock,
    setAllowClock,
    clockDiv,
    setClockDiv,
    diagMessage,
    setDiagMessage,
    diagRunning,
    setDiagRunning,
    activeView,
    setActiveView,
    snapshotsState,
    setSnapshotsState,
    activeSnapshotId,
    setActiveSnapshotId,
    pendingSnapshotId,
    setPendingSnapshotId,
    snapshotQuantize,
    setSnapshotQuantize,
    snapshotMode,
    setSnapshotMode,
    snapshotFadeMs,
    setSnapshotFadeMs,
    snapshotClockSource,
    setSnapshotClockSource,
    snapshotCycleBars,
    setSnapshotCycleBars,
    snapshotQueueStatus,
    setSnapshotQueueStatus,
    stageDropControlId,
    setStageDropControlId,
    stageDropToValue,
    setStageDropToValue,
    stageDropDurationMs,
    setStageDropDurationMs,
    stageDropStepMs,
    setStageDropStepMs,
    stageDropPerSendSpacingMs,
    setStageDropPerSendSpacingMs,
    tempoBpm,
    setTempoBpm,
    useClockSync,
    setUseClockSync,
    followClockStart,
    setFollowClockStart,
    chainSteps,
    setChainSteps,
    chainPlaying,
    setChainPlaying,
    chainIndex,
    setChainIndex,
    chainTimerRef,
    controls,
    setControls,
    selectedControlId,
    setSelectedControlId,
    projectHydrated,
    saveStatus,
    setSaveStatus,
    lastSavedAt,
    setLastSavedAt,
    learnTarget,
    setLearnTarget,
    learnStatus,
    setLearnStatus,
    learnTimerRef,
    sessionStatus,
    setSessionStatus,
  };
}
