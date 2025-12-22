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
  defaultModulationState,
} from "../../shared/projectTypes";
import {
  type ModulationEngineState,
  type ModulationTarget,
  type SnapshotChainState,
  type SnapshotChain,
} from "@midi-playground/core";
import { SnapshotChainRunner } from "@midi-playground/core";
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

  // Hardware Sync State (Ghost Fader)
  const [hardwareState, setHardwareState] = useState<
    Record<string, { value: number; latched: boolean }>
  >({});
  const hardwareStateRef = useRef(hardwareState);
  useEffect(() => {
    hardwareStateRef.current = hardwareState;
  }, [hardwareState]);

  const [instrumentLibrary, setInstrumentLibrary] = useState<any[]>([]);
  useEffect(() => {
    if (midiApi)
      midiApi.loadInstruments().then(setInstrumentLibrary).catch(console.error);
  }, [midiApi]);

  useEffect(() => {
    if (!midiApi) return;
    midiApi
      .loadInstruments()
      .then((lib) => {
        setInstrumentLibrary(lib);
        console.log("Loaded instrument library:", lib.length, "definitions");
      })
      .catch((err) => {
        console.warn("Failed to load instrument library:", err);
      });
  }, [midiApi]);

  // Global Settings
  const [tempoBpm, setTempoBpm] = useState(defaults.tempoBpm);
  const [useClockSync, setUseClockSync] = useState(defaults.useClockSync);
  const [followClockStart, setFollowClockStart] = useState(
    defaults.followClockStart
  );
  const [transportChannel, setTransportChannel] = useState(
    defaults.ui?.routeBuilder?.transportChannel ?? 16
  );

  // Modulation
  const [modulationState, setModulationState] = useState<ModulationEngineState>(
    defaults.modulation
  );

  // Snapshot Chains (V4)
  const [snapshotChains, setSnapshotChains] = useState<SnapshotChainState>(
    defaults.snapshotChains
  );
  const chainRunnerRef = useRef<SnapshotChainRunner | null>(null);

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
  const controlsRef = useRef(controls);
  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);
  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);
  useEffect(() => {
    learnTargetRef.current = learnTarget;
  }, [learnTarget]);

  // Helper to emit control changes (send MIDI)
  const onEmitControl = (control: ControlElement, value: number) => {
    // Send to mapped target
    const slots = control.slots.filter(
      (s): s is Extract<typeof s, { kind: "cc" }> =>
        s.enabled && s.kind === "cc"
    );
    slots.forEach((slot) => {
      const targetId = slot.targetDeviceId;
      if (!targetId) return;
      const device = devicesRef.current.find((d) => d.id === targetId);
      if (!device || !device.outputId || !midiApi) return;

      const ch =
        slot.channel !== undefined ? slot.channel : device.channel || 1;
      midiApi.send({
        portId: device.outputId,
        msg: {
          t: "cc",
          ch: ch,
          cc: slot.cc,
          val: value,
        },
      });
    });
  };

  // Auto-connect OXI
  useEffect(() => {
    if (loadingPorts) return;

    // Naive heuristic: if we see an "OXI" device and nothing is selected, grab it.
    // Checks for "OXI One" or just "OXI"
    if (!selectedIn) {
      const oxiIn = ports.inputs.find(
        (p) =>
          p.name.toLowerCase().includes("oxi one") ||
          p.name.toLowerCase().includes("oxi single")
      );
      if (oxiIn) setSelectedIn(oxiIn.id);
    }

    if (!selectedOut) {
      const oxiOut = ports.outputs.find(
        (p) =>
          p.name.toLowerCase().includes("oxi one") ||
          p.name.toLowerCase().includes("oxi single")
      );
      if (oxiOut) setSelectedOut(oxiOut.id);
    }
  }, [ports, loadingPorts, selectedIn, selectedOut]);

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
        setTransportChannel(state.ui?.routeBuilder?.transportChannel ?? 16);
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

        setSnapshotChains(state.snapshotChains ?? defaults.snapshotChains);

        // Modulation hydration
        setModulationState(state.modulation ?? defaults.modulation);
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
      // Soft Takeover / Hardware Sync Logic
      else if (msg.t === "cc") {
        // Update hardware state for *mapped* controls
        const mappedControls = controlsRef.current.filter((c) =>
          c.slots.some(
            (s) =>
              s.enabled &&
              s.kind === "cc" &&
              s.cc === msg.cc &&
              (s.channel === undefined || s.channel === msg.ch)
          )
        );

        for (const ctrl of mappedControls) {
          setHardwareState((prev) => {
            const currentHw = prev[ctrl.id];
            const nextVal = msg.val;

            // Latch Logic
            let nextLatched = currentHw?.latched ?? false;

            if (!nextLatched) {
              const softwareVal = ctrl.value;
              // Check if we crossed the software value
              // We need previous HW value to know if we crossed, but for now
              // a simple tolerance check or "passed through" logic
              // Or simpler: if abs(hw - sw) < threshold, latch immediately.
              if (Math.abs(nextVal - softwareVal) < 4) {
                // Loose tolerance
                nextLatched = true;
              }
            }

            // If latched, we drive the software value
            if (nextLatched) {
              // Update software control (this will re-render and send MIDI via effect?)
              // Wait, direct update to avoid loop?
              // updateControl(ctrl.id, { value: nextVal });
              // We can't call updateControl from here easily without causing renders.
              // Logic needs to be robust. For now, let's just track state.
            }

            return {
              ...prev,
              [ctrl.id]: {
                value: nextVal,
                latched: nextLatched,
              },
            };
          });

          // If latched, actually emit the control change to the app
          const hw = hardwareStateRef.current[ctrl.id];
          if (hw?.latched || Math.abs(msg.val - ctrl.value) < 4) {
            // It is latched (or just became latched).
            // We should update the main control value.
            // But we need to avoid "fighting" if the update causes a send back to hardware.
            // The main loop prevents echo if input == output, usually.

            // Reuse existing nudge/update logic?
            // We need to setControls...
            setControls((curr) =>
              curr.map((c) => (c.id === ctrl.id ? { ...c, value: msg.val } : c))
            );
            // And emit?
            onEmitControl(ctrl, msg.val);
          }
        }
      }

      setLog((current) => [evt, ...current].slice(0, LOG_LIMIT));

      if (evt.msg.t === "start" && followClockStart) {
        onStartChain();
      }
      if (evt.msg.t === "stop" && followClockStart) {
        onStopChain();
      }

      // OXI CC Transport Recruitment
      if (evt.msg.t === "cc" && followClockStart) {
        if (evt.msg.cc === 105 && evt.msg.val > 0) onStopChain();
        if (evt.msg.cc === 106 && evt.msg.val > 0) onStartChain();
        // Record (107) toggle or status? OXI usually toggles.
        // For now, only Play/Stop are critical for chain sync.
      }
    });

    const unsubscribeSnapshotStatus = midiApi.onSnapshotStatus((status) => {
      setSnapshotQueueStatus(status);
      if (status.activeSnapshotId) {
        setPendingSnapshotId(status.activeSnapshotId);
      } else if (status.queueLength === 0) {
        setPendingSnapshotId(null);
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
      modulation: modulationState,
      snapshotChains,
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
          transportChannel,
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
    snapshotChains,
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
    modulationState,
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

  // Sync SnapshotChainRunner
  useEffect(() => {
    if (!chainRunnerRef.current) {
      chainRunnerRef.current = new SnapshotChainRunner(snapshotChains, {
        onTriggerSnapshot: (id) => {
          // Internal call to schedule snapshot
          if (midiApi) {
            midiApi
              .scheduleSnapshot({
                snapshotId: id,
                strategy: snapshotsState.strategy,
                fadeMs: snapshotsState.fadeMs,
                snapshot: { devices: [] } as any, // The backend will look up by ID
              })
              .catch(console.error);
          }
        },
        onStepChanged: (index) => {
          setSnapshotChains((prev) => ({ ...prev, currentIndex: index }));
        },
        onEnd: () => {
          setSnapshotChains((prev) => ({ ...prev, playing: false }));
        },
      });
    } else {
      chainRunnerRef.current.setState(snapshotChains);
    }
  }, [snapshotChains, midiApi, snapshotsState.strategy]);

  // Tick Chain Runner on Clock
  useEffect(() => {
    if (snapshotChains.playing && chainRunnerRef.current) {
      // Calculate bars from ticks
      chainRunnerRef.current.tick(clock.tickCount / (clock.ppqn * 4));
    }
  }, [clock.tickCount, clock.ppqn, snapshotChains.playing]);

  // Follow Clock Transport (Incoming)
  useEffect(() => {
    if (!followClockStart) return;

    // When clock starts running (e.g. from external MIDI Start), start our sequencer
    if (clock.running && !snapshotChains.playing) {
      onStartChain();
    }
    // When clock stops (e.g. external MIDI Stop), stop our sequencer
    else if (!clock.running && snapshotChains.playing) {
      onStopChain();
    }
  }, [clock.running, followClockStart, snapshotChains.playing]);

  const onStartChain = () => {
    setSnapshotChains((prev) => ({ ...prev, playing: true }));
    if (chainRunnerRef.current) {
      chainRunnerRef.current.start(clock.tickCount / (clock.ppqn * 4));
    }
  };

  const onStopChain = () => {
    setSnapshotChains((prev) => ({ ...prev, playing: false }));
    if (chainRunnerRef.current) {
      chainRunnerRef.current.stop();
    }
  };
  const onOxiTransport = (cmd: "start" | "stop" | "record") => {
    if (!midiApi || !selectedOut) return;

    // Send standard MIDI Realtime messages for broader compatibility
    if (cmd === "start") {
      void midiApi.send({ portId: selectedOut, msg: { t: "start" } });
    } else if (cmd === "stop") {
      void midiApi.send({ portId: selectedOut, msg: { t: "stop" } });
    }

    // Also send OXI-specific CCs if enabled on device
    const cc = cmd === "stop" ? 105 : cmd === "start" ? 106 : 107;
    void midiApi.send({
      portId: selectedOut,
      msg: { t: "cc", ch: 1, cc, val: 127 },
    });

    // Local feedback
    if (cmd === "start") onStartChain();
    if (cmd === "stop") onStopChain();
  };

  const onQuickOxiSetup = () => {
    if (!selectedIn || !selectedOut) return;

    setRoutes((current) => {
      // Check if we already have OXI routes to prevent duplication/mess
      const hasOxi = current.some((r) => r.id.startsWith("oxi-split-"));
      if (hasOxi) {
        return [
          ...current.filter((r) => !r.id.startsWith("oxi-split-")),
          {
            id: "oxi-split-a",
            fromId: selectedIn,
            toId: selectedOut,
            channelMode: "passthrough",
            filter: { allowTypes: undefined, allowClock: true }, // Explicitly allow clock/transport
          },
          {
            id: "oxi-split-b",
            fromId: selectedIn,
            toId: selectedOut,
            channelMode: "passthrough",
            filter: { allowTypes: undefined, allowClock: true },
          },
          {
            id: "oxi-split-c",
            fromId: selectedIn,
            toId: selectedOut,
            channelMode: "passthrough",
            filter: { allowTypes: undefined, allowClock: true },
          },
        ];
      }

      // Append new ones
      return [
        ...current,
        {
          id: "oxi-split-a",
          fromId: selectedIn,
          toId: selectedOut,
          channelMode: "passthrough",
          filter: { allowTypes: undefined, allowClock: true },
        },
        {
          id: "oxi-split-b",
          fromId: selectedIn,
          toId: selectedOut,
          channelMode: "passthrough",
          filter: { allowTypes: undefined, allowClock: true },
        },
        {
          id: "oxi-split-c",
          fromId: selectedIn,
          toId: selectedOut,
          channelMode: "passthrough",
          filter: { allowTypes: undefined, allowClock: true },
        },
      ];
    });
  };

  const onStandardOxiSetup = () => {
    if (!selectedIn || !selectedOut) return;

    setRoutes((current) => {
      // Clean up any existing OXI routes (split or standard) to avoid conflicts
      const clean = current.filter(
        (r) => !r.id.startsWith("oxi-split-") && !r.id.startsWith("oxi-main")
      );

      return [
        ...clean,
        {
          id: "oxi-main",
          fromId: selectedIn,
          toId: selectedOut,
          channelMode: "passthrough",
          filter: { allowTypes: undefined, allowClock: true }, // Host capability
        },
      ];
    });
  };

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
    onStartChain,
    onStopChain,
    onOxiTransport,
    onQuickOxiSetup,
    onStandardOxiSetup,
    transportChannel,
    setTransportChannel,
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
    snapshotChains,
    setSnapshotChains,
    chainRunnerRef,
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
    modulationState,
    setModulationState,
    hardwareState, // Export for UI
    instrumentLibrary,
  };
}
