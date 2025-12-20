import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  Camera,
  CheckCircle2,
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
  Zap
} from "lucide-react";
import { defaultSlots, getInstrumentProfile, INSTRUMENT_PROFILES } from "@midi-playground/core";
import type { ControlElement, Curve, MappingSlot, MidiEvent, MidiMsg, MidiPortRef } from "@midi-playground/core";
import type {
  MidiBackendInfo,
  MidiPortInfo,
  MidiPorts,
  MidiSendPayload,
  RouteConfig,
  RouteFilter
} from "../../shared/ipcTypes";
import { defaultProjectState } from "../../shared/projectTypes";
import type {
  AppView,
  ChainStep,
  DeviceConfig,
  ProjectStateV1,
  SnapshotMode,
  SnapshotQuantize
} from "../../shared/projectTypes";
import { ControlLabPage } from "./ControlLabPage";
import { SurfaceBoardPage } from "./SurfaceBoardPage";
import { MacroTargetEditor } from "./components/MacroTargetEditor";
import { quantizeToMs } from "./lib/tempo";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;
const CLOCK_PPQN = 24;

const styles: Record<string, any> = {
  window: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#0a0a0a",
    color: "#e0e0e0",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
  chrome: {
    display: "flex",
    flexDirection: "column",
    height: "100%"
  },
  topBar: {
    height: "60px",
    backgroundColor: "#1a1a1a",
    borderBottom: "1px solid #333",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: "24px"
  },
  cluster: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  badgeTitle: {
    fontSize: "10px",
    textTransform: "uppercase",
    color: "#888",
    letterSpacing: "0.05em"
  },
  badgeValue: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  pillRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#252525",
    padding: "4px 8px",
    borderRadius: "4px"
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden"
  },
  nav: {
    width: "240px",
    background: "linear-gradient(180deg, #0f2435 0%, #0b1b28 100%)",
    borderRight: "1px solid #0e3a50",
    display: "flex",
    flexDirection: "column"
  },
  navHeader: {
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  logo: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: "0.1em"
  },
  navSection: {
    flex: 1,
    padding: "10px 0"
  },
  navItem: {
    width: "100%",
    padding: "12px 20px",
    border: "none",
    textAlign: "left",
    color: "#b5b5b5",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    transition: "all 0.2s",
    background: "none",
    backgroundImage: "none"
  },
  navFooter: {
    padding: "20px",
    borderTop: "1px solid #1e1e1e",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  content: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    overflowY: "auto",
    padding: "24px"
  },
  bottomBar: {
    height: "32px",
    backgroundColor: "#101010",
    borderTop: "1px solid #1e1e1e",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    fontSize: "11px",
    color: "#888"
  },
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid #222",
    paddingBottom: "16px"
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "300",
    margin: 0
  },
  pageGrid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px"
  },
  panel: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column"
  },
  panelHeader: {
    padding: "12px 16px",
    borderBottom: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#222"
  },
  panelTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#bbb"
  },
  panelContent: {
    padding: "16px",
    flex: 1
  },
  btnPrimary: {
    backgroundColor: "#1a89c8",
    background: "#1a89c8",
    backgroundImage: "none",
    color: "white",
    border: "none",
    padding: "6px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500"
  },
  btnSecondary: {
    backgroundColor: "#1c1f24",
    background: "#1c1f24",
    backgroundImage: "none",
    color: "#e1e8f0",
    border: "1px solid #29313a",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px"
  },
  btnDanger: {
    backgroundColor: "#a11b1b",
    background: "#a11b1b",
    backgroundImage: "none",
    color: "white",
    border: "1px solid #c02424",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px"
  },
  btnTiny: {
    backgroundColor: "#2a2a2a",
    background: "#2a2a2a",
    backgroundImage: "none",
    color: "#ccc",
    border: "1px solid #444",
    padding: "2px 6px",
    borderRadius: "2px",
    fontSize: "10px",
    cursor: "pointer"
  },
  input: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
    color: "#eee",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "13px",
    width: "100%"
  },
  inputNarrow: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #333",
    color: "#eee",
    padding: "4px 6px",
    borderRadius: "4px",
    fontSize: "12px",
    width: "50px",
    textAlign: "center"
  },
  select: {
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    color: "#eee",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px"
  },
  selectWide: {
    backgroundColor: "#2a2a2a",
    border: "1px solid #444",
    color: "#eee",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    width: "100%"
  },
  pill: {
    padding: "2px 8px",
    backgroundColor: "#333",
    borderRadius: "10px",
    fontSize: "10px",
    color: "#aaa"
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%"
  },
  valueText: {
    fontSize: "13px",
    fontWeight: "500"
  },
  kpi: {
    fontSize: "16px",
    fontWeight: "bold",
    fontFamily: "monospace",
    color: "#35c96a"
  },
  table: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    backgroundColor: "#222",
    borderRadius: "4px"
  },
  cellSmall: {
    width: "40px",
    color: "#666",
    fontSize: "11px",
    fontFamily: "monospace"
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer"
  },
  muted: {
    fontSize: "12px",
    color: "#666"
  },
  card: {
    padding: "12px",
    backgroundColor: "#222",
    borderRadius: "4px",
    border: "1px solid #333",
    marginBottom: "8px"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
    gap: "8px"
  },
  tile: {
    aspectRatio: "1/1",
    backgroundColor: "#222",
    border: "1px solid #333",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
    padding: "8px",
    textAlign: "center",
    transition: "all 0.1s"
  },
  tileTitle: {
    fontSize: "12px",
    fontWeight: "bold",
    marginBottom: "4px"
  },
  tileMeta: {
    fontSize: "9px",
    color: "#555"
  },
  queueStrip: {
    height: "40px",
    backgroundColor: "#111",
    borderTop: "1px solid #333",
    marginTop: "20px",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    gap: "12px"
  }
};

function defaultControls(): ControlElement[] {
  return [
    { id: "knob-1", type: "knob", label: "Knob 1", value: 0, slots: defaultSlots() },
    { id: "knob-2", type: "knob", label: "Knob 2", value: 0, slots: defaultSlots() },
    { id: "fader-1", type: "fader", label: "Fader 1", value: 0, slots: defaultSlots() },
    { id: "button-1", type: "button", label: "Button 1", value: 0, slots: defaultSlots() }
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
  const [snapshots] = useState<string[]>(["INTRO", "VERSE", "CHORUS 1", "BUILD", "DROP!!", "OUTRO", "SOLO", "BREAK"]);
  const [activeSnapshot, setActiveSnapshot] = useState<string | null>(null);
  const [pendingSnapshot, setPendingSnapshot] = useState<string | null>(null);
  const [snapshotQuantize, setSnapshotQuantize] = useState<SnapshotQuantize>(defaults.snapshotQuantize);
  const [snapshotMode, setSnapshotMode] = useState<SnapshotMode>(defaults.snapshotMode);
  const [snapshotFadeMs, setSnapshotFadeMs] = useState(defaults.snapshotFadeMs);
  const snapshotTimerRef = useRef<number | null>(null);
  const [tempoBpm, setTempoBpm] = useState(defaults.tempoBpm);
  const [useClockSync, setUseClockSync] = useState(defaults.useClockSync);
  const [clockBpm, setClockBpm] = useState<number | null>(null);
  const [followClockStart, setFollowClockStart] = useState(defaults.followClockStart);
  const [chainSteps, setChainSteps] = useState<ChainStep[]>(defaults.chainSteps);
  const [chainPlaying, setChainPlaying] = useState(false);
  const chainTimerRef = useRef<number | null>(null);
  const [chainIndex, setChainIndex] = useState<number>(0);
  const lastClockTickRef = useRef<number | null>(null);
  const clockBpmRef = useRef<number | null>(null);
  const [controls, setControls] = useState<ControlElement[]>(() => defaultControls());
  const [selectedControlId, setSelectedControlId] = useState<string>("knob-1");
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastSentStateJsonRef = useRef<string | null>(null);
  const [clockHeartbeat, setClockHeartbeat] = useState(0);
  const selectedInRef = useRef<string | null>(null);
  const devicesRef = useRef<DeviceConfig[]>([]);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const [learnTarget, setLearnTarget] = useState<{ controlId: string; slotIndex: number } | null>(null);
  const learnTargetRef = useRef<{ controlId: string; slotIndex: number } | null>(null);
  const [learnStatus, setLearnStatus] = useState<"idle" | "listening" | "captured" | "timeout">("idle");
  const learnTimerRef = useRef<number | null>(null);
  const [mappingValidation, setMappingValidation] = useState<string | null>(null);

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
        setDevices(Array.isArray(state.devices) ? state.devices.slice(0, MAX_DEVICES) : []);
        setRoutes(Array.isArray(state.routes) ? state.routes : []);
        setControls(Array.isArray(state.controls) && state.controls.length > 0 ? state.controls : defaultControls());
        setSelectedControlId(state.selectedControlId ?? "knob-1");
        setForceChannelEnabled(state.ui?.routeBuilder?.forceChannelEnabled ?? true);
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
        setFollowClockStart(state.followClockStart ?? defaults.followClockStart);
        setSnapshotQuantize(state.snapshotQuantize ?? defaults.snapshotQuantize);
        setSnapshotMode(state.snapshotMode ?? defaults.snapshotMode);
        setSnapshotFadeMs(state.snapshotFadeMs ?? defaults.snapshotFadeMs);
        setChainSteps(Array.isArray(state.chainSteps) && state.chainSteps.length ? state.chainSteps : defaults.chainSteps);
      }

      await refreshBackends();
      if (state?.backendId) {
        await selectBackend(state.backendId);
      } else {
        await refreshPorts();
      }

      const available = await midiApi.listPorts();
      if (cancelled) return;

      const validIn = state?.selectedIn && available.inputs.some((p) => p.id === state.selectedIn) ? state.selectedIn : null;
      const validOut =
        state?.selectedOut && available.outputs.some((p) => p.id === state.selectedOut) ? state.selectedOut : null;

      setSelectedIn(validIn ?? available.inputs[0]?.id ?? null);
      setSelectedOut(validOut ?? available.outputs[0]?.id ?? null);

      setDevices((current) =>
        current.slice(0, MAX_DEVICES).map((d) => ({
          ...d,
          inputId: d.inputId && available.inputs.some((p) => p.id === d.inputId) ? d.inputId : null,
          outputId: d.outputId && available.outputs.some((p) => p.id === d.outputId) ? d.outputId : null
        }))
      );

      setRoutes((current) =>
        current.filter(
          (r) => available.inputs.some((p) => p.id === r.fromId) && available.outputs.some((p) => p.id === r.toId)
        )
      );

      setProjectHydrated(true);
    })().catch((err) => {
      console.error("Failed to load project", err);
      setProjectHydrated(true);
    });

    const unsubscribe = midiApi.onEvent((evt) => {
      const target = learnTargetRef.current;
      if (target && evt.msg.t === "cc") {
        const msg: Extract<MidiMsg, { t: "cc" }> = evt.msg;
        const currentSelectedIn = selectedInRef.current;
        if (!currentSelectedIn || evt.src.id === currentSelectedIn) {
          learnTargetRef.current = null;
          setLearnTarget(null);
          if (learnTimerRef.current) {
            window.clearTimeout(learnTimerRef.current);
            learnTimerRef.current = null;
          }
          setLearnStatus("captured");

          const devicesSnapshot = devicesRef.current;
          setControls((current) =>
            current.map((c) => {
              if (c.id !== target.controlId) return c;
              const slots = [...c.slots];
              const existing = slots[target.slotIndex];
              const fallbackTarget =
                selectedDeviceIdRef.current ?? devicesSnapshot[0]?.id ?? null;

              const nextSlot: MappingSlot = !existing || existing.kind !== "cc"
                ? {
                    enabled: true,
                    kind: "cc",
                    cc: clampMidi(msg.cc),
                    channel: clampChannel(msg.ch),
                    min: 0,
                    max: 127,
                    curve: "linear",
                    targetDeviceId: fallbackTarget
                  }
                : {
                    ...existing,
                    enabled: true,
                    cc: clampMidi(msg.cc),
                    channel: clampChannel(msg.ch),
                    targetDeviceId: existing.targetDeviceId ?? fallbackTarget
                  };

              const nextKey = slotConflictKey(nextSlot, devicesSnapshot);
              const conflictIdx =
                nextKey === null
                  ? -1
                  : slots.findIndex(
                      (slot, idx) =>
                        idx !== target.slotIndex && slotConflictKey(slot, devicesSnapshot) === nextKey
                    );

              if (conflictIdx !== -1) {
                const ccSlot = nextSlot as Extract<MappingSlot, { kind: "cc" }>;
                setMappingValidation(
                  `Slot S${target.slotIndex + 1} conflicts with slot S${conflictIdx + 1} (ch ${resolveSlotChannel(
                    nextSlot,
                    devicesSnapshot
                  )} CC ${ccSlot.cc ?? 0}).`
                );
                return c;
              }

              setMappingValidation(null);
              slots[target.slotIndex] = nextSlot;
              return { ...c, slots };
            })
          );
        }
      }

      setLog((current) => [evt, ...current].slice(0, LOG_LIMIT));

      if (evt.msg.t === "clock") {
        const now = evt.ts ?? Date.now();
        setClockHeartbeat((v) => (v + 1) % 1000);
        const last = lastClockTickRef.current;
        if (last) {
          const dtMs = now - last;
          if (dtMs > 0) {
            const bpm = 60000 / (dtMs * CLOCK_PPQN);
            const smoothed = clockBpmRef.current ? clockBpmRef.current * 0.7 + bpm * 0.3 : bpm;
            clockBpmRef.current = smoothed;
            setClockBpm(smoothed);
          }
        }
        lastClockTickRef.current = now;
      }

      if (evt.msg.t === "start" && followClockStart) {
        startChain();
      }
      if (evt.msg.t === "stop" && followClockStart) {
        stopChain();
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiApi]);

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

    const state: ProjectStateV1 = {
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
      chainSteps,
      devices,
      routes,
      controls,
      selectedControlId,
      ui: {
        routeBuilder: {
          forceChannelEnabled,
          routeChannel,
          allowNotes,
          allowCc,
          allowExpression,
          allowTransport,
          allowClock,
          clockDiv
        },
        diagnostics: {
          note,
          ccValue
        }
      }
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
    ccValue
  ]);

  useEffect(() => {
    if (!midiApi || !projectHydrated) return;

    const selectedBackendId = backends.find((b) => b.selected)?.id ?? null;

    const state: ProjectStateV1 = {
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
      chainSteps,
      devices,
      routes,
      controls,
      selectedControlId,
      ui: {
        routeBuilder: {
          forceChannelEnabled,
          routeChannel,
          allowNotes,
          allowCc,
          allowExpression,
          allowTransport,
          allowClock,
          clockDiv
        },
        diagnostics: {
          note,
          ccValue
        }
      }
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
    ccValue
  ]);

  const activity = useMemo(
    () =>
      log.map((evt, idx) => ({
        ...evt,
        label: describeMsg(evt.msg),
        _rowId: `${evt.ts}-${evt.src.id}-${idx}`
      })),
    [log]
  );
  const logCapReached = activity.length >= LOG_LIMIT;
  const clockStale = useMemo(
    () => useClockSync && (!lastClockTickRef.current || Date.now() - lastClockTickRef.current > 2000),
    [useClockSync, clockHeartbeat]
  );

  function relinkClock() {
    lastClockTickRef.current = null;
    clockBpmRef.current = null;
    setClockBpm(null);
    setClockHeartbeat((v) => (v + 1) % 1000);
  }

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
    const panicSrc: MidiPortRef = { id: "panic", name: "Panic", kind: "virtual" };
    const ts = Date.now();
    setLog((current) => [{ ts, src: panicSrc, msg: { t: "stop" } as MidiMsg }, ...current].slice(0, LOG_LIMIT));
    const outs = ports.outputs;
    for (const out of outs) {
      for (let ch = 1; ch <= 16; ch++) {
        await midiApi.send({ portId: out.id, msg: { t: "cc", ch, cc: 123, val: 0 } });
        await midiApi.send({ portId: out.id, msg: { t: "cc", ch, cc: 120, val: 0 } });
      }
      await midiApi.send({ portId: out.id, msg: { t: "stop" } });
    }
  }

  async function resetProject() {
    if (!midiApi) return;
    const ok = window.confirm("Reset project? This clears devices, routes, and mappings.");
    if (!ok) return;

    const selectedBackendId = backends.find((b) => b.selected)?.id ?? null;
    const base = defaultProjectState();
    const state: ProjectStateV1 = {
      ...base,
      backendId: selectedBackendId,
      selectedIn,
      selectedOut,
      selectedDeviceId: null,
      controls: defaultControls(),
      selectedControlId: "knob-1"
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
    setMappingValidation(null);

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
    setMappingValidation(null);
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
        msg: { t: "noteOn", ch: DIAG_CHANNEL, note: DIAG_NOTE, vel: 100 }
      });
      setTimeout(() => {
        midiApi.send({ portId: selectedOut, msg: { t: "noteOff", ch: DIAG_CHANNEL, note: DIAG_NOTE, vel: 0 } });
      }, 150);
      setDiagMessage(ok ? "Test note sent. Check downstream device/monitor." : "Send failed.");
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
      msg: { t: "noteOn", ch: channel, note, vel: 110 }
    });
    setTimeout(() => {
      midiApi.send({
        portId: selectedOut,
        msg: { t: "noteOff", ch: channel, note, vel: 0 }
      });
    }, 220);
  }

  async function sendCc() {
    if (!midiApi || !selectedOut) return;
    await midiApi.send({
      portId: selectedOut,
      msg: { t: "cc", ch: 1, cc: 1, val: ccValue }
    });
  }

  async function sendQuickNote(portId: string | null, channel: number, noteValue: number, velocity = 100) {
    if (!midiApi || !portId) return;
    await midiApi.send({ portId, msg: { t: "noteOn", ch: channel, note: noteValue, vel: velocity } });
    setTimeout(() => {
      void midiApi.send({ portId, msg: { t: "noteOff", ch: channel, note: noteValue, vel: 0 } });
    }, 180);
  }

  async function sendQuickCc(portId: string | null, channel: number, cc: number, val: number) {
    if (!midiApi || !portId) return;
    await midiApi.send({ portId, msg: { t: "cc", ch: channel, cc, val } });
  }

  async function sendQuickProgram(portId: string | null, channel: number, program: number) {
    if (!midiApi || !portId) return;
    await midiApi.send({ portId, msg: { t: "programChange", ch: channel, program } });
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
        inputId: ports.inputs[0]?.id ?? null,
        outputId: ports.outputs[0]?.id ?? null,
        channel: 1,
        clockEnabled: true
      }
    ]);
  }

  function updateDevice(id: string, partial: Partial<DeviceConfig>) {
    setDevices((current) => current.map((d) => (d.id === id ? { ...d, ...partial } : d)));
  }

  function removeDevice(id: string) {
    setDevices((current) => current.filter((d) => d.id !== id));
    if (selectedDeviceId === id) {
      setSelectedDeviceId(null);
    }
  }

  function addRoute() {
    if (!midiApi) return;
    const device = selectedDeviceId ? devices.find((d) => d.id === selectedDeviceId) : null;
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
      clockDiv: clockDiv > 1 ? clockDiv : undefined
    };
    const route: RouteConfig = {
      id: makeRouteId(),
      fromId,
      toId,
      channelMode: forceChannelEnabled ? "force" : "passthrough",
      forceChannel: forceChannelEnabled ? clampChannel(channelToForce) : undefined,
      filter
    };
    setRoutes((current) => [...current, route]);
  }

  function addDeviceRoutes() {
    setRoutes((current) => {
      const next = [...current];
      devices.forEach((device) => {
        if (!device.inputId || !device.outputId) return;
        const exists = next.some((r) => r.fromId === device.inputId && r.toId === device.outputId);
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
          forceChannel: forceChannelEnabled ? clampChannel(device.channel ?? routeChannel) : undefined,
          filter: {
            allowTypes: allowTypes.length ? allowTypes : undefined,
            clockDiv: clockDiv > 1 ? clockDiv : undefined
          }
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
        const exists = routes.some((r) => r.fromId === nextIn && r.toId === nextOut);
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
              forceChannel: forceChannelEnabled ? clampChannel(routeChannel) : undefined,
              filter: {
                allowTypes: allowTypes.length ? allowTypes : undefined,
                clockDiv: clockDiv > 1 ? clockDiv : undefined
              }
            }
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

  const selectedControl = controls.find((c) => c.id === selectedControlId) ?? controls[0];

  function updateControl(id: string, partial: Partial<ControlElement>) {
    setControls((current) => current.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  }

  function updateSlot(controlId: string, slotIndex: number, partial: Partial<MappingSlot>) {
    setControls((current) =>
      current.map((c) => {
        if (c.id !== controlId) return c;
        const slots = [...c.slots];
        const existing = slots[slotIndex];
        if (!existing) return c;
        slots[slotIndex] = { ...(existing as any), ...(partial as any) } as MappingSlot;
        return { ...c, slots };
      })
    );
  }

  async function emitControl(control: ControlElement, rawValue: number) {
    if (!midiApi) return;
    await midiApi.emitMapping({
      control: { ...control, value: clampMidi(rawValue) },
      value: clampMidi(rawValue),
      devices: devices.map((d) => ({ id: d.id, outputId: d.outputId, channel: d.channel }))
    });
  }

  async function sendOxiTransport(cc: 105 | 106 | 107) {
    if (!midiApi || !selectedOut) return;
    await midiApi.send({ portId: selectedOut, msg: { t: "cc", ch: 1, cc, val: 127 } });
  }

  function scheduleBurstSend(batch: MidiSendPayload[], sender: (payload: MidiSendPayload) => Promise<unknown>) {
    const spacingMs = 6;
    batch.slice(0, 512).forEach((payload, idx) => {
      window.setTimeout(() => {
        void sender(payload);
      }, idx * spacingMs);
    });
  }

  async function sendSnapshotNow() {
    if (!midiApi) return;
    const batches: { portId: string; msg: MidiMsg }[] = [];
    devices.forEach((device) => {
      if (!device.outputId) return;
      controls.forEach((control) => {
        control.slots.forEach((slot) => {
          if (!slot?.enabled || slot.kind !== "cc") return;
          const targetId = slot.targetDeviceId ?? device.id;
          if (targetId !== device.id) return;
          batches.push({
            portId: device.outputId!,
            msg: { t: "cc", ch: clampChannel(slot.channel ?? device.channel), cc: slot.cc ?? 0, val: slot.max ?? 127 }
          });
        });
      });
    });
    scheduleBurstSend(batches, (payload) => midiApi.send(payload));
  }

  function clearSnapshotTimer() {
    if (snapshotTimerRef.current) {
      window.clearTimeout(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }
  }

  function triggerSnapshot(name: string) {
    clearSnapshotTimer();
    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const qMs = quantizeToMs(snapshotQuantize, effectiveBpm);
  const shouldDelay = snapshotMode === "commit" && qMs > 0;
  const waitMs = shouldDelay ? qMs : qMs;
    if (qMs === 0 || snapshotMode === "jump") {
      setActiveSnapshot(name);
      void sendSnapshotNow();
      setPendingSnapshot(null);
      return;
    }
    setPendingSnapshot(name);
    snapshotTimerRef.current = window.setTimeout(() => {
      setActiveSnapshot(name);
      void sendSnapshotNow();
      setPendingSnapshot(null);
      snapshotTimerRef.current = null;
    }, waitMs);
  }

  function playChainStep(idx: number) {
    clearSnapshotTimer();
    if (idx >= chainSteps.length) {
      setChainPlaying(false);
      setChainIndex(0);
      return;
    }
    setChainIndex(idx);
    triggerSnapshot(chainSteps[idx].snapshot);
    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const delayMs = quantizeToMs(snapshotQuantize, effectiveBpm) * Math.max(1, chainSteps[idx].bars);
    if (delayMs === 0) {
      playChainStep(idx + 1);
      return;
    }
    chainTimerRef.current = window.setTimeout(() => playChainStep(idx + 1), delayMs);
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
    setPendingSnapshot(null);
  }

  function addChainStep() {
    if (snapshots.length === 0) return;
    const snapshot = activeSnapshot ?? snapshots[0];
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
      current.map((step, idx) => (idx === index ? { ...step, bars: Math.max(1, Math.min(64, bars)) } : step))
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
      devices,
      routes,
      controls,
      selectedControlId,
      ui: {
        routeBuilder: {
          forceChannelEnabled,
          routeChannel,
          allowNotes,
          allowCc,
          allowExpression,
          allowTransport,
          allowClock,
          clockDiv
        },
        diagnostics: {
          note,
          ccValue
        }
      }
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
          tempo={useClockSync && clockBpm ? clockBpm : tempoBpm}
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
              ? formatPortLabel(ports.inputs.find((p) => p.id === selectedIn)?.name ?? selectedIn)
              : "No input"
          }
          outputLabel={
            selectedOut
              ? formatPortLabel(ports.outputs.find((p) => p.id === selectedOut)?.name ?? selectedOut)
              : "No output"
          }
        />
        <BodySplitPane>
          <LeftNavRail route={route} onChangeRoute={(next) => setActiveView(next)} onPanic={panicAll} />
          <MainContentArea
            route={route}
            ports={ports}
            devices={devices}
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
            monitorRows={monitorRows}
            clearLog={clearLog}
            controls={controls}
            selectedControl={selectedControl}
            selectedControlId={selectedControlId}
            setSelectedControlId={setSelectedControlId}
            updateSlot={updateSlot}
            learnStatus={learnStatus}
            onLearn={(slotIndex) => selectedControl && startLearn(selectedControl.id, slotIndex)}
            onCancelLearn={cancelLearn}
            validationMessage={mappingValidation}
            setValidationMessage={setMappingValidation}
            note={note}
            ccValue={ccValue}
            onSendNote={sendTestNote}
            onSendCc={sendCc}
            onQuickTest={(portId, ch) => sendQuickNote(portId, ch, note)}
            onQuickCc={(portId, ch, ccNum, val) => sendQuickCc(portId, ch, ccNum, val)}
          onQuickProgram={(portId, ch, program) => sendQuickProgram(portId, ch, program)}
          onSendSnapshot={sendSnapshotNow}
          onAddDeviceRoutes={addDeviceRoutes}
          updateControl={updateControl}
          onEmitControl={emitControl}
          snapshots={snapshots}
          activeSnapshot={activeSnapshot}
          onSelectSnapshot={triggerSnapshot}
            pendingSnapshot={pendingSnapshot}
            snapshotQuantize={snapshotQuantize}
            snapshotMode={snapshotMode}
            onChangeSnapshotQuantize={setSnapshotQuantize}
            onChangeSnapshotMode={setSnapshotMode}
            snapshotFadeMs={snapshotFadeMs}
            onChangeSnapshotFade={(ms) => setSnapshotFadeMs(Math.max(0, ms))}
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
  outputLabel
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
        <GlobalActions onRefresh={onRefresh} onReset={onReset} onSave={onSave} loading={loadingPorts} />
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

function ProjectBadge({ saveLabel, lastSavedAt }: { saveLabel: string; lastSavedAt: number | null }) {
  return (
    <div style={styles.cluster}>
      <div style={styles.badgeTitle}>Project</div>
      <div style={styles.badgeValue}>
        <span style={styles.valueText}>Live_Set_01</span>
        <span style={{ ...styles.pill, color: "#35c96a" }}>{saveLabel}</span>
        {lastSavedAt ? <span style={styles.muted}>Saved {new Date(lastSavedAt).toLocaleTimeString()}</span> : null}
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
  onToggleFollowClockStart
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
          <button style={styles.btnTiny} onClick={() => onTempoChange(Math.max(20, tempo - 1))}>
            -
          </button>
          <button style={styles.btnTiny} onClick={() => onTempoChange(Math.min(300, tempo + 1))}>
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
          {useClockSync ? (clockStale ? "Clock: waiting…" : `Clock BPM: ${clockBpm?.toFixed(1) ?? "??"}`) : "Manual tempo"}
        </span>
        {useClockSync ? (
          <button style={styles.btnTiny} onClick={onRelinkClock} title="Reset clock detection">
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
          <div style={{ ...styles.dot, backgroundColor: midiReady ? "#35c96a" : "#8b0000" }} />
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
  clockLabel
}: {
  backendLabel: string;
  inputLabel: string;
  outputLabel: string;
  clockLabel: string;
}) {
  return (
    <div style={{ ...styles.bottomBar, backgroundColor: "#0f0f0f", borderTop: "1px solid #1e1e1e" }}>
      <div style={styles.row}>
        <span style={styles.muted}>Backend:</span> <span style={styles.valueText}>{backendLabel}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.muted}>In:</span> <span style={styles.valueText}>{inputLabel}</span>
        <span style={styles.muted}>Out:</span> <span style={styles.valueText}>{outputLabel}</span>
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
  loading
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
        <button style={styles.btnSecondary} onClick={onRefresh} disabled={loading}>
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
  onPanic
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
    { id: "chains", label: "Chains", icon: <LinkIcon size={18} /> },
    { id: "monitor", label: "Monitor", icon: <Activity size={18} /> },
    { id: "settings", label: "Settings", icon: <Settings size={18} /> }
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
              borderLeft: route === it.id ? "4px solid #19b0d7" : "4px solid transparent",
              paddingLeft: route === it.id ? "16px" : "20px",
              borderRadius: route === it.id ? "2px" : "0px"
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
  devices: DeviceConfig[];
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
  onQuickCc: (portId: string | null, channel: number, cc: number, val: number) => void;
  onQuickProgram: (portId: string | null, channel: number, program: number) => void;
  onSendSnapshot: () => void;
  onAddDeviceRoutes: () => void;
  snapshots: string[];
  activeSnapshot: string | null;
  onSelectSnapshot: (name: string) => void;
  pendingSnapshot: string | null;
  snapshotQuantize: SnapshotQuantize;
  snapshotMode: SnapshotMode;
  onChangeSnapshotQuantize: (q: SnapshotQuantize) => void;
  onChangeSnapshotMode: (m: SnapshotMode) => void;
  snapshotFadeMs: number;
  onChangeSnapshotFade: (ms: number) => void;
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
  monitorRows: { _rowId: string; ts: number; src: MidiPortRef; label: string }[];
  clearLog: () => void;
  controls: ControlElement[];
  selectedControl: ControlElement | undefined;
  selectedControlId: string | null;
  setSelectedControlId: (id: string) => void;
  updateSlot: (controlId: string, slotIndex: number, partial: Partial<MappingSlot>) => void;
  updateControl?: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl?: (control: ControlElement, rawValue: number) => void;
  learnStatus: "idle" | "listening" | "captured" | "timeout";
  onLearn: (slotIndex: number) => void;
  onCancelLearn: () => void;
  validationMessage: string | null;
  setValidationMessage: (msg: string | null) => void;
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

function RouteOutlet({ route, ...rest }: Parameters<typeof MainContentArea>[0]) {
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
          validationMessage={rest.validationMessage}
          setValidationMessage={rest.setValidationMessage}
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
          activeSnapshot={rest.activeSnapshot}
          pendingSnapshot={rest.pendingSnapshot}
          onSelectSnapshot={rest.onSelectSnapshot}
          snapshotQuantize={rest.snapshotQuantize}
          snapshotMode={rest.snapshotMode}
          onChangeSnapshotQuantize={rest.onChangeSnapshotQuantize}
          onChangeSnapshotMode={rest.onChangeSnapshotMode}
          snapshotFadeMs={rest.snapshotFadeMs}
          onChangeSnapshotFade={rest.onChangeSnapshotFade}
        />
      );
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
      return <MonitorPage monitorRows={rest.monitorRows} logCapReached={rest.logCapReached} clearLog={rest.clearLog} />;
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
          activeSnapshot={rest.activeSnapshot}
          pendingSnapshot={rest.pendingSnapshot}
          onSelectSnapshot={rest.onSelectSnapshot}
          snapshotQuantize={rest.snapshotQuantize}
          snapshotMode={rest.snapshotMode}
          onChangeSnapshotQuantize={rest.onChangeSnapshotQuantize}
          onChangeSnapshotMode={rest.onChangeSnapshotMode}
          snapshotFadeMs={rest.snapshotFadeMs}
          onChangeSnapshotFade={rest.onChangeSnapshotFade}
        />
      );
  }
}

function Page({ children }: { children: ReactNode }) {
  return <div style={styles.page}>{children}</div>;
}

function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={styles.pageHeader}>
      <h1 style={styles.pageTitle}>{title}</h1>
      <div>{right}</div>
    </div>
  );
}

function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
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

function SetupPage({
  ports,
  devices,
  selectedIn,
  selectedOut,
  onSelectIn,
  onSelectOut,
  diagMessage,
  diagRunning,
  onRunDiagnostics,
  onQuickStart,
  loadingPorts,
  onQuickTest,
  onQuickCc,
  onQuickProgram,
  onSendSnapshot,
  onAddDeviceRoutes
}: {
  ports: MidiPorts;
  devices: DeviceConfig[];
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
  onQuickCc: (portId: string | null, channel: number, cc: number, val: number) => void;
  onQuickProgram: (portId: string | null, channel: number, program: number) => void;
  onSendSnapshot: () => void;
  onAddDeviceRoutes: () => void;
}) {
  const selectedInLabel =
    selectedIn ? formatPortLabel(ports.inputs.find((p) => p.id === selectedIn)?.name ?? selectedIn) : "Not selected";
  const selectedOutLabel =
    selectedOut ? formatPortLabel(ports.outputs.find((p) => p.id === selectedOut)?.name ?? selectedOut) : "Not selected";
  const [quickCc, setQuickCc] = useState(74);
  const [quickVal, setQuickVal] = useState(100);
  const [quickProgram, setQuickProgram] = useState(0);
  const preferredOut = selectedOut ?? devices.find((d) => d.outputId)?.outputId ?? ports.outputs[0]?.id ?? null;
  const preferredChannel = devices.find((d) => d.outputId === preferredOut)?.channel ?? 1;

  return (
    <Page>
      <PageHeader
        title="Hardware Setup"
        right={
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={onQuickStart} disabled={loadingPorts}>
              Plug & Go
            </button>
            <button style={styles.btnSecondary} onClick={onAddDeviceRoutes} disabled={loadingPorts}>
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
                <span style={styles.cellSmall}>OUT {idx + 1}</span>
                <select style={styles.selectWide} value={dev.outputId ?? ""} onChange={(e) => onSelectOut(e.target.value)}>
                  <option value="">Select output</option>
                  {ports.outputs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {formatPortLabel(p.name)}
                    </option>
                  ))}
                </select>
                <div style={{ ...styles.dot, backgroundColor: selectedOut === dev.outputId ? "#35c96a" : "#444" }} />
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
          <button style={styles.btnPrimary} onClick={onRunDiagnostics} disabled={diagRunning || !selectedOut}>
            {diagRunning ? "Testing..." : "Run Diagnostics"}
          </button>
          {diagMessage ? <p style={styles.muted}>{diagMessage}</p> : null}
        </Panel>
      </div>
      <div style={styles.pageGrid2}>
        <Panel title="Quick Send (device sanity)">
          <p style={styles.muted}>Sends directly to the selected output (or first device with an output).</p>
          <div style={styles.row}>
            <button style={styles.btnSecondary} onClick={() => onQuickTest(preferredOut, preferredChannel)}>
              Send Note (C4)
            </button>
            <button
              style={styles.btnSecondary}
              onClick={() => onQuickCc(preferredOut, preferredChannel, quickCc, quickVal)}
            >
              Send CC
            </button>
            <button style={styles.btnSecondary} onClick={() => onQuickProgram(preferredOut, preferredChannel, quickProgram)}>
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
                onChange={(e) => setQuickProgram(clampMidi(Number(e.target.value)))}
              />
            </label>
          </div>
        </Panel>
        <Panel title="Snapshot Send">
          <p style={styles.muted}>Send current mapped CC slots for bound devices (light burst spacing).</p>
          <button style={styles.btnPrimary} onClick={onSendSnapshot}>
            Send Snapshot Now
          </button>
        </Panel>
      </div>
    </Page>
  );
}

function MappingPage({
  controls,
  selectedControl,
  selectedControlId,
  setSelectedControlId,
  updateSlot,
  updateControl,
  onEmitControl,
  learnStatus,
  onLearn,
  onCancelLearn,
  validationMessage,
  setValidationMessage,
  onSendNote,
  onSendCc,
  note,
  ccValue,
  devices
}: {
  controls: ControlElement[];
  selectedControl: ControlElement | undefined;
  selectedControlId: string | null;
  setSelectedControlId: (id: string) => void;
  updateSlot: (controlId: string, slotIndex: number, partial: Partial<MappingSlot>) => void;
  updateControl?: (id: string, partial: Partial<ControlElement>) => void;
  onEmitControl?: (control: ControlElement, rawValue: number) => void;
  learnStatus: "idle" | "listening" | "captured" | "timeout";
  onLearn: (slotIndex: number) => void;
  onCancelLearn: () => void;
  validationMessage: string | null;
  setValidationMessage: (msg: string | null) => void;
  onSendNote: () => void;
  onSendCc: () => void;
  note: number;
  ccValue: number;
  devices: DeviceConfig[];
}) {
  const firstSlot = selectedControl?.slots[0];
  const targetDeviceId = firstSlot && firstSlot.kind !== "empty" ? firstSlot.targetDeviceId : null;
  const targetDevice = devices.find((d) => targetDeviceId === d.id) ?? devices[0];
  const targetProfile = targetDevice ? getInstrumentProfile(targetDevice.instrumentId) : null;
  const [showWizard, setShowWizard] = useState(false);
  const [wizardSelected, setWizardSelected] = useState<number[]>([]);
  const [wizardCurve, setWizardCurve] = useState<Curve>("linear");
  const [wizardMin, setWizardMin] = useState(0);
  const [wizardMax, setWizardMax] = useState(127);
  const [wizardStartSlot, setWizardStartSlot] = useState(0);
  const [wizardDeviceId, setWizardDeviceId] = useState<string | null>(targetDevice?.id ?? null);
  const [wizardColor, setWizardColor] = useState("#38bdf8");
  const [multiLearnActive, setMultiLearnActive] = useState(false);
  const [multiLearnQueue, setMultiLearnQueue] = useState<number[]>([]);
  const [multiLearnCount, setMultiLearnCount] = useState(3);
  const [multiLearnStart, setMultiLearnStart] = useState(0);
  const [slotValidation, setSlotValidation] = useState<Record<number, string>>({});
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  const macroTargets = [
    { label: "Filter", cc: targetProfile?.cc[0]?.cc ?? 74, min: 0, max: 127, curve: "linear" as Curve },
    { label: "Resonance", cc: targetProfile?.cc[1]?.cc ?? 71, min: 0, max: 110, curve: "expo" as Curve },
    { label: "Env Amt", cc: targetProfile?.cc[2]?.cc ?? 79, min: 10, max: 120, curve: "log" as Curve }
  ];

  const slotConflictMessages = useMemo(() => {
    const map: Record<number, string> = {};
    if (!selectedControl) return map;
    const seen = new Map<string, number>();
    selectedControl.slots.forEach((slot, idx) => {
      const key = slotConflictKey(slot, devices);
      if (!key) return;
      const existingIdx = seen.get(key);
      if (existingIdx !== undefined) {
        map[idx] = `Conflicts with slot S${existingIdx + 1}`;
        if (!map[existingIdx]) {
          map[existingIdx] = `Conflicts with slot S${idx + 1}`;
        }
      } else {
        seen.set(key, idx);
      }
    });
    return map;
  }, [devices, selectedControl]);

  function updateSlotWithValidation(slotIndex: number, partial: Partial<MappingSlot>) {
    if (!selectedControl) return;
    const nextSlot = { ...selectedControl.slots[slotIndex], ...partial } as MappingSlot;
    const nextKey = slotConflictKey(nextSlot, devices);
    const conflictIdx =
      nextKey === null
        ? -1
        : selectedControl.slots.findIndex(
            (slot, idx) => idx !== slotIndex && slotConflictKey(idx === slotIndex ? nextSlot : slot, devices) === nextKey
          );

    if (conflictIdx !== -1) {
      const ccSlot = nextSlot as Extract<MappingSlot, { kind: "cc" }>;
      setSlotValidation((current) => ({ ...current, [slotIndex]: `Conflicts with slot S${conflictIdx + 1}` }));
      setValidationMessage(
        `Slot S${slotIndex + 1} matches slot S${conflictIdx + 1} (ch ${resolveSlotChannel(nextSlot, devices)} CC ${
          ccSlot.cc ?? 0
        }).`
      );
      return;
    }

    setSlotValidation((current) => {
      const next = { ...current };
      delete next[slotIndex];
      return next;
    });
    setValidationMessage(null);
    updateSlot(selectedControl.id, slotIndex, partial);
  }

  function applyPreset(ccNumber: number, slotIndex = 0) {
    if (!selectedControl) return;
    updateSlotWithValidation(slotIndex, {
      kind: "cc",
      cc: clampMidi(ccNumber),
      enabled: true,
      targetDeviceId: targetDevice?.id ?? null,
      channel: clampChannel(targetDevice?.channel ?? 1)
    });
  }

  function applyMacroMultiBind() {
    if (!selectedControl) return;
    macroTargets.slice(0, selectedControl.slots.length).forEach((t, idx) => {
      updateSlotWithValidation(idx, {
        enabled: true,
        kind: "cc",
        cc: clampMidi(t.cc),
        min: t.min,
        max: t.max,
        curve: t.curve,
        targetDeviceId: targetDevice?.id ?? null,
        channel: clampChannel(targetDevice?.channel ?? 1)
      });
    });
    if (updateControl) {
      updateControl(selectedControl.id, { label: `${selectedControl.label} (macro x${macroTargets.length})` });
    }
  }

  function beginMultiLearn() {
    if (!selectedControl) return;
    const start = Math.max(0, Math.min(selectedControl.slots.length - 1, multiLearnStart));
    const count = Math.max(1, Math.min(selectedControl.slots.length - start, multiLearnCount));
    const indices = selectedControl.slots.map((_, idx) => idx).slice(start, start + count);
    if (!indices.length) return;
    setMultiLearnQueue(indices);
    setMultiLearnActive(true);
    setValidationMessage(null);
    onLearn(indices[0]);
  }

  const handleCancelLearn = () => {
    setMultiLearnActive(false);
    setMultiLearnQueue([]);
    setValidationMessage(null);
    onCancelLearn();
  };

  useEffect(() => {
    if (!multiLearnActive) return;
    if (learnStatus === "captured") {
      setMultiLearnQueue((current) => {
        const [, ...rest] = current;
        if (rest.length) {
          onLearn(rest[0]);
        } else {
          setMultiLearnActive(false);
        }
        return rest;
      });
    }

    if (learnStatus === "timeout") {
      setMultiLearnActive(false);
      setMultiLearnQueue([]);
    }
  }, [learnStatus, multiLearnActive, onLearn]);

  useEffect(() => {
    setSlotValidation({});
    setMultiLearnActive(false);
    setMultiLearnQueue([]);
  }, [selectedControlId]);

  function nudgeControl(next: number) {
    if (!selectedControl || !onEmitControl || !updateControl) return;
    const clamped = clampMidi(next);
    updateControl(selectedControl.id, { value: clamped });
    onEmitControl({ ...selectedControl, value: clamped }, clamped);
  }

  return (
    <Page>
      <PageHeader
        title="MIDI Mapping"
        right={
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={() => onLearn(0)}>
              <Zap size={14} /> Learn Slot
            </button>
            <button style={styles.btnSecondary} onClick={handleCancelLearn}>
              Cancel
            </button>
            <span style={styles.pill}>Status: {learnStatus}</span>
          </div>
        }
      />
      <div style={styles.pageGrid2}>
        <Panel title="Source Controls">
          <input style={styles.input} placeholder="Filter mappings..." />
          <div
            style={{
              height: "200px",
              marginTop: "12px",
              border: "1px solid #333",
              borderRadius: "4px",
              overflowY: "auto",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}
          >
            {controls.map((control) => (
              <button
                key={control.id}
                style={{
                  ...styles.navItem,
                  backgroundColor: control.id === selectedControlId ? "#0078d422" : "transparent",
                  color: control.id === selectedControlId ? "#fff" : "#888"
                }}
                onClick={() => setSelectedControlId(control.id)}
              >
                <CheckCircle2 size={14} /> {control.label}
              </button>
            ))}
          </div>
        </Panel>
        <Panel
          title={`Targets ${selectedControl ? `(${selectedControl.label})` : ""}`}
          right={
            <div style={styles.row}>
              {targetProfile ? (
                <button
                  style={styles.btnSecondary}
                  onClick={() => applyPreset(targetProfile.cc[0]?.cc ?? 74)}
                  disabled={!selectedControl}
                >
                  Quick-assign {targetProfile.cc[0]?.label ?? "Cutoff"}
                </button>
              ) : null}
              <button style={styles.btnSecondary} onClick={applyMacroMultiBind} disabled={!selectedControl}>
                Macro bind 3 targets
              </button>
              <button style={styles.btnSecondary} disabled={!selectedControl} onClick={() => setShowMacroEditor(true)}>
                Bulk edit targets
              </button>
              <button
                style={styles.btnSecondary}
                disabled={!selectedControl}
              onClick={() => {
                if (!selectedControl) return;
                selectedControl.slots.forEach((_, idx) =>
                  updateSlotWithValidation(idx, { enabled: false, kind: "empty" })
                );
              }}
            >
              Clear slots
              </button>
              <button style={styles.btnSecondary}>Add Target Slot</button>
            </div>
          }
        >
          {validationMessage ? (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid #7f1d1d",
                backgroundColor: "#2c1b1b",
                color: "#fca5a5",
                fontSize: 12
              }}
            >
              {validationMessage}
            </div>
          ) : null}
          <div style={{ ...styles.row, marginBottom: 8, flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
            <span style={styles.muted}>MIDI learn mode</span>
            <div style={styles.cluster}>
              <span style={styles.muted}>Start slot</span>
              <input
                style={styles.inputNarrow}
                type="number"
                min={1}
                max={selectedControl?.slots.length ?? 1}
                value={Math.min(selectedControl?.slots.length ?? 1, multiLearnStart + 1)}
                onChange={(e) =>
                  setMultiLearnStart(
                    Math.max(0, Math.min((selectedControl?.slots.length ?? 1) - 1, Number(e.target.value) - 1 || 0))
                  )
                }
              />
            </div>
            <div style={styles.cluster}>
              <span style={styles.muted}>Slot count</span>
              <input
                style={styles.inputNarrow}
                type="number"
                min={1}
                max={selectedControl?.slots.length ?? 1}
                value={Math.min(selectedControl?.slots.length ?? 1, multiLearnCount)}
                onChange={(e) =>
                  setMultiLearnCount(
                    Math.max(1, Math.min(selectedControl?.slots.length ?? 1, Number(e.target.value) || 1))
                  )
                }
              />
            </div>
            <button style={styles.btnSecondary} disabled={!selectedControl} onClick={beginMultiLearn}>
              <Zap size={14} /> MIDI Learn {multiLearnCount} slots
            </button>
            {multiLearnActive ? (
              <span style={styles.pill}>Listening ({multiLearnQueue.length} left)</span>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(selectedControl ? selectedControl.slots : []).map((slot, idx) => {
              const slotTargetId = slot.kind === "empty" ? "" : slot.targetDeviceId ?? "";
              const deviceName =
                slotTargetId && slotTargetId !== ""
                  ? devices.find((d) => d.id === slotTargetId)?.name ?? `Device ${slotTargetId}`
                  : "No target";
              const isCc = slot.kind === "cc";
              const isPc = slot.kind === "pc";
              const isNote = slot.kind === "note";
              const slotWarning = slotValidation[idx] ?? slotConflictMessages[idx];
              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div
                    style={{
                      ...styles.tableRow,
                      backgroundColor: slotWarning ? "#241313" : "#222",
                      border: slotWarning ? "1px solid #7f1d1d" : "1px solid #1f2937"
                    }}
                  >
                    <span style={styles.cellSmall}>S{idx + 1}</span>
                    <select
                      style={styles.select}
                      value={slot.kind}
                      onChange={(e) =>
                        updateSlotWithValidation(idx, {
                          kind: e.target.value as MappingSlot["kind"],
                          enabled: e.target.value !== "empty"
                        })
                      }
                    >
                      <option value="empty">Empty</option>
                      <option value="cc">CC</option>
                      <option value="pc">Program</option>
                      <option value="note">Note</option>
                    </select>
                    <label style={{ ...styles.toggleRow, marginLeft: 6 }}>
                      <input
                        type="checkbox"
                        checked={slot.enabled}
                        onChange={(e) => updateSlotWithValidation(idx, { enabled: e.target.checked })}
                      />
                      <span style={styles.muted}>On</span>
                    </label>
                  {isCc ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.cc ?? 0}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { cc: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                      <select
                        style={styles.select}
                        value={slot.curve ?? "linear"}
                        onChange={(e) => updateSlotWithValidation(idx, { curve: e.target.value as Curve })}
                      >
                        <option value="linear">Linear</option>
                        <option value="expo">Expo</option>
                        <option value="log">Log</option>
                      </select>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.min ?? 0}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { min: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.max ?? 127}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { max: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                    </>
                  ) : isPc ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.min ?? 0}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { min: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.max ?? 127}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { max: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                      <select
                        style={styles.select}
                        value={slot.curve ?? "linear"}
                        onChange={(e) => updateSlotWithValidation(idx, { curve: e.target.value as Curve })}
                      >
                        <option value="linear">Linear</option>
                        <option value="expo">Expo</option>
                        <option value="log">Log</option>
                      </select>
                    </>
                  ) : isNote ? (
                    <>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.note ?? 60}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { note: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={0}
                        max={127}
                        value={slot.vel ?? 100}
                        onChange={(e) =>
                          updateSlotWithValidation(idx, { vel: clampMidi(Number(e.target.value) || 0) })
                        }
                      />
                    </>
                  ) : null}
                    <select
                      style={styles.select}
                    value={slotTargetId}
                    onChange={(e) =>
                      updateSlotWithValidation(idx, {
                        targetDeviceId: e.target.value === "" ? null : e.target.value
                        })
                      }
                    >
                      <option value="">No target</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name || d.id}
                        </option>
                      ))}
                    </select>
                    <span style={styles.muted}>{deviceName}</span>
                  </div>
                  {slotWarning ? (
                    <span style={{ color: "#fca5a5", fontSize: 12, marginLeft: 8 }}>{slotWarning}</span>
                  ) : null}
                </div>
              );
            })}
          </div>
          {targetProfile ? (
            <div style={{ ...styles.row, marginTop: "12px", flexWrap: "wrap", gap: "6px" }}>
              <span style={styles.muted}>Top CCs:</span>
              {targetProfile.cc.slice(0, 5).map((c) => (
                <button key={c.id} style={styles.btnTiny} onClick={() => applyPreset(c.cc)}>
                  CC {c.cc} - {c.label}
                </button>
              ))}
              <select
                style={styles.select}
                onChange={(e) => {
                  const ccNum = Number(e.target.value);
                  if (!Number.isNaN(ccNum)) applyPreset(ccNum);
                }}
              >
                <option value="">Assign CC to Slot 1</option>
                {targetProfile.cc.map((c) => (
                  <option key={c.id} value={c.cc}>
                    CC {c.cc} - {c.label}
                  </option>
                ))}
              </select>
              <button
                style={styles.btnTiny}
                onClick={() => selectedControl && updateSlotWithValidation(0, { enabled: false })}
              >
                Disable Slot 1
              </button>
            </div>
          ) : null}
          <div style={{ ...styles.row, marginTop: "12px" }}>
            <button style={styles.btnSecondary} onClick={onSendCc}>
              Send CC {ccValue}
            </button>
            <button style={styles.btnSecondary} onClick={onSendNote}>
              Send Note {note}
            </button>
            <div style={styles.row}>
              <span style={styles.muted}>Live send</span>
              <button
                style={styles.btnTiny}
                disabled={!selectedControl}
                onClick={() => selectedControl && nudgeControl((selectedControl.value ?? 0) - 8)}
              >
                -
              </button>
              <button
                style={styles.btnTiny}
                disabled={!selectedControl}
                onClick={() => selectedControl && nudgeControl((selectedControl.value ?? 0) + 8)}
              >
                +
              </button>
              <span style={styles.muted}>Value: {selectedControl?.value ?? 0}</span>
            </div>
          </div>
        </Panel>
      </div>
      <MacroTargetEditor
        open={showMacroEditor}
        slots={selectedControl?.slots ?? []}
        devices={devices}
        onClose={() => setShowMacroEditor(false)}
        onApply={(nextSlots) => {
          nextSlots.forEach((slot, idx) => {
            if (slot.kind !== "cc") return;
            updateSlotWithValidation(idx, {
              min: clampMidi(slot.min ?? 0),
              max: clampMidi(slot.max ?? 127),
              curve: (slot.curve as Curve) ?? "linear",
              targetDeviceId: slot.targetDeviceId ?? null,
              channel: slot.channel
            });
          });
        }}
      />
    </Page>
  );
}

function SnapshotsPage({
  snapshots,
  activeSnapshot,
  pendingSnapshot,
  onSelectSnapshot,
  snapshotQuantize,
  snapshotMode,
  onChangeSnapshotQuantize,
  onChangeSnapshotMode,
  snapshotFadeMs,
  onChangeSnapshotFade
}: {
  snapshots: string[];
  activeSnapshot: string | null;
  pendingSnapshot: string | null;
  onSelectSnapshot: (name: string) => void;
  snapshotQuantize: SnapshotQuantize;
  snapshotMode: SnapshotMode;
  onChangeSnapshotQuantize: (q: SnapshotQuantize) => void;
  onChangeSnapshotMode: (m: SnapshotMode) => void;
  snapshotFadeMs: number;
  onChangeSnapshotFade: (ms: number) => void;
}) {
  const colors = ["#38bdf8", "#f472b6", "#22d3ee", "#f97316", "#a3e635", "#c084fc", "#facc15", "#fb7185"];

  return (
    <Page>
      <PageHeader
        title="Snapshots & Transitions"
        right={
          <div style={styles.row}>
            <span style={styles.muted}>Fade</span>
            <input
              style={styles.inputNarrow}
              value={snapshotFadeMs}
              onChange={(e) => onChangeSnapshotFade(Number(e.target.value) || 0)}
            />
            <select style={styles.select} value={snapshotMode} onChange={(e) => onChangeSnapshotMode(e.target.value as SnapshotMode)}>
              <option value="jump">Jump</option>
              <option value="commit">Commit @ cycle end</option>
            </select>
            <select
              style={styles.select}
              value={snapshotQuantize}
              onChange={(e) => onChangeSnapshotQuantize(e.target.value as SnapshotQuantize)}
            >
              <option value="immediate">Immediate</option>
              <option value="bar1">1 Bar Quant</option>
              <option value="bar4">4 Bar Quant</option>
            </select>
            <button style={styles.btnPrimary} onClick={() => activeSnapshot && onSelectSnapshot(activeSnapshot)}>
              Send Snapshot
            </button>
            {pendingSnapshot ? (
              <button style={styles.btnSecondary} onClick={() => onSelectSnapshot(activeSnapshot ?? pendingSnapshot)}>
                Cancel Pending
              </button>
            ) : null}
          </div>
        }
      />
      <div style={styles.pageGrid2}>
        <Panel title="Snapshot Pads">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {snapshots.map((t, idx) => {
              const color = colors[idx % colors.length];
              const isActive = activeSnapshot === t;
              const isPending = pendingSnapshot === t;
              return (
                <button
                  key={t}
                  onClick={() => onSelectSnapshot(t)}
                  style={{
                    height: 96,
                    borderRadius: 14,
                    border: `2px solid ${isActive ? color : "#1f2937"}`,
                    background: isActive ? `${color}22` : "#0b1220",
                    color: "#e2e8f0",
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    cursor: "pointer",
                    boxShadow: isActive ? "0 0 20px rgba(0,0,0,0.35)" : "none",
                    position: "relative"
                  }}
                >
                  <div style={{ position: "absolute", top: 10, left: 10, fontSize: 11, color: "#cbd5e1" }}>{t}</div>
                  <div style={{ position: "absolute", bottom: 10, right: 10, fontSize: 11, color }}>
                    {isPending ? "Pending" : isActive ? "Active" : "Ready"}
                  </div>
                </button>
              );
            })}
            <div style={{ ...styles.tile, border: "1px dashed #444" }}>
              <Plus size={20} color="#666" />
            </div>
          </div>
        </Panel>
        <Panel title={`Selected: ${activeSnapshot ?? "None"}`}>
          <div style={styles.card}>
            <div style={styles.row}>
              <span style={{ color: "#35c96a", fontSize: "12px" }}>{activeSnapshot ? "* Active" : "* Idle"}</span>
              {pendingSnapshot ? <span style={styles.muted}>Pending: {pendingSnapshot}</span> : null}
            </div>
            <div style={styles.row}>
              <span style={styles.muted}>Targets</span>
              <span style={styles.pill}>8 mapped</span>
            </div>
            <div style={styles.muted}>Add per-parameter curves and slew here.</div>
          </div>
        </Panel>
        <Panel title="Morph (conceptual)">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={styles.row}>
              <div style={{ ...styles.pillRow, border: "1px solid #1f2937" }}>
                <span style={styles.muted}>A</span>
                <select style={styles.select}>
                  {snapshots.map((s) => (
                    <option key={`a-${s}`}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ ...styles.pillRow, border: "1px solid #1f2937" }}>
                <span style={styles.muted}>B</span>
                <select style={styles.select}>
                  {snapshots.map((s) => (
                    <option key={`b-${s}`}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={styles.muted}>Crossfade</span>
              <input type="range" min={0} max={100} defaultValue={0} />
              <span style={styles.muted}>
                Future: interpolate per-parameter with curves and staged fades (filters slow, mutes fast).
              </span>
            </div>
          </div>
        </Panel>
      </div>
      <div style={styles.queueStrip}>
        <span style={{ fontSize: "11px", fontWeight: "bold" }}>NEXT ACTION:</span>
        <span style={styles.pill}>CHORUS 1 @ Bar 64</span>
        <button style={styles.btnTiny}>Cancel</button>
      </div>
    </Page>
  );
}

function ChainsPage({
  chainSteps,
  playing,
  currentIndex,
  quantize,
  onStart,
  onStop,
  onAddStep,
  onRemoveStep,
  onMoveStep,
  onUpdateBars
}: {
  chainSteps: ChainStep[];
  playing: boolean;
  currentIndex: number;
  quantize: SnapshotQuantize;
  onStart: () => void;
  onStop: () => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onMoveStep: (from: number, to: number) => void;
  onUpdateBars: (index: number, bars: number) => void;
}) {
  return (
    <Page>
      <PageHeader
        title="Performance Chains"
        right={
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={onAddStep}>
              Add Step
            </button>
            <button style={styles.btnSecondary} onClick={onStart} disabled={playing}>
              Play
            </button>
            <button style={styles.btnSecondary} onClick={onStop} disabled={!playing}>
              Stop
            </button>
          </div>
        }
      />
      <Panel title="Sequence Timeline">
        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          <div style={styles.card}>
            <div style={{ ...styles.row, justifyContent: "space-between" }}>
              <strong>Main Chain</strong>
              <span style={styles.muted}>Quantize: {quantize === "immediate" ? "Immediate" : quantize === "bar4" ? "4 bars" : "1 bar"}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
              {chainSteps.length === 0 ? (
                <span style={styles.muted}>No steps yet.</span>
              ) : (
                chainSteps.map((step, idx) => (
                  <div
                    key={`${step.snapshot}-${idx}`}
                    style={{
                      ...styles.pillRow,
                      backgroundColor: idx === currentIndex && playing ? "#103553" : "#1f2a33",
                      border: idx === currentIndex && playing ? "1px solid #19b0d7" : "1px solid #29313a"
                    }}
                  >
                    <span style={styles.valueText}>{step.snapshot}</span>
                    <div style={styles.row}>
                      <span style={styles.muted}>Bars</span>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={1}
                        max={64}
                        value={step.bars}
                        onChange={(e) => onUpdateBars(idx, Math.max(1, Math.min(64, Number(e.target.value) || 1)))}
                      />
                    </div>
                    <div style={styles.row}>
                      <button style={styles.btnTiny} onClick={() => onMoveStep(idx, idx - 1)} disabled={idx === 0}>
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        style={styles.btnTiny}
                        onClick={() => onMoveStep(idx, idx + 1)}
                        disabled={idx === chainSteps.length - 1}
                      >
                        <ChevronRight size={12} />
                      </button>
                      <button style={styles.btnTiny} onClick={() => onRemoveStep(idx)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button style={styles.btnSecondary} onClick={onAddStep}>
                + Step
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </Page>
  );
}

function MonitorPage({
  monitorRows,
  logCapReached,
  clearLog
}: {
  monitorRows: { _rowId: string; ts: number; src: MidiPortRef; label: string }[];
  logCapReached: boolean;
  clearLog: () => void;
}) {
  return (
    <Page>
      <PageHeader
        title="MIDI Monitor"
        right={
          <div style={styles.row}>
            {logCapReached ? <span style={styles.pill}>Log capped</span> : null}
            <button style={styles.btnSecondary} onClick={clearLog}>
              Clear Log
            </button>
          </div>
        }
      />
      <Panel title="Real-time Traffic">
        <div
          style={{
            height: "400px",
            backgroundColor: "#000",
            fontFamily: "monospace",
            padding: "12px",
            fontSize: "12px",
            color: "#35c96a",
            overflowY: "auto"
          }}
        >
          {monitorRows.length == 0 ? (
            <div style={{ color: "#666" }}>Waiting for MIDI activity...</div>
          ) : (
            monitorRows.map((row) => (
              <div key={row._rowId}>
                [{new Date(row.ts).toLocaleTimeString()}] {row.src.name}: {row.label}
              </div>
            ))
          )}
        </div>
      </Panel>
    </Page>
  );
}

function SettingsPage({
  selectedIn,
  selectedOut,
  onSelectIn,
  onSelectOut
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
  logCapReached
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
        <span style={{ color: midiReady ? "#35c96a" : "#8b0000" }}>{midiReady ? "MIDI OK" : "No MIDI"}</span>
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
type OxiAnalysis = { isOxi: boolean; oxiTag: "A" | "B" | "C" | "?" | null; rank: number };

function analyzeOxiPortName(name: string): OxiAnalysis {
  const n = (name ?? "").toLowerCase();
  const isOxi = n.includes("oxi");
  if (!isOxi) return { isOxi: false, oxiTag: null, rank: 1000 };

  const match = n.match(/(?:midi|usb)\s*([123])\b/) ?? n.match(/\b([123])\b/);
  const num = match?.[1];
  const oxiTag = num === "1" ? "A" : num === "2" ? "B" : num === "3" ? "C" : "?";
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

function clampChannel(channel: number) {
  if (Number.isNaN(channel)) return 1;
  return Math.min(Math.max(Math.round(channel), 1), 16);
}

function clampMidi(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

function resolveSlotChannel(slot: MappingSlot, devices: DeviceConfig[]) {
  if (slot.kind === "empty") return 1;
  const deviceChannel = slot.targetDeviceId
    ? devices.find((d) => d.id === slot.targetDeviceId)?.channel
    : undefined;
  return clampChannel(slot.channel ?? deviceChannel ?? 1);
}

function slotConflictKey(slot: MappingSlot, devices: DeviceConfig[]) {
  if (!slot.enabled || slot.kind !== "cc" || slot.cc == null) return null;
  const channel = resolveSlotChannel(slot, devices);
  const deviceId = slot.targetDeviceId ?? "default";
  return `${deviceId}:${channel}:${slot.cc}`;
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
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
