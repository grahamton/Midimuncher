import { useEffect, useMemo, useRef, useState } from "react";
import { defaultSlots, getInstrumentProfile, INSTRUMENT_PROFILES } from "@midi-playground/core";
import type {
  ControlElement,
  Curve,
  MappingSlot,
  MidiEvent,
  MidiMsg,
  SnapshotRecallStrategy
} from "@midi-playground/core";
import type {
  MidiBackendInfo,
  MidiPortInfo,
  MidiPorts,
  RouteConfig,
  RouteFilter,
  SnapshotCapturePayload,
  SnapshotRecallPayload
} from "../../shared/ipcTypes";
import { defaultProjectState } from "../../shared/projectTypes";
import type {
  AppView,
  DeviceConfig,
  ProjectState,
  SnapshotBankState,
  SnapshotSlotState,
  SnapshotsState
} from "../../shared/projectTypes";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;

function defaultControls(): ControlElement[] {
  return [
    { id: "knob-1", type: "knob", label: "Knob 1", value: 0, slots: defaultSlots() },
    { id: "knob-2", type: "knob", label: "Knob 2", value: 0, slots: defaultSlots() },
    { id: "fader-1", type: "fader", label: "Fader 1", value: 0, slots: defaultSlots() },
    { id: "button-1", type: "button", label: "Button 1", value: 0, slots: defaultSlots() }
  ];
}

export function App() {
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
  const [snapshots, setSnapshots] = useState<SnapshotsState>(() => defaultProjectState().snapshots);
  const [diagMessage, setDiagMessage] = useState<string | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("setup");
  const [controls, setControls] = useState<ControlElement[]>(() => defaultControls());
  const [selectedControlId, setSelectedControlId] = useState<string>("knob-1");
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const lastSentStateJsonRef = useRef<string | null>(null);
  const selectedInRef = useRef<string | null>(null);
  const devicesRef = useRef<DeviceConfig[]>([]);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const [learnTarget, setLearnTarget] = useState<{ controlId: string; slotIndex: number } | null>(null);
  const learnTargetRef = useRef<{ controlId: string; slotIndex: number } | null>(null);
  const [learnStatus, setLearnStatus] = useState<"idle" | "listening" | "captured" | "timeout">("idle");
  const learnTimerRef = useRef<number | null>(null);

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
        setSnapshots(state.snapshots ?? defaultProjectState().snapshots);
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
                selectedDeviceIdRef.current ?? devicesRef.current[0]?.id ?? null;

              if (!existing || existing.kind !== "cc") {
                slots[target.slotIndex] = {
                  enabled: true,
                  kind: "cc",
                  cc: clampMidi(evt.msg.cc),
                  channel: clampChannel(evt.msg.ch),
                  min: 0,
                  max: 127,
                  curve: "linear",
                  targetDeviceId: fallbackTarget
                };
              } else {
                slots[target.slotIndex] = {
                  ...existing,
                  enabled: true,
                  cc: clampMidi(evt.msg.cc),
                  channel: clampChannel(evt.msg.ch),
                  targetDeviceId: existing.targetDeviceId ?? fallbackTarget
                };
              }
              return { ...c, slots };
            })
          );
        }
      }

      setLog((current) => [evt, ...current].slice(0, LOG_LIMIT));
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

    const state: ProjectState = {
      backendId: selectedBackendId,
      selectedIn,
      selectedOut,
      activeView,
      selectedDeviceId,
      devices,
      routes,
      controls,
      selectedControlId,
      snapshots,
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
    snapshots,
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

    const state: ProjectState = {
      backendId: selectedBackendId,
      selectedIn,
      selectedOut,
      activeView,
      selectedDeviceId,
      devices,
      routes,
      controls,
      selectedControlId,
      snapshots,
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
    devices,
    routes,
    controls,
    selectedControlId,
    snapshots,
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
  const activeSnapshotBank = useMemo(
    () => snapshots.banks.find((b) => b.id === snapshots.activeBankId) ?? snapshots.banks[0] ?? null,
    [snapshots]
  );

  useEffect(() => {
    if (!snapshots.activeBankId && snapshots.banks[0]) {
      setSnapshots((current) => ({ ...current, activeBankId: current.banks[0]?.id ?? null }));
    }
  }, [snapshots]);

  function setActiveSnapshotBank(bankId: string) {
    setSnapshots((current) => ({ ...current, activeBankId: bankId }));
  }

  function updateSnapshotBank(bankId: string, updater: (bank: SnapshotBankState) => SnapshotBankState) {
    setSnapshots((current) => ({
      ...current,
      banks: current.banks.map((bank) => (bank.id === bankId ? updater(bank) : bank))
    }));
  }

  function updateSnapshotSlot(bankId: string, slotId: string, updater: (slot: SnapshotSlotState) => SnapshotSlotState) {
    updateSnapshotBank(bankId, (bank) => ({
      ...bank,
      slots: bank.slots.map((slot) => (slot.id === slotId ? updater(slot) : slot))
    }));
  }

  function updateSnapshotsState(partial: Partial<SnapshotsState>) {
    setSnapshots((current) => ({ ...current, ...partial }));
  }

  async function captureSnapshotSlot(bankId: string, slotId: string) {
    if (!midiApi) return;
    try {
      const payload: SnapshotCapturePayload = { notes: snapshots.captureNotes };
      const snapshot = await midiApi.captureSnapshot(payload);
      updateSnapshotSlot(bankId, slotId, (slot) => ({
        ...slot,
        snapshot,
        lastCapturedAt: snapshot.capturedAt,
        notes: snapshots.captureNotes
      }));
    } catch (err) {
      console.error("Failed to capture snapshot", err);
    }
  }

  async function recallSnapshotSlot(bankId: string, slotId: string, strategy?: SnapshotRecallStrategy) {
    if (!midiApi) return;
    const bank = snapshots.banks.find((b) => b.id === bankId);
    const slot = bank?.slots.find((s) => s.id === slotId);
    if (!slot?.snapshot) return;
    const payload: SnapshotRecallPayload = {
      snapshot: slot.snapshot,
      strategy: strategy ?? snapshots.strategy,
      fadeMs: snapshots.fadeMs,
      commitDelayMs: snapshots.commitDelayMs,
      burst: snapshots.burst
    };
    try {
      await midiApi.recallSnapshot(payload);
    } catch (err) {
      console.error("Failed to recall snapshot", err);
    }
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

  async function resetProject() {
    if (!midiApi) return;
    const ok = window.confirm("Reset project? This clears devices, routes, mappings, and snapshots.");
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
      selectedControlId: "knob-1"
    };

    setActiveView(state.activeView);
    setSelectedDeviceId(state.selectedDeviceId);
    setDevices(state.devices);
    setRoutes(state.routes);
    setControls(state.controls);
    setSelectedControlId(state.selectedControlId ?? "knob-1");
    setSnapshots(state.snapshots);
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

  return (
    <div className="page">
      {!midiApi ? (
        <div className="panel">
          <h2>Waiting for Electron preload</h2>
          <p className="muted">
            This page must run inside the Electron app. Start with <code>corepack pnpm -C apps/desktop dev</code> and
            use the Electron window instead of opening the Vite URL in a browser.
          </p>
        </div>
      ) : null}

      <header className="hero">
        <div>
          <p className="eyebrow">Midi Muncher</p>
          <h1>Performance hub</h1>
          <p className="lede">Select backend, define devices, route MIDI, and monitor traffic.</p>
        </div>
        <div className="hero-actions">
          <span
            className={`pill ${saveStatus}`}
            title={lastSavedAt ? `Last saved: ${new Date(lastSavedAt).toLocaleTimeString()}` : undefined}
          >
            {saveStatus === "idle" ? "Not saved yet" : saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save error"}
          </span>
          <button className="ghost" onClick={refreshPorts} disabled={loadingPorts}>
            {loadingPorts ? "Scanning..." : "Refresh devices"}
          </button>
          <button className="ghost" onClick={resetProject} disabled={!projectHydrated}>
            Reset project
          </button>
          <nav className="nav">
            <button className={activeView === "setup" ? "ghost active" : "ghost"} onClick={() => setActiveView("setup")}>
              Setup
            </button>
            <button className={activeView === "routes" ? "ghost active" : "ghost"} onClick={() => setActiveView("routes")}>
              Routing
            </button>
            <button
              className={activeView === "mapping" ? "ghost active" : "ghost"}
              onClick={() => setActiveView("mapping")}
            >
              Mapping
            </button>
            <button
              className={activeView === "snapshots" ? "ghost active" : "ghost"}
              onClick={() => setActiveView("snapshots")}
            >
              Snapshots
            </button>
            <button className={activeView === "monitor" ? "ghost active" : "ghost"} onClick={() => setActiveView("monitor")}>
              Monitor
            </button>
            <button className={activeView === "help" ? "ghost active" : "ghost"} onClick={() => setActiveView("help")}>
              Help
            </button>
          </nav>
        </div>
      </header>

      {activeView === "setup" ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Devices & Backend</h2>
              <p>Pick backend, set up to 8 devices, and choose defaults.</p>
            </div>
            <div className="grid two">
              <div className="card">
                <div className="card-head">
                  <h3>MIDI backend</h3>
                </div>
                {backends.length === 0 ? (
                  <p className="muted">No backend info yet.</p>
                ) : (
                  <select
                    value={backends.find((b) => b.selected)?.id ?? ""}
                    onChange={(e) => selectBackend(e.target.value)}
                  >
                    {backends.map((b) => (
                      <option key={b.id} value={b.id} disabled={!b.available}>
                        {b.label} {b.available ? "" : "(unavailable)"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>Diagnostics</h3>
                </div>
                <p className="muted">Sends a test note to the selected output.</p>
                <button onClick={runDiagnostics} disabled={!selectedOut || diagRunning}>
                  {diagRunning ? "Testing..." : "Run diagnostics"}
                </button>
                {diagMessage ? <p className="muted">{diagMessage}</p> : null}
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>OXI transport</h3>
                </div>
                <p className="muted">Sends CC 105/106/107 to the selected output (requires “CC Transport Msgs” on OXI).</p>
                <div className="chips">
                  <button className="ghost" onClick={() => sendOxiTransport(106)} disabled={!selectedOut}>
                    Play (CC 106)
                  </button>
                  <button className="ghost" onClick={() => sendOxiTransport(105)} disabled={!selectedOut}>
                    Stop (CC 105)
                  </button>
                  <button className="ghost" onClick={() => sendOxiTransport(107)} disabled={!selectedOut}>
                    Record (CC 107)
                  </button>
                </div>
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>OXI quick setup</h3>
                </div>
                {(() => {
                  const oxiIn = ports.inputs.filter((p) => analyzeOxiPortName(p.name).isOxi).sort(sortPortsWithOxiFirst);
                  const oxiOut = ports.outputs.filter((p) => analyzeOxiPortName(p.name).isOxi).sort(sortPortsWithOxiFirst);
                  const preferredIn = oxiIn[0]?.id ?? null;
                  const preferredOut = oxiOut[0]?.id ?? null;

                  if (oxiIn.length === 0 && oxiOut.length === 0) {
                    return (
                      <p className="muted">
                        No OXI ports detected yet. Set OXI USB mode to <strong>Device</strong>, then click Refresh devices.
                      </p>
                    );
                  }

                  return (
                    <>
                      {oxiOut.length > 0 ? (
                        <p className="muted">Detected OXI outputs: {oxiOut.map((p) => formatPortLabel(p.name)).join(" • ")}</p>
                      ) : (
                        <p className="muted">No OXI outputs detected (needed to send notes/CC).</p>
                      )}
                      {oxiIn.length > 0 ? (
                        <p className="muted">Detected OXI inputs: {oxiIn.map((p) => formatPortLabel(p.name)).join(" • ")}</p>
                      ) : (
                        <p className="muted">No OXI inputs detected (optional, used for monitoring).</p>
                      )}
                      <div className="chips">
                        <button className="ghost" onClick={() => setSelectedOut(preferredOut)} disabled={!preferredOut}>
                          Use OXI output
                        </button>
                        <button className="ghost" onClick={() => setSelectedIn(preferredIn)} disabled={!preferredIn}>
                          Use OXI input
                        </button>
                      </div>
                      <p className="muted">
                        Split tip: when OXI Split is enabled, you should see multiple OXI ports (A/B/C). Midimuncher labels these
                        as OXI A/B/C based on the port name.
                      </p>
                    </>
                  );
                })()}
              </div>
              <DeviceSelect
                title="Input (monitor)"
                ports={ports.inputs}
                selectedId={selectedIn}
                onSelect={setSelectedIn}
                emptyLabel="No MIDI inputs detected"
              />
              <DeviceSelect
                title="Output (send)"
                ports={ports.outputs}
                selectedId={selectedOut}
                onSelect={setSelectedOut}
                emptyLabel="No MIDI outputs detected"
              />
              <div className="card">
                <div className="card-head">
                  <h3>Devices</h3>
                  <span className="pill">
                    {devices.length}/{MAX_DEVICES}
                  </span>
                </div>
                {devices.length === 0 ? <p className="muted">Add devices to mirror your rig.</p> : null}
                <div className="hint">
                  <p className="muted">
                    OXI tip: If you enable OXI Split in OXI MIDI settings, Windows should expose multiple OXI ports (A/B/C).
                    Bind each device output to the desired OXI port to access more channels.
                  </p>
                  <p className="muted">
                    Loop tip: If you hear double-triggering, disable OXI USB Thru so the app is the only router.
                  </p>
                </div>
                <div className="stack">
                  {devices.map((d) => (
                    <div key={d.id} className="device-row">
                      <div className="device-header">
                        <input
                          type="text"
                          value={d.name}
                          onChange={(e) => updateDevice(d.id, { name: e.target.value })}
                          aria-label="Device name"
                        />
                        <button className="ghost" onClick={() => setSelectedDeviceId(d.id)}>
                          {selectedDeviceId === d.id ? "Selected" : "Use for routes"}
                        </button>
                        <button className="ghost" onClick={() => removeDevice(d.id)}>
                          Remove
                        </button>
                      </div>
                      <div className="device-grid">
                        <label className="field">
                          <span>Instrument</span>
                          <select
                            value={d.instrumentId ?? ""}
                            onChange={(e) => {
                              const instrumentId = e.target.value || null;
                              const profile = getInstrumentProfile(instrumentId);
                              updateDevice(d.id, {
                                instrumentId,
                                channel: profile?.defaultChannel ?? d.channel,
                                name: instrumentId ? profile?.name ?? d.name : d.name
                              });
                            }}
                          >
                            <option value="">Custom</option>
                            {INSTRUMENT_PROFILES.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Input</span>
                          <select
                            value={d.inputId ?? ""}
                            onChange={(e) => updateDevice(d.id, { inputId: e.target.value || null })}
                          >
                            <option value="">None</option>
                            {ports.inputs.map((p) => (
                              <option key={`${d.id}-in-${p.id}`} value={p.id}>
                                {formatPortLabel(p.name)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Output</span>
                          <select
                            value={d.outputId ?? ""}
                            onChange={(e) => updateDevice(d.id, { outputId: e.target.value || null })}
                          >
                            <option value="">None</option>
                            {ports.outputs.map((p) => (
                              <option key={`${d.id}-out-${p.id}`} value={p.id}>
                                {formatPortLabel(p.name)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span>Default channel</span>
                          <input
                            type="number"
                            min={1}
                            max={16}
                            value={d.channel}
                            onChange={(e) => updateDevice(d.id, { channel: clampChannel(Number(e.target.value)) })}
                          />
                        </label>
                        <label className="field">
                          <span>Clock</span>
                          <div className="chip">
                            <input
                              type="checkbox"
                              checked={d.clockEnabled}
                              onChange={(e) => updateDevice(d.id, { clockEnabled: e.target.checked })}
                            />{" "}
                            Enable
                          </div>
                        </label>
                      </div>
                      {getInstrumentProfile(d.instrumentId)?.localControlNote ? (
                        <p className="muted">{getInstrumentProfile(d.instrumentId)?.localControlNote}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <button onClick={addDevice} disabled={devices.length >= MAX_DEVICES}>
                  Add device
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeView === "routes" ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Create route</h2>
              <p>Forward input to output with optional filters.</p>
            </div>
            <div className="grid two">
              <div className="card">
                <div className="card-head">
                  <h3>Channel mode</h3>
                </div>
                <label className="field">
                  <span>Force channel</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={routeChannel}
                      disabled={!forceChannelEnabled}
                      onChange={(e) => setRouteChannel(clampChannel(Number(e.target.value)))}
                      style={{ flex: 1 }}
                    />
                    <button className="ghost" onClick={() => setForceChannelEnabled((on) => !on)}>
                      {forceChannelEnabled ? "Passthrough" : "Force"}
                    </button>
                  </div>
                </label>
                <div className="field">
                  <span>Message types</span>
                  <div className="chips">
                    <label className="chip">
                      <input type="checkbox" checked={allowNotes} onChange={(e) => setAllowNotes(e.target.checked)} /> Notes
                    </label>
                    <label className="chip">
                      <input type="checkbox" checked={allowCc} onChange={(e) => setAllowCc(e.target.checked)} /> CC
                    </label>
                    <label className="chip">
                      <input
                        type="checkbox"
                        checked={allowExpression}
                        onChange={(e) => setAllowExpression(e.target.checked)}
                      />{" "}
                      Pitch/aftertouch
                    </label>
                    <label className="chip">
                      <input
                        type="checkbox"
                        checked={allowTransport}
                        onChange={(e) => setAllowTransport(e.target.checked)}
                      />{" "}
                      Start/stop
                    </label>
                    <label className="chip">
                      <input type="checkbox" checked={allowClock} onChange={(e) => setAllowClock(e.target.checked)} /> Clock
                    </label>
                  </div>
                </div>
                <label className="field">
                  <span>Clock thinning (send every Nth clock)</span>
                  <input
                    type="number"
                    min={1}
                    max={96}
                    value={clockDiv}
                    onChange={(e) => setClockDiv(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                  />
                </label>
                <label className="field">
                  <span>Route using device (optional)</span>
                  <select value={selectedDeviceId ?? ""} onChange={(e) => setSelectedDeviceId(e.target.value || null)}>
                    <option value="">None</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={addRoute} disabled={!selectedIn && !selectedOut && !selectedDeviceId}>
                  Add route
                </button>
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>Manual ports</h3>
                </div>
                <DeviceSelect
                  title="Input (monitor)"
                  ports={ports.inputs}
                  selectedId={selectedIn}
                  onSelect={setSelectedIn}
                  emptyLabel="No MIDI inputs detected"
                />
                <DeviceSelect
                  title="Output (send)"
                  ports={ports.outputs}
                  selectedId={selectedOut}
                  onSelect={setSelectedOut}
                  emptyLabel="No MIDI outputs detected"
                />
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Active routes</h2>
              <p>{routes.length === 0 ? "No routes yet" : `${routes.length} route${routes.length === 1 ? "" : "s"}`}</p>
            </div>
            <div className="log">
              {routes.length === 0 && <p className="muted">Create a route above to start routing.</p>}
              {routes.map((route) => (
                <div key={route.id} className="log-row">
                  <div>
                    <p className="label">
                      {portName(route.fromId)} → {portName(route.toId)}
                    </p>
                    <p className="muted">
                      {route.channelMode === "force" && route.forceChannel
                        ? `Force ch ${route.forceChannel}`
                        : "Channel passthrough"}
                      {" · "}
                      {describeFilter(route.filter)}
                    </p>
                  </div>
                  <button className="ghost" onClick={() => removeRoute(route.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Send a ping</h2>
              <p>Verifies the loop: app → OXI USB → synth chain.</p>
            </div>
            <div className="grid two">
              <div className="card">
                <div className="card-head">
                  <h3>Note</h3>
                  <span className="pill">ch 1</span>
                </div>
                <label className="field">
                  <span>Note (MIDI number)</span>
                  <input
                    type="number"
                    value={note}
                    min={0}
                    max={127}
                    onChange={(e) => setNote(Number(e.target.value))}
                  />
                </label>
                <button onClick={sendTestNote} disabled={!selectedOut}>
                  Send note on/off
                </button>
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>CC</h3>
                  <span className="pill">CC 1</span>
                </div>
                <label className="field">
                  <span>Value</span>
                  <input
                    type="range"
                    min={0}
                    max={127}
                    value={ccValue}
                    onChange={(e) => setCcValue(Number(e.target.value))}
                  />
                  <output>{ccValue}</output>
                </label>
                <button onClick={sendCc} disabled={!selectedOut}>
                  Send CC
                </button>
              </div>
            </div>
      </section>
    </>
  ) : null}

      {activeView === "snapshots" ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Snapshots</h2>
              <p>Capture per-device CC/program/note state and recall it with Jump/Commit strategies.</p>
            </div>
            <div className="grid two">
              <div className="card">
                <div className="card-head">
                  <h3>Banks</h3>
                  <span className="pill">{snapshots.banks.length} banks</span>
                </div>
                {snapshots.banks.length === 0 ? (
                  <p className="muted">No banks yet.</p>
                ) : (
                  <>
                    <div className="chips">
                      {snapshots.banks.map((bank) => (
                        <button
                          key={bank.id}
                          className={activeSnapshotBank?.id === bank.id ? "ghost active" : "ghost"}
                          onClick={() => setActiveSnapshotBank(bank.id)}
                        >
                          {bank.name}
                        </button>
                      ))}
                    </div>
                    {activeSnapshotBank ? (
                      <label className="field">
                        <span>Bank name</span>
                        <input
                          type="text"
                          value={activeSnapshotBank.name}
                          onChange={(e) =>
                            updateSnapshotBank(activeSnapshotBank.id, (bank) => ({ ...bank, name: e.target.value }))
                          }
                        />
                      </label>
                    ) : null}
                  </>
                )}
              </div>
              <div className="card">
                <div className="card-head">
                  <h3>Recall options</h3>
                </div>
                <label className="field">
                  <span>Strategy</span>
                  <select
                    value={snapshots.strategy}
                    onChange={(e) => updateSnapshotsState({ strategy: e.target.value as SnapshotRecallStrategy })}
                  >
                    <option value="jump">Jump (immediate)</option>
                    <option value="commit">Commit (cycle end)</option>
                  </select>
                </label>
                <label className="field">
                  <span>Fade (ms)</span>
                  <input
                    type="number"
                    min={0}
                    value={snapshots.fadeMs}
                    onChange={(e) => updateSnapshotsState({ fadeMs: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </label>
                <label className="field">
                  <span>Commit delay (ms)</span>
                  <input
                    type="number"
                    min={0}
                    value={snapshots.commitDelayMs}
                    onChange={(e) =>
                      updateSnapshotsState({ commitDelayMs: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                </label>
                <div className="grid two">
                  <label className="field">
                    <span>Burst max per window</span>
                    <input
                      type="number"
                      min={1}
                      value={snapshots.burst.maxPerInterval}
                      onChange={(e) =>
                        updateSnapshotsState({
                          burst: { ...snapshots.burst, maxPerInterval: Math.max(1, Number(e.target.value) || 1) }
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Burst window (ms)</span>
                    <input
                      type="number"
                      min={1}
                      value={snapshots.burst.intervalMs}
                      onChange={(e) =>
                        updateSnapshotsState({
                          burst: { ...snapshots.burst, intervalMs: Math.max(1, Number(e.target.value) || 1) }
                        })
                      }
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Capture notes</span>
                  <textarea
                    value={snapshots.captureNotes}
                    onChange={(e) => updateSnapshotsState({ captureNotes: e.target.value })}
                    rows={3}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Bank slots</h2>
              <p>{activeSnapshotBank ? activeSnapshotBank.name : "No active bank selected"}</p>
            </div>
            <div className="log">
              {!activeSnapshotBank ? (
                <p className="muted">Select a bank above to work with snapshot slots.</p>
              ) : (
                activeSnapshotBank.slots.map((slot) => (
                  <div key={slot.id} className="log-row">
                    <div>
                      <input
                        type="text"
                        value={slot.name}
                        onChange={(e) =>
                          updateSnapshotSlot(activeSnapshotBank.id, slot.id, (s) => ({ ...s, name: e.target.value }))
                        }
                        style={{ marginBottom: 6 }}
                      />
                      <p className="muted">
                        {slot.snapshot
                          ? `Captured ${new Date((slot.lastCapturedAt ?? slot.snapshot.capturedAt) ?? Date.now()).toLocaleString()} · Devices ${slot.snapshot.devices.length} · BPM ${slot.snapshot.bpm ?? "—"}`
                          : "Empty slot"}
                      </p>
                      <label className="field">
                        <span>Notes</span>
                        <input
                          type="text"
                          value={slot.notes}
                          onChange={(e) =>
                            updateSnapshotSlot(activeSnapshotBank.id, slot.id, (s) => ({ ...s, notes: e.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="chips">
                      <button className="ghost" onClick={() => captureSnapshotSlot(activeSnapshotBank.id, slot.id)}>
                        Capture
                      </button>
                      <button
                        className="ghost"
                        onClick={() => recallSnapshotSlot(activeSnapshotBank.id, slot.id, "jump")}
                        disabled={!slot.snapshot}
                      >
                        Jump
                      </button>
                      <button
                        className="ghost"
                        onClick={() => recallSnapshotSlot(activeSnapshotBank.id, slot.id, "commit")}
                        disabled={!slot.snapshot}
                      >
                        Commit
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}

      {activeView === "monitor" ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Monitor</h2>
            <p>
              Backend: {backends.find((b) => b.selected)?.label ?? "Unknown"} · Input: {selectedIn ?? "None"} · Output:{" "}
              {selectedOut ?? "None"}
            </p>
            <div className="chips">
              <span className="chip">Log {activity.length}/{LOG_LIMIT}</span>
              {logCapReached ? <span className="chip">Log capped</span> : null}
              <button className="ghost" onClick={clearLog}>
                Clear log
              </button>
            </div>
          </div>
          <div className="log">
            {activity.length === 0 && <p className="muted">No events yet.</p>}
            {activity.map((evt) => (
              <div key={evt._rowId} className="log-row">
                <div>
                  <p className="label">{evt.src.name ?? evt.src.id}</p>
                  <p className="muted">{evt.label}</p>
                </div>
                <span className="time">{new Date(evt.ts).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {activeView === "mapping" ? (
        <>
          <section className="panel">
            <div className="panel-head">
              <h2>Mapping</h2>
              <p>Virtual controls with up to 8 CC slots each (per-slot curve, min/max, and device target).</p>
            </div>
            {learnTarget ? (
              <div className="chips" style={{ marginBottom: 10 }}>
                <span className="chip">MIDI Learn: move a CC on the selected input (10s timeout)</span>
                <button className="ghost" onClick={cancelLearn}>
                  Cancel learn
                </button>
              </div>
            ) : learnStatus === "captured" ? (
              <p className="muted" style={{ marginBottom: 10 }}>
                Learned CC.
              </p>
            ) : learnStatus === "timeout" ? (
              <p className="muted" style={{ marginBottom: 10 }}>
                Learn timed out. Try again and move a knob/fader that sends CC.
              </p>
            ) : null}
            <div className="mapping-grid">
              <div className="card">
                <div className="card-head">
                  <h3>Controls</h3>
                </div>
                <div className="stack">
                  {controls.map((c) => (
                    <button
                      key={c.id}
                      className={c.id === selectedControlId ? "ghost active" : "ghost"}
                      onClick={() => setSelectedControlId(c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                {selectedControl ? (
                  <div className="field">
                    <span>Value</span>
                    {selectedControl.type === "button" ? (
                      <div className="chips">
                        <button
                          className="ghost"
                          onClick={() => {
                            updateControl(selectedControl.id, { value: 127 });
                            void emitControl(selectedControl, 127).then(() => {
                              setTimeout(() => {
                                updateControl(selectedControl.id, { value: 0 });
                                void emitControl(selectedControl, 0);
                              }, 80);
                            });
                          }}
                        >
                          Trigger (momentary)
                        </button>
                        <button
                          className="ghost"
                          onClick={() => {
                            const next = selectedControl.value > 0 ? 0 : 127;
                            updateControl(selectedControl.id, { value: next });
                            void emitControl(selectedControl, next);
                          }}
                        >
                          Toggle
                        </button>
                        <span className="chip">Value {selectedControl.value}</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={127}
                          value={selectedControl.value}
                          onChange={(e) => {
                            const next = clampMidi(Number(e.target.value));
                            updateControl(selectedControl.id, { value: next });
                            void emitControl(selectedControl, next);
                          }}
                        />
                        <output>{selectedControl.value}</output>
                      </>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="card">
                <div className="card-head">
                  <h3>Slot editor</h3>
                  <span className="pill">8 slots</span>
                </div>
                {!selectedControl ? (
                  <p className="muted">Select a control.</p>
                ) : (
                  <div className="stack">
                    {selectedControl.slots.map((slot, idx) => (
                      <div key={`${selectedControl.id}-slot-${idx}`} className="slot-row">
                        <div className="slot-head">
                          <span className="pill">Slot {idx + 1}</span>
                          <label className="chip">
                            <input
                              type="checkbox"
                              checked={slot.enabled}
                              onChange={(e) => updateSlot(selectedControl.id, idx, { enabled: e.target.checked })}
                            />{" "}
                            Enabled
                          </label>
                          <select
                            value={slot.kind}
                            onChange={(e) => {
                              const kind = e.target.value as MappingSlot["kind"];
                              if (kind === "empty") {
                                updateSlot(selectedControl.id, idx, { kind: "empty", enabled: false });
                              } else if (kind === "cc") {
                                updateSlot(selectedControl.id, idx, {
                                  kind: "cc",
                                  enabled: true,
                                  cc: 74,
                                  min: 0,
                                  max: 127,
                                  curve: "linear",
                                  targetDeviceId: devices[0]?.id ?? null
                                });
                              } else if (kind === "pc") {
                                updateSlot(selectedControl.id, idx, {
                                  kind: "pc",
                                  enabled: true,
                                  min: 0,
                                  max: 127,
                                  curve: "linear",
                                  targetDeviceId: devices[0]?.id ?? null
                                });
                              } else if (kind === "note") {
                                updateSlot(selectedControl.id, idx, {
                                  kind: "note",
                                  enabled: true,
                                  note: 60,
                                  vel: 110,
                                  targetDeviceId: devices[0]?.id ?? null
                                });
                              }
                            }}
                          >
                            <option value="empty">Empty</option>
                            <option value="cc">CC</option>
                            <option value="pc">Program change</option>
                            <option value="note">Note</option>
                          </select>
                          <button
                            className="ghost"
                            onClick={() => {
                              if (slot.kind !== "cc") {
                                updateSlot(selectedControl.id, idx, {
                                  kind: "cc",
                                  enabled: true,
                                  cc: 74,
                                  min: 0,
                                  max: 127,
                                  curve: "linear",
                                  targetDeviceId: devices[0]?.id ?? null
                                });
                              }
                              startLearn(selectedControl.id, idx);
                            }}
                            disabled={!!learnTarget}
                          >
                            Learn
                          </button>
                        </div>

                        {slot.kind === "empty" ? (
                          <p className="muted">No mapping.</p>
                        ) : (
                          <div className="slot-grid">
                            <label className="field">
                              <span>Target device</span>
                              <select
                                value={slot.targetDeviceId ?? ""}
                                onChange={(e) =>
                                  updateSlot(selectedControl.id, idx, { targetDeviceId: e.target.value || null })
                                }
                              >
                                <option value="">None</option>
                                {devices.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="field">
                              <span>Channel (optional)</span>
                              <input
                                type="number"
                                min={1}
                                max={16}
                                value={slot.channel ?? ""}
                                placeholder="device"
                                onChange={(e) =>
                                  updateSlot(selectedControl.id, idx, {
                                    channel: e.target.value === "" ? undefined : clampChannel(Number(e.target.value))
                                  })
                                }
                              />
                            </label>

                            {slot.kind === "cc" ? (
                              <label className="field">
                                <span>CC</span>
                                <select
                                  value={String(slot.cc)}
                                  onChange={(e) => updateSlot(selectedControl.id, idx, { cc: Number(e.target.value) })}
                                >
                                  {(() => {
                                    const dev = devices.find((d) => d.id === slot.targetDeviceId);
                                    const profile = getInstrumentProfile(dev?.instrumentId);
                                    if (!profile) {
                                      return (
                                        <>
                                          <option value="74">CC 74 (filter cutoff)</option>
                                          <option value="1">CC 1 (mod)</option>
                                          <option value="7">CC 7 (volume)</option>
                                        </>
                                      );
                                    }
                                    return profile.cc.map((c) => (
                                      <option key={`${profile.id}-${c.cc}`} value={c.cc}>
                                        CC {c.cc} · {c.label}
                                      </option>
                                    ));
                                  })()}
                                </select>
                              </label>
                            ) : null}

                            {slot.kind === "note" ? (
                              <>
                                <label className="field">
                                  <span>Note</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={127}
                                    value={slot.note}
                                    onChange={(e) =>
                                      updateSlot(selectedControl.id, idx, { note: clampMidi(Number(e.target.value)) })
                                    }
                                  />
                                </label>
                                <label className="field">
                                  <span>Velocity</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={127}
                                    value={slot.vel}
                                    onChange={(e) =>
                                      updateSlot(selectedControl.id, idx, { vel: clampMidi(Number(e.target.value)) })
                                    }
                                  />
                                </label>
                              </>
                            ) : (
                              <>
                                <label className="field">
                                  <span>Curve</span>
                                  <select
                                    value={slot.curve}
                                    onChange={(e) =>
                                      updateSlot(selectedControl.id, idx, { curve: e.target.value as Curve })
                                    }
                                  >
                                    <option value="linear">Linear</option>
                                    <option value="expo">Expo</option>
                                    <option value="log">Log</option>
                                  </select>
                                </label>

                                <label className="field">
                                  <span>{slot.kind === "pc" ? "Program min" : "Min"}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={127}
                                    value={slot.min}
                                    onChange={(e) =>
                                      updateSlot(selectedControl.id, idx, { min: clampMidi(Number(e.target.value)) })
                                    }
                                  />
                                </label>
                                <label className="field">
                                  <span>{slot.kind === "pc" ? "Program max" : "Max"}</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={127}
                                    value={slot.max}
                                    onChange={(e) =>
                                      updateSlot(selectedControl.id, idx, { max: clampMidi(Number(e.target.value)) })
                                    }
                                  />
                                </label>
                              </>
                            )}

                            {slot.kind === "pc" ? <p className="muted">Sends program change based on the control value.</p> : null}
                            {slot.kind === "note" ? <p className="muted">Sends note on when value &gt; 0, note off when value = 0.</p> : null}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}

      {activeView === "help" ? (
        <section className="panel">
          <div className="panel-head">
            <h2>How to use this</h2>
            <p>Quickstart for OXI-only now; synth rig later.</p>
          </div>
          <div className="grid two">
            <div className="card">
              <div className="card-head">
                <h3>OXI-only quickstart</h3>
              </div>
              <ol className="help-list">
                <li>Go to Setup and select your OXI output (Output (send)).</li>
                <li>Optionally select your OXI input (Input (monitor)) to see notes/CC coming from the OXI.</li>
                <li>Run Diagnostics to send a short test note (no synth required).</li>
                <li>Open Monitor to see OUT events from the app and any IN events from OXI.</li>
                <li>Try Mapping: click Learn on a slot and move a knob/fader that sends CC (or pick a CC preset), then move the control.</li>
              </ol>
              <p className="muted">
                Tip: the Monitor now shows OUT events for actions Midimuncher sends, even if nothing is connected to OXI
                DIN/TRS.
              </p>
            </div>
            <div className="card">
              <div className="card-head">
                <h3>When you add synths</h3>
              </div>
              <ol className="help-list">
                <li>Add devices (up to 8) and pick the instrument to get CC presets and default channels.</li>
                <li>Bind each device output to the correct OXI port (A/B/C if Split is enabled).</li>
                <li>Use Routing to forward MIDI from an input stream to a device output if needed.</li>
                <li>Use Mapping to build “macros” (one control → many CCs across devices).</li>
              </ol>
              <p className="muted">Docs: see `docs/roadmap.md`, `docs/instruments.md`, and `docs/oxi-integration.md`.</p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

type DeviceSelectProps = {
  title: string;
  ports: MidiPortInfo[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyLabel: string;
};

function DeviceSelect({ title, ports, selectedId, onSelect, emptyLabel }: DeviceSelectProps) {
  const sorted = [...ports].sort(sortPortsWithOxiFirst);
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      {ports.length === 0 ? (
        <p className="muted">{emptyLabel}</p>
      ) : (
        <select value={selectedId ?? ""} onChange={(e) => onSelect(e.target.value)}>
          {sorted.map((port) => (
            <option key={port.id} value={port.id}>
              {formatPortLabel(port.name)}
            </option>
          ))}
        </select>
      )}
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
  return `${prefix} — ${name}`;
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

function describeFilter(filter?: RouteFilter): string {
  if (!filter) return "all messages";
  const parts: string[] = [];
  if (filter.allowTypes && filter.allowTypes.length > 0) {
    parts.push(`types: ${filter.allowTypes.join(",")}`);
  }
  if (filter.clockDiv && filter.clockDiv > 1) {
    parts.push(`clock ÷${filter.clockDiv}`);
  }
  return parts.length ? parts.join(" · ") : "all messages";
}

function makeRouteId() {
  return `route-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
