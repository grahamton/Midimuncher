import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cpu,
  HelpCircle,
  Layers,
  Link as LinkIcon,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Settings,
  Square,
  Trash2,
  Zap,
} from "lucide-react";
import {
  defaultSlots,
  getInstrumentProfile,
  INSTRUMENT_PROFILES,
} from "@midi-playground/core";
import type {
  ControlElement,
  MappingSlot,
  MidiEvent,
  MidiMsg,
  MidiPortRef,
  SnapshotState,
} from "@midi-playground/core";
import type {
  MidiBackendInfo,
  MidiPortInfo,
  MidiPorts,
  MidiSendPayload,
  RouteConfig,
  RouteFilter,
  SessionLogStatus,
  SnapshotDropBundlePayload,
  SnapshotClockSource,
  SnapshotQueueStatus,
  SnapshotQuantizeKind,
  SnapshotSchedulePayload,
} from "../../shared/ipcTypes";
import { defaultProjectState } from "../../shared/projectTypes";
import type {
  AppView,
  ChainStep,
  DeviceConfig,
  ProjectState,
  SnapshotMode,
  SnapshotQuantize,
  SnapshotsState,
} from "../../shared/projectTypes";
import { useMidiBridgeClock, type BridgeClock } from "../services/midiBridge";
import { StagePage } from "./StagePage";
import { ControlLabPage } from "./ControlLabPage";
import { SurfaceBoardPage } from "./SurfaceBoardPage";
import { AssignmentWizardStub } from "./components/AssignmentWizardStub";
import { Page, PageHeader, Panel } from "./components/layout";
import { MappingPage } from "./mapping/MappingPage";
import { ChainsPage } from "./chains/ChainsPage";
import { MonitorPage } from "./monitor/MonitorPage";
import { styles } from "./styles";
import { clampChannel, clampMidi } from "./lib/clamp";
import {
  SnapshotsPage,
  listSnapshotNames,
  findSnapshotSlot,
  findSnapshotIdByName,
  writeSnapshotToSlot,
} from "./snapshots/SnapshotsPage";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;

function defaultControls(): ControlElement[] {
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

export function App() {
  const defaults = defaultProjectState();
  const midiApi = typeof window !== "undefined" ? window.midi : undefined;
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
  const [tempoBpm, setTempoBpm] = useState(defaults.tempoBpm);
  const [useClockSync, setUseClockSync] = useState(defaults.useClockSync);
  const [followClockStart, setFollowClockStart] = useState(
    defaults.followClockStart
  );
  const [chainSteps, setChainSteps] = useState<ChainStep[]>(
    defaults.chainSteps
  );
  const [chainPlaying, setChainPlaying] = useState(false);
  const chainTimerRef = useRef<number | null>(null);
  const [chainIndex, setChainIndex] = useState<number>(0);
  const [controls, setControls] = useState<ControlElement[]>(() =>
    defaultControls()
  );
  const [selectedControlId, setSelectedControlId] = useState<string>("knob-1");
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastSentStateJsonRef = useRef<string | null>(null);
  const selectedInRef = useRef<string | null>(null);
  const devicesRef = useRef<DeviceConfig[]>([]);
  const selectedDeviceIdRef = useRef<string | null>(null);
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
  const [sessionStatus, setSessionStatus] = useState<SessionLogStatus | null>(
    null
  );

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
        setSnapshotQuantize(
          state.snapshotQuantize ?? defaults.snapshotQuantize
        );
        const nextSnapshots = state.snapshots ?? defaults.snapshots;
        const nextMode: SnapshotMode =
          state.snapshotMode ?? nextSnapshots.strategy ?? defaults.snapshotMode;
        const nextFadeMs =
          state.snapshotFadeMs ?? nextSnapshots.fadeMs ?? defaults.snapshotFadeMs;
        setSnapshotMode(nextMode);
        setSnapshotFadeMs(nextFadeMs);
        setSnapshotClockSource(
          state.snapshotClockSource ?? defaults.snapshotClockSource
        );
        setSnapshotCycleBars(state.snapshotCycleBars ?? defaults.snapshotCycleBars);
        setStageDropControlId(
          state.stageDropControlId ?? defaults.stageDropControlId
        );
        setStageDropToValue(state.stageDropToValue ?? defaults.stageDropToValue);
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
      setProjectHydrated(true);
    });

    const unsubscribe = midiApi.onEvent((evt) => {
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
        startChain();
      }
      if (evt.msg.t === "stop" && followClockStart) {
        stopChain();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiApi]);

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

  const refreshSessionStatus = async () => {
    if (!midiApi) return;
    const status = await midiApi.sessionStatus();
    setSessionStatus(status);
  };

  const startSessionRecording = async () => {
    if (!midiApi) return;
    const status = await midiApi.sessionStart();
    setSessionStatus(status);
  };

  const stopSessionRecording = async () => {
    if (!midiApi) return;
    const status = await midiApi.sessionStop();
    setSessionStatus(status);
  };

  const revealSessionLog = async () => {
    if (!midiApi) return;
    await midiApi.sessionReveal();
    await refreshSessionStatus();
  };

  useEffect(() => {
    learnTargetRef.current = learnTarget;
  }, [learnTarget]);

  useEffect(() => {
    if (midiApi && selectedIn) {
      midiApi.openIn(selectedIn);
    }
  }, [selectedIn, midiApi]);

  useEffect(() => {
    if (midiApi && selectedOut) {
      midiApi.openOut(selectedOut);
    }
  }, [selectedOut, midiApi]);

  useEffect(() => {
    if (midiApi) {
      void midiApi.setRoutes(routes);
    }
  }, [routes, midiApi]);

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
        diagnostics: {
          note,
          ccValue,
        },
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
      snapshotMode,
      snapshotFadeMs,
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
        diagnostics: {
          note,
          ccValue,
        },
      },
    };

    const handler = () => {
      void midiApi.setProjectState(state).then(() => midiApi.flushProject());
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [
    midiApi,
    projectHydrated,
    backends,
    selectedIn,
    selectedOut,
    activeView,
    selectedDeviceId,
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
    devices,
    routes,
    controls,
    selectedControlId,
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

  const activity = useMemo(
    () =>
      log.map((evt, idx) => ({
        ...evt,
        label: describeMsg(evt.msg),
        _rowId: `${evt.ts}-${evt.src.id}-${idx}`,
      })),
    [log]
  );
  const logCapReached = activity.length >= LOG_LIMIT;
  const clockStale = useMemo(
    () => useClockSync && clock.stale,
    [clock.stale, useClockSync]
  );

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

  async function panicAll() {
    if (!midiApi) return;
    const panicSrc: MidiPortRef = {
      kind: "virtual",
      id: "panic",
      name: "Panic",
    };
    const ts = Date.now();
    setLog((current) =>
      [{ ts, src: panicSrc, msg: { t: "stop" } as MidiMsg }, ...current].slice(
        0,
        LOG_LIMIT
      )
    );
    const outs = ports.outputs;
    for (const out of outs) {
      for (let ch = 1; ch <= 16; ch++) {
        await midiApi.send({
          portId: out.id,
          msg: { t: "cc", ch, cc: 123, val: 0 },
        });
        await midiApi.send({
          portId: out.id,
          msg: { t: "cc", ch, cc: 120, val: 0 },
        });
      }
      await midiApi.send({ portId: out.id, msg: { t: "stop" } });
    }
  }

  async function resetProject() {
    if (!midiApi) return;
    const ok = window.confirm(
      "Reset project? This clears devices, routes, and mappings."
    );
    if (!ok) return;

    const selectedBackendId = backends.find((b) => b.selected)?.id ?? null;
    const base = defaultProjectState();
    const state: ProjectState = {
      ...base,
      backendId: selectedBackendId,
      selectedIn,
      selectedOut,
      selectedDeviceId: null,
      controls: defaultControls(),
      selectedControlId: "knob-1",
    };

    setActiveView(state.activeView);
    setSelectedDeviceId(state.selectedDeviceId);
    setDevices(state.devices);
    setRoutes(state.routes);
    setControls(state.controls);
    setSelectedControlId(state.selectedControlId ?? "knob-1");
    setForceChannelEnabled(state.ui.routeBuilder.forceChannelEnabled);
    setRouteChannel(state.ui.routeBuilder.routeChannel);
    setAllowNotes(state.ui.routeBuilder.allowNotes);
    setAllowCc(state.ui.routeBuilder.allowCc);
    setAllowExpression(state.ui.routeBuilder.allowExpression);
    setAllowTransport(state.ui.routeBuilder.allowTransport);
    setAllowClock(state.ui.routeBuilder.allowClock);
    setClockDiv(state.ui.routeBuilder.clockDiv);
    setNote(state.ui.diagnostics.note);
    setCcValue(state.ui.diagnostics.ccValue);

    setSaveStatus("saving");
    const saved = await midiApi.setProjectState(state);
    if (saved) {
      await midiApi.flushProject();
      lastSentStateJsonRef.current = JSON.stringify(state);
      setLastSavedAt(Date.now());
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  }

  function startLearn(controlId: string, slotIndex: number) {
    if (learnTimerRef.current) {
      window.clearTimeout(learnTimerRef.current);
      learnTimerRef.current = null;
    }

    const next = { controlId, slotIndex };
    learnTargetRef.current = next;
    setLearnTarget(next);
    setLearnStatus("listening");

    learnTimerRef.current = window.setTimeout(() => {
      learnTargetRef.current = null;
      setLearnTarget(null);
      setLearnStatus("timeout");
      learnTimerRef.current = null;
    }, 10000);
  }

  function cancelLearn() {
    learnTargetRef.current = null;
    setLearnTarget(null);
    setLearnStatus("idle");
    if (learnTimerRef.current) {
      window.clearTimeout(learnTimerRef.current);
      learnTimerRef.current = null;
    }
  }

  async function refreshBackends() {
    if (!midiApi) return;
    try {
      const infos = await midiApi.listBackends();
      setBackends(infos);
    } catch (err) {
      console.error(err);
    }
  }

  async function selectBackend(id: string) {
    if (!midiApi) return;
    await midiApi.setBackend(id);
    await refreshBackends();
    await refreshPorts();
  }

  async function runDiagnostics() {
    if (!midiApi) return;
    if (!selectedOut) {
      setDiagMessage("Select an output port first.");
      return;
    }
    setDiagRunning(true);
    setDiagMessage("Sending test note...");
    try {
      const ok = await midiApi.send({
        portId: selectedOut,
        msg: { t: "noteOn", ch: DIAG_CHANNEL, note: DIAG_NOTE, vel: 100 },
      });
      setTimeout(() => {
        midiApi.send({
          portId: selectedOut,
          msg: { t: "noteOff", ch: DIAG_CHANNEL, note: DIAG_NOTE, vel: 0 },
        });
      }, 150);
      setDiagMessage(
        ok ? "Test note sent. Check downstream device/monitor." : "Send failed."
      );
    } catch (err) {
      console.error(err);
      setDiagMessage("Diagnostics failed to send.");
    } finally {
      setDiagRunning(false);
    }
  }

  async function sendTestNote() {
    if (!midiApi || !selectedOut) return;
    const channel = 1;
    await midiApi.send({
      portId: selectedOut,
      msg: { t: "noteOn", ch: channel, note, vel: 110 },
    });
    setTimeout(() => {
      midiApi.send({
        portId: selectedOut,
        msg: { t: "noteOff", ch: channel, note, vel: 0 },
      });
    }, 220);
  }

  async function sendCc() {
    if (!midiApi || !selectedOut) return;
    await midiApi.send({
      portId: selectedOut,
      msg: { t: "cc", ch: 1, cc: 1, val: ccValue },
    });
  }

  async function sendQuickNote(
    portId: string | null,
    channel: number,
    noteValue: number,
    velocity = 100
  ) {
    if (!midiApi || !portId) return;
    await midiApi.send({
      portId,
      msg: { t: "noteOn", ch: channel, note: noteValue, vel: velocity },
    });
    setTimeout(() => {
      void midiApi.send({
        portId,
        msg: { t: "noteOff", ch: channel, note: noteValue, vel: 0 },
      });
    }, 180);
  }

  async function sendQuickCc(
    portId: string | null,
    channel: number,
    cc: number,
    val: number
  ) {
    if (!midiApi || !portId) return;
    await midiApi.send({ portId, msg: { t: "cc", ch: channel, cc, val } });
  }

  async function sendQuickProgram(
    portId: string | null,
    channel: number,
    program: number
  ) {
    if (!midiApi || !portId) return;
    await midiApi.send({
      portId,
      msg: { t: "programChange", ch: channel, program },
    });
  }

  function addDevice() {
    if (devices.length >= MAX_DEVICES) return;
    const nextIndex = devices.length + 1;
    setDevices((current) => [
      ...current,
      {
        id: `device-${Date.now().toString(36)}-${nextIndex}`,
        name: `Device ${nextIndex}`,
        instrumentId: null,
        lane: nextIndex,
        inputId: ports.inputs[0]?.id ?? null,
        outputId: ports.outputs[0]?.id ?? null,
        channel: 1,
        clockEnabled: true,
      },
    ]);
  }

  function updateDevice(id: string, partial: Partial<DeviceConfig>) {
    setDevices((current) => {
      const next = current.map((d) => (d.id === id ? { ...d, ...partial } : d));
      if (typeof partial.lane !== "number") return next;
      const lane = Math.min(MAX_DEVICES, Math.max(1, Math.round(partial.lane)));
      const idx = next.findIndex((d) => d.id === id);
      if (idx < 0) return next;
      const otherIdx = next.findIndex((d) => d.id !== id && d.lane === lane);
      if (otherIdx < 0) {
        next[idx] = { ...next[idx]!, lane };
        return next;
      }
      const currentLane = next[idx]!.lane;
      next[idx] = { ...next[idx]!, lane };
      next[otherIdx] = { ...next[otherIdx]!, lane: currentLane };
      return next;
    });
  }

  function removeDevice(id: string) {
    setDevices((current) => current.filter((d) => d.id !== id));
    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  }

  function addRoute() {
    if (!midiApi) return;
    const device = selectedDeviceId
      ? devices.find((d) => d.id === selectedDeviceId)
      : null;
    const fromId = device?.inputId ?? selectedIn;
    const toId = device?.outputId ?? selectedOut;
    if (!fromId || !toId) return;
    const channelToForce = device?.channel ?? routeChannel;
    const allowTypes: MidiMsg["t"][] = [];
    if (allowNotes) {
      allowTypes.push("noteOn", "noteOff");
    }
    if (allowCc) {
      allowTypes.push("cc");
    }
    if (allowExpression) {
      allowTypes.push("pitchBend", "aftertouch");
    }
    if (allowTransport) {
      allowTypes.push("start", "stop", "continue");
    }
    if (allowClock) {
      allowTypes.push("clock");
    }
    const filter: RouteFilter = {
      allowTypes: allowTypes.length ? allowTypes : undefined,
      clockDiv: clockDiv > 1 ? clockDiv : undefined,
    };
    const route: RouteConfig = {
      id: makeRouteId(),
      fromId,
      toId,
      channelMode: forceChannelEnabled ? "force" : "passthrough",
      forceChannel: forceChannelEnabled
        ? clampChannel(channelToForce)
        : undefined,
      filter,
    };
    setRoutes((current) => [...current, route]);
  }

  function addDeviceRoutes() {
    setRoutes((current) => {
      const next = [...current];
      devices.forEach((device) => {
        if (!device.inputId || !device.outputId) return;
        const exists = next.some(
          (r) => r.fromId === device.inputId && r.toId === device.outputId
        );
        if (exists) return;
        const allowTypes: MidiMsg["t"][] = [];
        if (allowNotes) allowTypes.push("noteOn", "noteOff");
        if (allowCc) allowTypes.push("cc");
        if (allowExpression) allowTypes.push("pitchBend", "aftertouch");
        if (allowTransport) allowTypes.push("start", "stop", "continue");
        if (allowClock) allowTypes.push("clock");
        next.push({
          id: makeRouteId(),
          fromId: device.inputId,
          toId: device.outputId,
          channelMode: forceChannelEnabled ? "force" : "passthrough",
          forceChannel: forceChannelEnabled
            ? clampChannel(device.channel ?? routeChannel)
            : undefined,
          filter: {
            allowTypes: allowTypes.length ? allowTypes : undefined,
            clockDiv: clockDiv > 1 ? clockDiv : undefined,
          },
        });
      });
      return next;
    });
  }

  async function quickStart() {
    if (!midiApi) return;
    setLoadingPorts(true);
    try {
      const available = await midiApi.listPorts();
      setPorts(available);
      const nextIn = available.inputs[0]?.id ?? null;
      const nextOut = available.outputs[0]?.id ?? null;
      setSelectedIn(nextIn);
      setSelectedOut(nextOut);
      if (nextIn && nextOut) {
        const exists = routes.some(
          (r) => r.fromId === nextIn && r.toId === nextOut
        );
        if (!exists) {
          const allowTypes: MidiMsg["t"][] = [];
          if (allowNotes) {
            allowTypes.push("noteOn", "noteOff");
          }
          if (allowCc) {
            allowTypes.push("cc");
          }
          if (allowExpression) {
            allowTypes.push("pitchBend", "aftertouch");
          }
          if (allowTransport) {
            allowTypes.push("start", "stop", "continue");
          }
          if (allowClock) {
            allowTypes.push("clock");
          }

          setRoutes((current) => [
            ...current,
            {
              id: makeRouteId(),
              fromId: nextIn,
              toId: nextOut,
              channelMode: forceChannelEnabled ? "force" : "passthrough",
              forceChannel: forceChannelEnabled
                ? clampChannel(routeChannel)
                : undefined,
              filter: {
                allowTypes: allowTypes.length ? allowTypes : undefined,
                clockDiv: clockDiv > 1 ? clockDiv : undefined,
              },
            },
          ]);
        }
      }
    } finally {
      setLoadingPorts(false);
    }
  }

  function removeRoute(id: string) {
    setRoutes((current) => current.filter((r) => r.id !== id));
  }

  function portName(id: string) {
    const found = [...ports.inputs, ...ports.outputs].find((p) => p.id === id);
    return found ? formatPortLabel(found.name) : id;
  }

  function clearLog() {
    setLog([]);
  }

  const selectedControl =
    controls.find((c) => c.id === selectedControlId) ?? controls[0];

  function updateControl(id: string, partial: Partial<ControlElement>) {
    setControls((current) =>
      current.map((c) => (c.id === id ? { ...c, ...partial } : c))
    );
  }

  function updateSlot(
    controlId: string,
    slotIndex: number,
    partial: Partial<MappingSlot>
  ) {
    setControls((current) =>
      current.map((c) => {
        if (c.id !== controlId) return c;
        const slots = [...c.slots];
        const existing = slots[slotIndex];
        if (!existing) return c;
        slots[slotIndex] = {
          ...(existing as any),
          ...(partial as any),
        } as MappingSlot;
        return { ...c, slots };
      })
    );
  }

  async function emitControl(control: ControlElement, rawValue: number) {
    if (!midiApi) return;
    await midiApi.emitMapping({
      control: { ...control, value: clampMidi(rawValue) },
      value: clampMidi(rawValue),
      devices: devices.map((d) => ({
        id: d.id,
        outputId: d.outputId,
        channel: d.channel,
      })),
    });
  }

  async function sendOxiTransport(cc: 105 | 106 | 107) {
    if (!midiApi || !selectedOut) return;
    await midiApi.send({
      portId: selectedOut,
      msg: { t: "cc", ch: 1, cc, val: 127 },
    });
  }

  async function sendDeviceCc(deviceId: string, cc: number, val: number) {
    if (!midiApi) return;
    const device = devices.find((d) => d.id === deviceId);
    if (!device?.outputId) return;
    await midiApi.openOut(device.outputId);
    await midiApi.send({
      portId: device.outputId,
      msg: { t: "cc", ch: clampChannel(device.channel), cc: clampMidi(cc), val: clampMidi(val) },
    });
  }

  function snapshotQuantizeToKind(q: SnapshotQuantize): SnapshotQuantizeKind {
    switch (q) {
      case "bar4":
        return "bar4";
      case "bar1":
        return "bar";
      default:
        return "immediate";
    }
  }

  async function scheduleSnapshot(
    snapshotId: string,
    overrides?: {
      quantize?: SnapshotQuantizeKind;
      strategy?: SnapshotMode;
    }
  ) {
    if (!midiApi) return;
    const found = findSnapshotSlot(snapshotId, snapshotsState);
    if (!found?.slot.snapshot) return;
    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const strategy = overrides?.strategy ?? snapshotsState.strategy;
    const payload: SnapshotSchedulePayload = {
      snapshotId,
      snapshotName: found.slot.name,
      snapshot: found.slot.snapshot,
      strategy,
      fadeMs: snapshotsState.fadeMs,
      commitDelayMs: snapshotsState.commitDelayMs,
      burst: snapshotsState.burst,
      clockSource: snapshotClockSource,
      quantize: overrides?.quantize ?? snapshotQuantizeToKind(snapshotQuantize),
      cycleLengthBars: snapshotCycleBars,
      bpm: effectiveBpm,
    };
    const ok = await midiApi.scheduleSnapshot(payload);
    if (!ok) {
      setPendingSnapshotId(null);
    }
  }

  function triggerSnapshot(
    snapshotId: string,
    quantizeOverride?: SnapshotQuantizeKind
  ) {
    setActiveSnapshotId(snapshotId);
    setPendingSnapshotId(snapshotId);
    void scheduleSnapshot(snapshotId, { quantize: quantizeOverride });
  }

  function dropSnapshot(snapshotId: string) {
    setActiveSnapshotId(snapshotId);
    setPendingSnapshotId(snapshotId);
    if (!midiApi) return;
    const found = findSnapshotSlot(snapshotId, snapshotsState);
    if (!found?.slot.snapshot) return;

    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const schedule: SnapshotSchedulePayload = {
      snapshotId,
      snapshotName: found.slot.name,
      snapshot: found.slot.snapshot,
      strategy: "commit",
      fadeMs: snapshotsState.fadeMs,
      commitDelayMs: snapshotsState.commitDelayMs,
      burst: snapshotsState.burst,
      clockSource: snapshotClockSource,
      quantize: "immediate",
      cycleLengthBars: snapshotCycleBars,
      bpm: effectiveBpm,
    };

    const control =
      stageDropControlId && controls.find((c) => c.id === stageDropControlId)
        ? controls.find((c) => c.id === stageDropControlId)!
        : null;

    const payload: SnapshotDropBundlePayload = {
      schedule,
      macroRamp: control
        ? {
            control,
            from: clampMidi(control.value),
            to: clampMidi(stageDropToValue),
            durationMs: Math.max(0, Math.round(stageDropDurationMs)),
            stepMs: Math.max(10, Math.round(stageDropStepMs)),
            perSendSpacingMs: Math.max(0, Math.round(stageDropPerSendSpacingMs)),
          }
        : null,
    };

    void midiApi.scheduleDropBundle(payload).then((ok) => {
      if (!ok) setPendingSnapshotId(null);
    });
  }

  function playChainStep(idx: number) {
    if (idx >= chainSteps.length) {
      setChainPlaying(false);
      setChainIndex(0);
      return;
    }
    setChainIndex(idx);
    const snapshotId = findSnapshotIdByName(
      chainSteps[idx].snapshot,
      snapshotsState
    );
    if (snapshotId) {
      triggerSnapshot(snapshotId);
    }
    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const barMs = 60000 / Math.max(1, effectiveBpm) * 4;
    const delayMs = barMs * Math.max(1, chainSteps[idx].bars);
    if (delayMs === 0) {
      playChainStep(idx + 1);
      return;
    }
    chainTimerRef.current = window.setTimeout(
      () => playChainStep(idx + 1),
      delayMs
    );
  }

  function startChain() {
    if (chainSteps.length === 0) return;
    if (chainTimerRef.current) {
      window.clearTimeout(chainTimerRef.current);
      chainTimerRef.current = null;
    }
    setChainPlaying(true);
    playChainStep(0);
  }

  function stopChain() {
    if (chainTimerRef.current) {
      window.clearTimeout(chainTimerRef.current);
      chainTimerRef.current = null;
    }
    setChainPlaying(false);
    setChainIndex(0);
    setPendingSnapshotId(null);
  }

  function addChainStep() {
    const activeSlotName = activeSnapshotId
      ? findSnapshotSlot(activeSnapshotId, snapshotsState)?.slot.name ?? null
      : null;
    const snapshot = activeSlotName ?? snapshotsState.banks[0]?.slots[0]?.name;
    if (!snapshot) return;
    setChainSteps((current) => [...current, { snapshot, bars: 4 }]);
  }

  function removeChainStep(index: number) {
    setChainSteps((current) => current.filter((_, idx) => idx !== index));
  }

  function moveChainStep(from: number, to: number) {
    setChainSteps((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  function updateChainBars(index: number, bars: number) {
    setChainSteps((current) =>
      current.map((step, idx) =>
        idx === index
          ? { ...step, bars: Math.max(1, Math.min(64, bars)) }
          : step
      )
    );
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
      ? "Saved"
      : saveStatus === "error"
      ? "Save error"
      : "Idle";

  async function flushProjectNow() {
    if (!midiApi) return;
    setSaveStatus("saving");
    await midiApi.setProjectState({
      backendId: backends.find((b) => b.selected)?.id ?? null,
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
      chainSteps,
      snapshots: snapshotsState,
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
        diagnostics: {
          note,
          ccValue,
        },
      },
    });
    await midiApi.flushProject();
    setLastSavedAt(Date.now());
    setSaveStatus("saved");
  }

  const route = activeView;
  const monitorRows = activity.slice(0, 12);

  return (
    <div style={styles.window}>
      <AppChrome>
        <TopStatusBar
          saveLabel={saveLabel}
          lastSavedAt={lastSavedAt}
          onRefresh={refreshPorts}
          onReset={resetProject}
          onSave={flushProjectNow}
          midiReady={Boolean(midiApi)}
          loadingPorts={loadingPorts}
          tempo={(useClockSync && clockBpm) || tempoBpm || 120}
          onTempoChange={(bpm) => {
            setTempoBpm(bpm);
            if (useClockSync) setUseClockSync(false);
          }}
          clockBpm={clockBpm}
          useClockSync={useClockSync}
          clockStale={clockStale}
          onRelinkClock={relinkClock}
          onToggleClockSync={setUseClockSync}
          followClockStart={followClockStart}
          onToggleFollowClockStart={setFollowClockStart}
          backendLabel={backends.find((b) => b.selected)?.label ?? "No backend"}
          inputLabel={
            selectedIn
              ? formatPortLabel(
                  ports.inputs.find((p) => p.id === selectedIn)?.name ??
                    selectedIn
                )
              : "No input"
          }
          outputLabel={
            selectedOut
              ? formatPortLabel(
                  ports.outputs.find((p) => p.id === selectedOut)?.name ??
                    selectedOut
                )
              : "No output"
          }
        />
        <BodySplitPane>
          <LeftNavRail
            route={route}
            onChangeRoute={(next) => setActiveView(next)}
            onPanic={panicAll}
          />
          <MainContentArea
            route={route}
            ports={ports}
            clock={clock}
            devices={devices}
            updateDevice={updateDevice}
            selectedIn={selectedIn}
            selectedOut={selectedOut}
            onSelectIn={setSelectedIn}
            onSelectOut={setSelectedOut}
            diagMessage={diagMessage}
            diagRunning={diagRunning}
            onRunDiagnostics={runDiagnostics}
            onQuickStart={quickStart}
            loadingPorts={loadingPorts}
            logCapReached={logCapReached}
            sessionStatus={sessionStatus}
            onSessionStart={() => void startSessionRecording()}
            onSessionStop={() => void stopSessionRecording()}
            onSessionReveal={() => void revealSessionLog()}
            monitorRows={monitorRows}
            clearLog={clearLog}
            controls={controls}
            selectedControl={selectedControl}
            selectedControlId={selectedControlId}
            setSelectedControlId={setSelectedControlId}
            updateSlot={updateSlot}
            learnStatus={learnStatus}
            onLearn={(slotIndex) =>
              selectedControl && startLearn(selectedControl.id, slotIndex)
            }
            onCancelLearn={cancelLearn}
            note={note}
            ccValue={ccValue}
            onSendNote={sendTestNote}
            onSendCc={sendCc}
            onQuickTest={(portId, ch) => sendQuickNote(portId, ch, note)}
            onQuickCc={(portId, ch, ccNum, val) =>
              sendQuickCc(portId, ch, ccNum, val)
            }
            onQuickProgram={(portId, ch, program) =>
              sendQuickProgram(portId, ch, program)
            }
            onSendSnapshot={() => {
              if (!activeSnapshotId) return;
              setPendingSnapshotId(activeSnapshotId);
              void scheduleSnapshot(activeSnapshotId);
            }}
            onAddDeviceRoutes={addDeviceRoutes}
            updateControl={updateControl}
            onEmitControl={emitControl}
            snapshots={snapshotsState}
            activeSnapshotId={activeSnapshotId}
            onSelectSnapshot={triggerSnapshot}
            onDropSnapshot={dropSnapshot}
            onStageSendCc={sendDeviceCc}
            stageDropControlId={stageDropControlId}
            onChangeStageDropControlId={setStageDropControlId}
            stageDropToValue={stageDropToValue}
            onChangeStageDropToValue={(value) =>
              setStageDropToValue(Math.min(Math.max(Math.round(value), 0), 127))
            }
            stageDropDurationMs={stageDropDurationMs}
            onChangeStageDropDurationMs={(ms) =>
              setStageDropDurationMs(Math.min(Math.max(Math.round(ms), 0), 60_000))
            }
            pendingSnapshotId={pendingSnapshotId}
            snapshotQueueStatus={snapshotQueueStatus}
            onCaptureSnapshot={(snapshotId) => {
              if (!midiApi) return;
              const effectiveBpm =
                useClockSync && clockBpm ? clockBpm : tempoBpm;
              void midiApi
                .captureSnapshot({
                  bpm: effectiveBpm,
                  notes: snapshotsState.captureNotes,
                })
                .then((snapshot) => {
                  setSnapshotsState((current) =>
                    writeSnapshotToSlot(current, snapshotId, snapshot)
                  );
                });
            }}
            onCancelPendingSnapshot={() => {
              setPendingSnapshotId(null);
              void midiApi?.flushSnapshotQueue();
            }}
            onChangeSnapshotBank={(bankId) =>
              setSnapshotsState((current) => ({ ...current, activeBankId: bankId }))
            }
            snapshotQuantize={snapshotQuantize}
            snapshotMode={snapshotsState.strategy}
            onChangeSnapshotQuantize={setSnapshotQuantize}
            onChangeSnapshotMode={(mode) => {
              setSnapshotMode(mode);
              setSnapshotsState((current) => ({ ...current, strategy: mode }));
            }}
            snapshotFadeMs={snapshotsState.fadeMs}
            onChangeSnapshotFade={(ms) => {
              const next = Math.max(0, ms);
              setSnapshotFadeMs(next);
              setSnapshotsState((current) => ({ ...current, fadeMs: next }));
            }}
            snapshotCommitDelayMs={snapshotsState.commitDelayMs}
            onChangeSnapshotCommitDelay={(ms) =>
              setSnapshotsState((current) => ({
                ...current,
                commitDelayMs: Math.max(0, Math.round(ms)),
              }))
            }
            snapshotClockSource={snapshotClockSource}
            onChangeSnapshotClockSource={setSnapshotClockSource}
            snapshotCycleBars={snapshotCycleBars}
            onChangeSnapshotCycleBars={(bars) =>
              setSnapshotCycleBars(Math.min(Math.max(Math.round(bars), 1), 32))
            }
            chainSteps={chainSteps}
            chainPlaying={chainPlaying}
            chainIndex={chainIndex}
            onStartChain={startChain}
            onStopChain={stopChain}
            onAddChainStep={addChainStep}
            onRemoveChainStep={removeChainStep}
            onMoveChainStep={moveChainStep}
            onUpdateChainBars={updateChainBars}
          />
        </BodySplitPane>
        <BottomUtilityBar
          midiReady={Boolean(selectedOut)}
          saveLabel={saveLabel}
          version="v0.8.2-beta"
          logCapReached={logCapReached}
        />
      </AppChrome>
    </div>
  );
}

type NavRoute = AppView;

function AppChrome({ children }: { children: ReactNode }) {
  return <div style={styles.chrome}>{children}</div>;
}

function TopStatusBar({
  saveLabel,
  lastSavedAt,
  onRefresh,
  onReset,
  onSave,
  midiReady,
  loadingPorts,
  tempo,
  onTempoChange,
  clockBpm,
  useClockSync,
  clockStale,
  onRelinkClock,
  onToggleClockSync,
  followClockStart,
  onToggleFollowClockStart,
  backendLabel,
  inputLabel,
  outputLabel,
}: {
  saveLabel: string;
  lastSavedAt: number | null;
  onRefresh: () => void;
  onReset: () => void;
  onSave: () => void;
  midiReady: boolean;
  loadingPorts: boolean;
  tempo: number;
  onTempoChange: (bpm: number) => void;
  clockBpm: number | null;
  useClockSync: boolean;
  clockStale: boolean;
  onRelinkClock: () => void;
  onToggleClockSync: (next: boolean) => void;
  followClockStart: boolean;
  onToggleFollowClockStart: (next: boolean) => void;
  backendLabel: string;
  inputLabel: string;
  outputLabel: string;
}) {
  return (
    <>
      <div style={styles.topBar}>
        <ProjectBadge saveLabel={saveLabel} lastSavedAt={lastSavedAt} />
        <TransportCluster
          tempo={tempo}
          onTempoChange={onTempoChange}
          clockBpm={clockBpm}
          useClockSync={useClockSync}
          clockStale={clockStale}
          onRelinkClock={onRelinkClock}
          onToggleClockSync={onToggleClockSync}
          followClockStart={followClockStart}
          onToggleFollowClockStart={onToggleFollowClockStart}
        />
        <CycleCluster />
        <ConnectionCluster midiReady={midiReady} />
        <GlobalActions
          onRefresh={onRefresh}
          onReset={onReset}
          onSave={onSave}
          loading={loadingPorts}
        />
      </div>
      <StatusStrip
        backendLabel={backendLabel}
        inputLabel={inputLabel}
        outputLabel={outputLabel}
        clockLabel={
          useClockSync
            ? clockStale
              ? "Clock: waiting…"
              : `Clock: ${clockBpm?.toFixed(1) ?? "??"} bpm`
            : "Clock: Manual"
        }
      />
    </>
  );
}

function ProjectBadge({
  saveLabel,
  lastSavedAt,
}: {
  saveLabel: string;
  lastSavedAt: number | null;
}) {
  return (
    <div style={styles.cluster}>
      <div style={styles.badgeTitle}>Project</div>
      <div style={styles.badgeValue}>
        <span style={styles.valueText}>Live_Set_01</span>
        <span style={{ ...styles.pill, color: "#35c96a" }}>{saveLabel}</span>
        {lastSavedAt ? (
          <span style={styles.muted}>
            Saved {new Date(lastSavedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TransportCluster({
  tempo,
  onTempoChange,
  clockBpm,
  useClockSync,
  clockStale,
  onRelinkClock,
  onToggleClockSync,
  followClockStart,
  onToggleFollowClockStart,
}: {
  tempo: number;
  onTempoChange: (bpm: number) => void;
  clockBpm: number | null;
  useClockSync: boolean;
  clockStale: boolean;
  onRelinkClock: () => void;
  onToggleClockSync: (next: boolean) => void;
  followClockStart: boolean;
  onToggleFollowClockStart: (next: boolean) => void;
}) {
  return (
    <div style={styles.cluster}>
      <div style={styles.badgeTitle}>Transport</div>
      <div style={styles.row}>
        <div style={styles.kpi}>{tempo.toFixed(1)}</div>
        <div style={styles.row}>
          <button
            style={styles.btnTiny}
            onClick={() => onTempoChange(Math.max(20, tempo - 1))}
          >
            -
          </button>
          <button
            style={styles.btnTiny}
            onClick={() => onTempoChange(Math.min(300, tempo + 1))}
          >
            +
          </button>
        </div>
        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={useClockSync}
            title="Use external MIDI clock for tempo"
            onChange={(e) => onToggleClockSync(e.target.checked)}
          />
          <span style={styles.muted}>Follow MIDI Clock</span>
        </label>
        <label style={styles.toggleRow}>
          <input
            type="checkbox"
            checked={followClockStart}
            title="Use external start/stop to run chains"
            onChange={(e) => onToggleFollowClockStart(e.target.checked)}
          />
          <span style={styles.muted}>Clock start/stop drives chain</span>
        </label>
        <span style={styles.muted}>
          {useClockSync
            ? clockStale
              ? "Clock: waiting…"
              : `Clock BPM: ${clockBpm?.toFixed(1) ?? "??"}`
            : "Manual tempo"}
        </span>
        {useClockSync ? (
          <button
            style={styles.btnTiny}
            onClick={onRelinkClock}
            title="Reset clock detection"
          >
            Relink Clock
          </button>
        ) : null}
        <button style={styles.btnPrimary}>
          <Play size={14} fill="currentColor" />
        </button>
        <button style={styles.btnSecondary}>
          <Square size={14} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

function CycleCluster() {
  return (
    <div style={styles.cluster}>
      <div style={styles.badgeTitle}>Cycle Control</div>
      <div style={styles.row}>
        <div style={styles.kpi}>8</div>
        <select style={styles.select} defaultValue="8 Bars">
          <option>1 Bar</option>
          <option>4 Bars</option>
          <option>8 Bars</option>
        </select>
        <select style={styles.select} defaultValue="1 Bar Quant">
          <option>1/4 Quant</option>
          <option>1 Bar Quant</option>
        </select>
      </div>
    </div>
  );
}

function ConnectionCluster({ midiReady }: { midiReady: boolean }) {
  return (
    <div style={styles.cluster}>
      <div style={styles.badgeTitle}>System</div>
      <div style={styles.row}>
        <div style={styles.pillRow}>
          <div
            style={{
              ...styles.dot,
              backgroundColor: midiReady ? "#35c96a" : "#8b0000",
            }}
          />
          <span style={styles.valueText}>MIDI</span>
        </div>
        <div style={styles.pillRow}>
          <div style={{ ...styles.dot, backgroundColor: "#35c96a" }} />
          <span style={styles.valueText}>Clock</span>
        </div>
      </div>
    </div>
  );
}

function StatusStrip({
  backendLabel,
  inputLabel,
  outputLabel,
  clockLabel,
}: {
  backendLabel: string;
  inputLabel: string;
  outputLabel: string;
  clockLabel: string;
}) {
  return (
    <div
      style={{
        ...styles.bottomBar,
        backgroundColor: "#0f0f0f",
        borderTop: "1px solid #1e1e1e",
      }}
    >
      <div style={styles.row}>
        <span style={styles.muted}>Backend:</span>{" "}
        <span style={styles.valueText}>{backendLabel}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.muted}>In:</span>{" "}
        <span style={styles.valueText}>{inputLabel}</span>
        <span style={styles.muted}>Out:</span>{" "}
        <span style={styles.valueText}>{outputLabel}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.muted}>{clockLabel}</span>
      </div>
    </div>
  );
}

function GlobalActions({
  onRefresh,
  onReset,
  onSave,
  loading,
}: {
  onRefresh: () => void;
  onReset: () => void;
  onSave: () => void;
  loading: boolean;
}) {
  return (
    <div style={{ ...styles.cluster, marginLeft: "auto" }}>
      <div style={styles.badgeTitle}>Actions</div>
      <div style={styles.row}>
        <button
          style={styles.btnSecondary}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} /> {loading ? "Scanning..." : "Refresh"}
        </button>
        <button style={styles.btnSecondary} onClick={onReset}>
          <RotateCcw size={14} />
        </button>
        <button style={styles.btnPrimary} onClick={onSave}>
          <Save size={14} /> Save
        </button>
        <button style={styles.btnSecondary}>
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
}

function BodySplitPane({ children }: { children: ReactNode }) {
  return <div style={styles.body}>{children}</div>;
}

function LeftNavRail({
  route,
  onChangeRoute,
  onPanic,
}: {
  route: NavRoute;
  onChangeRoute: (route: NavRoute) => void;
  onPanic: () => void;
}) {
  const items: { id: NavRoute; label: string; icon: ReactNode }[] = [
    { id: "setup", label: "Setup", icon: <Cpu size={18} /> },
    { id: "mapping", label: "Mapping", icon: <Layers size={18} /> },
    { id: "surfaces", label: "Surfaces Lab", icon: <Zap size={18} /> },
    { id: "snapshots", label: "Snapshots", icon: <Camera size={18} /> },
    { id: "stage", label: "Stage", icon: <Play size={18} /> },
    { id: "chains", label: "Chains", icon: <LinkIcon size={18} /> },
    { id: "monitor", label: "Monitor", icon: <Activity size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> },
  ];

  return (
    <div style={styles.nav}>
      <div style={styles.navHeader}>
        <div style={styles.logo}>MIDI PERFORMER</div>
        <select style={styles.selectWide} defaultValue="Default Session">
          <option>Default Session</option>
          <option>Studio Live B</option>
        </select>
      </div>
      <div style={styles.navSection}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onChangeRoute(it.id)}
            style={{
              ...styles.navItem,
              backgroundColor: route === it.id ? "#103553" : "transparent",
              color: route === it.id ? "#e8f6ff" : "#9aa3ad",
              borderLeft:
                route === it.id ? "4px solid #19b0d7" : "4px solid transparent",
              paddingLeft: route === it.id ? "16px" : "20px",
              borderRadius: route === it.id ? "2px" : "0px",
            }}
          >
            {it.icon} {it.label}
          </button>
        ))}
      </div>
      <div style={styles.navFooter}>
        <button style={styles.btnDanger} onClick={onPanic}>
          MIDI PANIC
        </button>
        <label style={styles.toggleRow}>
          <input type="checkbox" defaultChecked />
          <span style={styles.muted}>Safe Mode</span>
        </label>
      </div>
    </div>
  );
}

function MainContentArea(props: {
  route: NavRoute;
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
  onQuickTest: (portId: string | null, channel: number) => void;
  onQuickCc: (
    portId: string | null,
    channel: number,
    cc: number,
    val: number
  ) => void;
  onQuickProgram: (
    portId: string | null,
    channel: number,
    program: number
  ) => void;
  onSendSnapshot: () => void;
  onAddDeviceRoutes: () => void;
  snapshots: SnapshotsState;
  activeSnapshotId: string | null;
  pendingSnapshotId: string | null;
  snapshotQueueStatus: SnapshotQueueStatus | null;
  onSelectSnapshot: (
    snapshotId: string,
    quantizeOverride?: SnapshotQuantizeKind
  ) => void;
  onDropSnapshot: (snapshotId: string) => void;
  onStageSendCc: (deviceId: string, cc: number, val: number) => void;
  stageDropControlId: string | null;
  onChangeStageDropControlId: (id: string | null) => void;
  stageDropToValue: number;
  onChangeStageDropToValue: (value: number) => void;
  stageDropDurationMs: number;
  onChangeStageDropDurationMs: (ms: number) => void;
  onCaptureSnapshot: (snapshotId: string) => void;
  onCancelPendingSnapshot: () => void;
  onChangeSnapshotBank: (bankId: string | null) => void;
  snapshotQuantize: SnapshotQuantize;
  snapshotMode: SnapshotMode;
  onChangeSnapshotQuantize: (q: SnapshotQuantize) => void;
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
  logCapReached: boolean;
  sessionStatus: SessionLogStatus | null;
  onSessionStart: () => void;
  onSessionStop: () => void;
  onSessionReveal: () => void;
  monitorRows: {
    _rowId: string;
    ts: number;
    src: MidiPortRef;
    label: string;
  }[];
  clearLog: () => void;
  controls: ControlElement[];
  selectedControl: ControlElement | undefined;
  selectedControlId: string | null;
  setSelectedControlId: (id: string) => void;
  updateSlot: (
    controlId: string,
    slotIndex: number,
    partial: Partial<MappingSlot>
  ) => void;
  updateControl?: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl?: (control: ControlElement, rawValue: number) => void;
  learnStatus: "idle" | "listening" | "captured" | "timeout";
  onLearn: (slotIndex: number) => void;
  onCancelLearn: () => void;
  note: number;
  ccValue: number;
  onSendNote: () => void;
  onSendCc: () => void;
}) {
  return (
    <div style={styles.content}>
      <RouteOutlet {...props} />
    </div>
  );
}

function RouteOutlet({
  route,
  ...rest
}: Parameters<typeof MainContentArea>[0]) {
  switch (route) {
    case "setup":
      return (
        <SetupPage
          ports={rest.ports}
          devices={rest.devices}
          selectedIn={rest.selectedIn}
          selectedOut={rest.selectedOut}
          onSelectIn={rest.onSelectIn}
          onSelectOut={rest.onSelectOut}
          onUpdateDevice={rest.updateDevice}
          diagMessage={rest.diagMessage}
          diagRunning={rest.diagRunning}
          onRunDiagnostics={rest.onRunDiagnostics}
          onQuickStart={rest.onQuickStart}
          loadingPorts={rest.loadingPorts}
          onQuickTest={rest.onQuickTest}
          onQuickCc={rest.onQuickCc}
          onQuickProgram={rest.onQuickProgram}
          onSendSnapshot={rest.onSendSnapshot}
          onAddDeviceRoutes={rest.onAddDeviceRoutes}
        />
      );
    case "mapping":
      return (
        <MappingPage
          controls={rest.controls}
          selectedControl={rest.selectedControl}
          selectedControlId={rest.selectedControlId}
          setSelectedControlId={rest.setSelectedControlId}
          updateSlot={rest.updateSlot}
          updateControl={rest.updateControl}
          onEmitControl={rest.onEmitControl}
          learnStatus={rest.learnStatus}
          onLearn={rest.onLearn}
          onCancelLearn={rest.onCancelLearn}
          onSendNote={rest.onSendNote}
          onSendCc={rest.onSendCc}
          note={rest.note}
          ccValue={rest.ccValue}
          devices={rest.devices}
        />
      );
    case "snapshots":
      return (
        <SnapshotsPage
          snapshots={rest.snapshots}
          activeSnapshotId={rest.activeSnapshotId}
          pendingSnapshotId={rest.pendingSnapshotId}
          queueStatus={rest.snapshotQueueStatus}
          onSelectSnapshot={rest.onSelectSnapshot}
          onCapture={rest.onCaptureSnapshot}
          onCancelPending={rest.onCancelPendingSnapshot}
          onChangeBank={rest.onChangeSnapshotBank}
          snapshotQuantize={rest.snapshotQuantize}
          snapshotMode={rest.snapshotMode}
          onChangeSnapshotQuantize={rest.onChangeSnapshotQuantize}
          onChangeSnapshotMode={rest.onChangeSnapshotMode}
          snapshotFadeMs={rest.snapshotFadeMs}
          onChangeSnapshotFade={rest.onChangeSnapshotFade}
          snapshotCommitDelayMs={rest.snapshotCommitDelayMs}
          onChangeSnapshotCommitDelay={rest.onChangeSnapshotCommitDelay}
          snapshotClockSource={rest.snapshotClockSource}
          onChangeSnapshotClockSource={rest.onChangeSnapshotClockSource}
          snapshotCycleBars={rest.snapshotCycleBars}
          onChangeSnapshotCycleBars={rest.onChangeSnapshotCycleBars}
        />
      );
    case "stage":
      {
        const snapshotNames = listSnapshotNames(rest.snapshots);
        const activeName = rest.activeSnapshotId
          ? findSnapshotSlot(rest.activeSnapshotId, rest.snapshots)?.slot.name ??
            null
          : null;
        const macroControls = rest.controls.map((c) => ({
          id: c.id,
          label: c.label ?? c.id,
        }));
        return (
          <StagePage
            clock={rest.clock}
            queueStatus={rest.snapshotQueueStatus}
            snapshots={snapshotNames}
            activeSnapshot={activeName}
            onSelectSnapshot={(name, quantize) => {
              const id = findSnapshotIdByName(name, rest.snapshots);
              if (id) rest.onSelectSnapshot(id, quantize);
            }}
            onDrop={(name) => {
              const id = findSnapshotIdByName(name, rest.snapshots);
              if (id) rest.onDropSnapshot(id);
            }}
            devices={rest.devices}
            onSendCc={rest.onStageSendCc}
            dropMacroControls={macroControls}
            dropMacroControlId={rest.stageDropControlId}
            onChangeDropMacroControlId={rest.onChangeStageDropControlId}
            dropMacroToValue={rest.stageDropToValue}
            onChangeDropMacroToValue={rest.onChangeStageDropToValue}
            dropDurationMs={rest.stageDropDurationMs}
            onChangeDropDurationMs={rest.onChangeStageDropDurationMs}
          />
        );
      }
    case "chains":
      return (
        <ChainsPage
          chainSteps={rest.chainSteps}
          playing={rest.chainPlaying}
          currentIndex={rest.chainIndex}
          quantize={rest.snapshotQuantize}
          onStart={rest.onStartChain}
          onStop={rest.onStopChain}
          onAddStep={rest.onAddChainStep}
          onRemoveStep={rest.onRemoveChainStep}
          onMoveStep={rest.onMoveChainStep}
          onUpdateBars={rest.onUpdateChainBars}
        />
      );
    case "monitor":
      return (
        <MonitorPage
          monitorRows={rest.monitorRows}
          logCapReached={rest.logCapReached}
          clearLog={rest.clearLog}
          sessionStatus={rest.sessionStatus}
          onSessionStart={rest.onSessionStart}
          onSessionStop={rest.onSessionStop}
          onSessionReveal={rest.onSessionReveal}
        />
      );
    case "surfaces":
      return (
        <SurfaceBoardPage
          controls={rest.controls}
          onUpdateControl={(id, partial) => rest.updateControl?.(id, partial)}
          onEmitControl={(control, raw) => rest.onEmitControl?.(control, raw)}
        />
      );
    case "settings":
      return (
        <SettingsPage
          selectedIn={rest.selectedIn}
          selectedOut={rest.selectedOut}
          onSelectIn={rest.onSelectIn}
          onSelectOut={rest.onSelectOut}
        />
      );
    default:
      return (
        <SnapshotsPage
          snapshots={rest.snapshots}
          activeSnapshotId={rest.activeSnapshotId}
          pendingSnapshotId={rest.pendingSnapshotId}
          queueStatus={rest.snapshotQueueStatus}
          onSelectSnapshot={rest.onSelectSnapshot}
          onCapture={rest.onCaptureSnapshot}
          onCancelPending={rest.onCancelPendingSnapshot}
          onChangeBank={rest.onChangeSnapshotBank}
          snapshotQuantize={rest.snapshotQuantize}
          snapshotMode={rest.snapshotMode}
          onChangeSnapshotQuantize={rest.onChangeSnapshotQuantize}
          onChangeSnapshotMode={rest.onChangeSnapshotMode}
          snapshotFadeMs={rest.snapshotFadeMs}
          onChangeSnapshotFade={rest.onChangeSnapshotFade}
          snapshotCommitDelayMs={rest.snapshotCommitDelayMs}
          onChangeSnapshotCommitDelay={rest.onChangeSnapshotCommitDelay}
          snapshotClockSource={rest.snapshotClockSource}
          onChangeSnapshotClockSource={rest.onChangeSnapshotClockSource}
          snapshotCycleBars={rest.snapshotCycleBars}
          onChangeSnapshotCycleBars={rest.onChangeSnapshotCycleBars}
        />
      );
  }
}

function SetupPage({
  ports,
  devices,
  selectedIn,
  selectedOut,
  onSelectIn,
  onSelectOut,
  onUpdateDevice,
  diagMessage,
  diagRunning,
  onRunDiagnostics,
  onQuickStart,
  loadingPorts,
  onQuickTest,
  onQuickCc,
  onQuickProgram,
  onSendSnapshot,
  onAddDeviceRoutes,
}: {
  ports: MidiPorts;
  devices: DeviceConfig[];
  selectedIn: string | null;
  selectedOut: string | null;
  onSelectIn: (id: string | null) => void;
  onSelectOut: (id: string | null) => void;
  onUpdateDevice: (id: string, partial: Partial<DeviceConfig>) => void;
  diagMessage: string | null;
  diagRunning: boolean;
  onRunDiagnostics: () => void;
  onQuickStart: () => void;
  loadingPorts: boolean;
  onQuickTest: (portId: string | null, channel: number) => void;
  onQuickCc: (
    portId: string | null,
    channel: number,
    cc: number,
    val: number
  ) => void;
  onQuickProgram: (
    portId: string | null,
    channel: number,
    program: number
  ) => void;
  onSendSnapshot: () => void;
  onAddDeviceRoutes: () => void;
}) {
  const selectedInLabel = selectedIn
    ? formatPortLabel(
        ports.inputs.find((p) => p.id === selectedIn)?.name ?? selectedIn
      )
    : "Not selected";
  const selectedOutLabel = selectedOut
    ? formatPortLabel(
        ports.outputs.find((p) => p.id === selectedOut)?.name ?? selectedOut
      )
    : "Not selected";
  const [quickCc, setQuickCc] = useState(74);
  const [quickVal, setQuickVal] = useState(100);
  const [quickProgram, setQuickProgram] = useState(0);
  const preferredOut =
    selectedOut ??
    devices.find((d) => d.outputId)?.outputId ??
    ports.outputs[0]?.id ??
    null;
  const preferredChannel =
    devices.find((d) => d.outputId === preferredOut)?.channel ?? 1;

  return (
    <Page>
      <PageHeader
        title="Hardware Setup"
        right={
          <div style={styles.row}>
            <button
              style={styles.btnPrimary}
              onClick={onQuickStart}
              disabled={loadingPorts}
            >
              Plug & Go
            </button>
            <button
              style={styles.btnSecondary}
              onClick={onAddDeviceRoutes}
              disabled={loadingPorts}
            >
              Routes for Devices
            </button>
            <button style={styles.btnSecondary} disabled={loadingPorts}>
              Auto Scan
            </button>
          </div>
        }
      />
      <div style={styles.pageGrid2}>
        <Panel title="Connected MIDI Devices">
          <div style={styles.table}>
            {devices.map((dev, idx) => (
              <div key={dev.id} style={styles.tableRow}>
                <span style={styles.cellSmall}>Lane {dev.lane}</span>
                <select
                  style={styles.select}
                  value={dev.lane}
                  onChange={(e) =>
                    onUpdateDevice(dev.id, {
                      lane: Math.min(8, Math.max(1, Number(e.target.value) || 1)),
                    })
                  }
                  title="OXI lane number (1–8) used for Stage strips."
                >
                  {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      Lane {n}
                    </option>
                  ))}
                </select>
                <select
                  style={styles.selectWide}
                  value={dev.outputId ?? ""}
                  onChange={(e) => onUpdateDevice(dev.id, { outputId: e.target.value || null })}
                >
                  <option value="">Select output</option>
                  {ports.outputs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatPortLabel(p.name)}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    ...styles.dot,
                    backgroundColor:
                      selectedOut === dev.outputId ? "#35c96a" : "#444",
                  }}
                />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Configuration">
          <div style={styles.card}>
            <p style={styles.muted}>Input: {selectedInLabel}</p>
            <p style={styles.muted}>Output: {selectedOutLabel}</p>
            <p style={styles.muted}>Buffer Size: 128 samples</p>
          </div>
          <div style={{ ...styles.card, backgroundColor: "#181818" }}>
            <strong>Onboarding</strong>
            <ol style={{ margin: "8px 0 0 16px", color: "#888", padding: 0 }}>
              <li>Select backend</li>
              <li>Pick input/output</li>
              <li>Click Plug & Go</li>
              <li>Hit Send Note to confirm sound</li>
            </ol>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              style={styles.selectWide}
              value={selectedOut ?? ""}
              onChange={(e) => onSelectOut(e.target.value || null)}
            >
              <option value="">Select output</option>
              {ports.outputs.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPortLabel(p.name)}
                </option>
              ))}
            </select>
            <select
              style={styles.selectWide}
              value={selectedIn ?? ""}
              onChange={(e) => onSelectIn(e.target.value || null)}
            >
              <option value="">Select input</option>
              {ports.inputs.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPortLabel(p.name)}
                </option>
              ))}
            </select>
          </div>
          <div style={{ height: "10px" }} />
          <button
            style={styles.btnPrimary}
            onClick={onRunDiagnostics}
            disabled={diagRunning || !selectedOut}
          >
            {diagRunning ? "Testing..." : "Run Diagnostics"}
          </button>
          {diagMessage ? <p style={styles.muted}>{diagMessage}</p> : null}
        </Panel>
      </div>
      <div style={styles.pageGrid2}>
        <Panel title="Quick Send (device sanity)">
          <p style={styles.muted}>
            Sends directly to the selected output (or first device with an
            output).
          </p>
          <div style={styles.row}>
            <button
              style={styles.btnSecondary}
              onClick={() => onQuickTest(preferredOut, preferredChannel)}
            >
              Send Note (C4)
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() =>
                onQuickCc(preferredOut, preferredChannel, quickCc, quickVal)
              }
            >
              Send CC
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() =>
                onQuickProgram(preferredOut, preferredChannel, quickProgram)
              }
            >
              Send PC
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <label style={{ ...styles.row, flex: 1 }}>
              <span style={styles.muted}>CC</span>
              <input
                style={styles.inputNarrow}
                type="number"
                min={0}
                max={127}
                value={quickCc}
                onChange={(e) => setQuickCc(clampMidi(Number(e.target.value)))}
              />
            </label>
            <label style={{ ...styles.row, flex: 1 }}>
              <span style={styles.muted}>Value</span>
              <input
                style={styles.inputNarrow}
                type="number"
                min={0}
                max={127}
                value={quickVal}
                onChange={(e) => setQuickVal(clampMidi(Number(e.target.value)))}
              />
            </label>
            <label style={{ ...styles.row, flex: 1 }}>
              <span style={styles.muted}>Program</span>
              <input
                style={styles.inputNarrow}
                type="number"
                min={0}
                max={127}
                value={quickProgram}
                onChange={(e) =>
                  setQuickProgram(clampMidi(Number(e.target.value)))
                }
              />
            </label>
          </div>
        </Panel>
        <Panel title="Snapshot Send">
          <p style={styles.muted}>
            Send current mapped CC slots for bound devices (light burst
            spacing).
          </p>
          <button style={styles.btnPrimary} onClick={onSendSnapshot}>
            Send Snapshot Now
          </button>
        </Panel>
      </div>
      <Panel title="Assignment wizard (stub)">
        <AssignmentWizardStub
          devices={devices}
          styles={{
            btnPrimary: styles.btnPrimary,
            btnSecondary: styles.btnSecondary,
            muted: styles.muted,
            select: styles.select,
            inputNarrow: styles.inputNarrow,
          }}
          onSetQuickCc={(cc) => setQuickCc(cc)}
        />
      </Panel>
    </Page>
  );
}

function SettingsPage({
  selectedIn,
  selectedOut,
  onSelectIn,
  onSelectOut,
}: {
  selectedIn: string | null;
  selectedOut: string | null;
  onSelectIn: (id: string | null) => void;
  onSelectOut: (id: string | null) => void;
}) {
  return (
    <Page>
      <PageHeader title="System Settings" />
      <div style={styles.pageGrid2}>
        <Panel title="Interface">
          <div style={styles.row}>
            <span style={styles.muted}>Theme</span>
            <select style={styles.select}>
              <option>Dark High-Contrast</option>
            </select>
          </div>
          <div style={{ height: "10px" }} />
          <div style={styles.row}>
            <span style={styles.muted}>Zoom Level</span>
            <input type="range" style={{ flex: 1 }} />
          </div>
        </Panel>
        <Panel title="Backup & Restore">
          <button style={styles.btnSecondary}>Export All Data</button>
          <div style={{ height: "10px" }} />
          <button style={styles.btnSecondary} onClick={() => onSelectIn(null)}>
            Reset Input ({selectedIn ? "selected" : "none"})
          </button>
          <div style={{ height: "6px" }} />
          <button style={styles.btnSecondary} onClick={() => onSelectOut(null)}>
            Reset Output ({selectedOut ? "selected" : "none"})
          </button>
        </Panel>
      </div>
    </Page>
  );
}

function BottomUtilityBar({
  midiReady,
  saveLabel,
  version,
  logCapReached,
}: {
  midiReady: boolean;
  saveLabel: string;
  version: string;
  logCapReached: boolean;
}) {
  return (
    <div style={styles.bottomBar}>
      <div style={styles.row}>
        <Activity size={12} />
        <span>CPU: 2%</span>
        <span style={{ color: midiReady ? "#35c96a" : "#8b0000" }}>
          {midiReady ? "MIDI OK" : "No MIDI"}
        </span>
        {logCapReached ? <span style={styles.pill}>Log capped</span> : null}
      </div>
      <div>Ctrl + S: Save | Space: Play | J: Jump Snapshot</div>
      <div style={styles.row}>
        <span>{version}</span>
        <div style={{ ...styles.dot, backgroundColor: "#35c96a" }} />
        <Search size={12} />
      </div>
    </div>
  );
}
type OxiAnalysis = {
  isOxi: boolean;
  oxiTag: "A" | "B" | "C" | "?" | null;
  rank: number;
};

function analyzeOxiPortName(name: string): OxiAnalysis {
  const n = (name ?? "").toLowerCase();
  const isOxi = n.includes("oxi");
  if (!isOxi) return { isOxi: false, oxiTag: null, rank: 1000 };

  const match = n.match(/(?:midi|usb)\s*([123])\b/) ?? n.match(/\b([123])\b/);
  const num = match?.[1];
  const oxiTag =
    num === "1" ? "A" : num === "2" ? "B" : num === "3" ? "C" : "?";
  const rank = oxiTag === "A" ? 0 : oxiTag === "B" ? 1 : oxiTag === "C" ? 2 : 3;
  return { isOxi: true, oxiTag, rank };
}

function formatPortLabel(name: string): string {
  const a = analyzeOxiPortName(name);
  if (!a.isOxi) return name;
  const prefix = a.oxiTag && a.oxiTag !== "?" ? `OXI ${a.oxiTag}` : "OXI";
  return `${prefix} - ${name}`;
}

function sortPortsWithOxiFirst(a: MidiPortInfo, b: MidiPortInfo): number {
  const aa = analyzeOxiPortName(a.name);
  const bb = analyzeOxiPortName(b.name);
  if (aa.isOxi !== bb.isOxi) return aa.isOxi ? -1 : 1;
  if (aa.isOxi && bb.isOxi && aa.rank !== bb.rank) return aa.rank - bb.rank;
  return a.name.localeCompare(b.name);
}

function describeMsg(msg: MidiMsg): string {
  switch (msg.t) {
    case "noteOn":
      return `Note on ch${msg.ch} n${msg.note} v${msg.vel}`;
    case "noteOff":
      return `Note off ch${msg.ch} n${msg.note} v${msg.vel ?? 0}`;
    case "cc":
      return `CC ch${msg.ch} #${msg.cc} -> ${msg.val}`;
    case "programChange":
      return `PC ch${msg.ch} -> ${msg.program}`;
    case "pitchBend":
      return `Pitch bend ch${msg.ch} ${msg.val}`;
    case "aftertouch":
      return `Aftertouch ch${msg.ch} ${msg.val}`;
    case "clock":
      return "Clock";
    case "start":
      return "Start";
    case "stop":
      return "Stop";
    case "continue":
      return "Continue";
    default:
      return "Unknown";
  }
}

function describeFilter(filter?: RouteFilter): string {
  if (!filter) return "all messages";
  const parts: string[] = [];
  if (filter.allowTypes && filter.allowTypes.length > 0) {
    parts.push(`types: ${filter.allowTypes.join(",")}`);
  }
  if (filter.clockDiv && filter.clockDiv > 1) {
    parts.push(`clock /${filter.clockDiv}`);
  }
  return parts.length ? parts.join(" | ") : "all messages";
}

function makeRouteId() {
  return `route-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}
