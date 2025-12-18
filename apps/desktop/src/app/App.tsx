import { useEffect, useMemo, useState } from "react";
import { applyCurve01, defaultSlots, getInstrumentProfile, INSTRUMENT_PROFILES } from "@midi-playground/core";
import type { MidiEvent, MidiMsg } from "@midi-playground/core";
import type { MidiBackendInfo, MidiPortInfo, MidiPorts, RouteConfig, RouteFilter } from "../../shared/ipcTypes";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;

type Device = {
  id: string;
  name: string;
  instrumentId: string | null;
  inputId: string | null;
  outputId: string | null;
  channel: number;
  clockEnabled: boolean;
};

type Curve = "linear" | "expo" | "log";
type Slot =
  | {
      enabled: boolean;
      kind: "cc";
      cc: number;
      min: number;
      max: number;
      curve: Curve;
      targetDeviceId: string | null;
      channel?: number;
    }
  | { enabled: boolean; kind: "empty" };

type Control = {
  id: string;
  type: "knob" | "fader" | "button";
  label: string;
  value: number;
  slots: Slot[];
};

export function App() {
  const midiApi = typeof window !== "undefined" ? window.midi : undefined;
  const [ports, setPorts] = useState<MidiPorts>({ inputs: [], outputs: [] });
  const [backends, setBackends] = useState<MidiBackendInfo[]>([]);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
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
  const [activeView, setActiveView] = useState<"setup" | "routes" | "mapping" | "monitor">("setup");
  const [controls, setControls] = useState<Control[]>(() => [
    { id: "knob-1", type: "knob", label: "Knob 1", value: 0, slots: defaultSlots() as Slot[] },
    { id: "knob-2", type: "knob", label: "Knob 2", value: 0, slots: defaultSlots() as Slot[] },
    { id: "fader-1", type: "fader", label: "Fader 1", value: 0, slots: defaultSlots() as Slot[] },
    { id: "button-1", type: "button", label: "Button 1", value: 0, slots: defaultSlots() as Slot[] }
  ]);
  const [selectedControlId, setSelectedControlId] = useState<string>("knob-1");

  useEffect(() => {
    if (!midiApi) return;
    refreshPorts();
    refreshBackends();
    const unsubscribe = midiApi.onEvent((evt) => {
      setLog((current) => [evt, ...current].slice(0, LOG_LIMIT));
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midiApi]);

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

  async function refreshPorts() {
    if (!midiApi) return;
    setLoadingPorts(true);
    try {
      const available = await midiApi.listPorts();
      setPorts(available);
      if (!selectedIn && available.inputs[0]) {
        setSelectedIn(available.inputs[0].id);
      }
      if (!selectedOut && available.outputs[0]) {
        setSelectedOut(available.outputs[0].id);
      }
    } finally {
      setLoadingPorts(false);
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

  function updateDevice(id: string, partial: Partial<Device>) {
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
    return found?.name ?? id;
  }

  function clearLog() {
    setLog([]);
  }

  const selectedControl = controls.find((c) => c.id === selectedControlId) ?? controls[0];

  function updateControl(id: string, partial: Partial<Control>) {
    setControls((current) => current.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  }

  function updateSlot(controlId: string, slotIndex: number, partial: Partial<Extract<Slot, { kind: "cc" }> | Slot>) {
    setControls((current) =>
      current.map((c) => {
        if (c.id !== controlId) return c;
        const slots = [...c.slots];
        const existing = slots[slotIndex];
        if (!existing) return c;
        slots[slotIndex] = { ...(existing as any), ...(partial as any) } as Slot;
        return { ...c, slots };
      })
    );
  }

  async function emitControl(control: Control, rawValue: number) {
    if (!midiApi) return;
    const value01 = rawValue / 127;
    for (const slot of control.slots) {
      if (!slot.enabled || slot.kind !== "cc") continue;
      if (!slot.targetDeviceId) continue;
      const target = devices.find((d) => d.id === slot.targetDeviceId);
      if (!target?.outputId) continue;
      const channel = clampChannel(slot.channel ?? target.channel);
      const shaped01 = applyCurve01(value01, slot.curve);
      const min = clampMidi(slot.min);
      const max = clampMidi(slot.max);
      const mapped = Math.round(min + shaped01 * (max - min));
      await midiApi.send({
        portId: target.outputId,
        msg: { t: "cc", ch: channel, cc: clampMidi(slot.cc), val: clampMidi(mapped) }
      });
    }
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
          <button className="ghost" onClick={refreshPorts} disabled={loadingPorts}>
            {loadingPorts ? "Scanning..." : "Refresh devices"}
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
            <button className={activeView === "monitor" ? "ghost active" : "ghost"} onClick={() => setActiveView("monitor")}>
              Monitor
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
                                {p.name}
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
                                {p.name}
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
                              const kind = e.target.value as "empty" | "cc";
                              if (kind === "empty") {
                                updateSlot(selectedControl.id, idx, { kind: "empty", enabled: false });
                              } else {
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
                            }}
                          >
                            <option value="empty">Empty</option>
                            <option value="cc">CC</option>
                          </select>
                        </div>

                        {slot.kind === "cc" ? (
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

                            <label className="field">
                              <span>Curve</span>
                              <select
                                value={slot.curve}
                                onChange={(e) => updateSlot(selectedControl.id, idx, { curve: e.target.value as Curve })}
                              >
                                <option value="linear">Linear</option>
                                <option value="expo">Expo</option>
                                <option value="log">Log</option>
                              </select>
                            </label>

                            <label className="field">
                              <span>Min</span>
                              <input
                                type="number"
                                min={0}
                                max={127}
                                value={slot.min}
                                onChange={(e) => updateSlot(selectedControl.id, idx, { min: clampMidi(Number(e.target.value)) })}
                              />
                            </label>
                            <label className="field">
                              <span>Max</span>
                              <input
                                type="number"
                                min={0}
                                max={127}
                                value={slot.max}
                                onChange={(e) => updateSlot(selectedControl.id, idx, { max: clampMidi(Number(e.target.value)) })}
                              />
                            </label>
                          </div>
                        ) : (
                          <p className="muted">No mapping.</p>
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
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      {ports.length === 0 ? (
        <p className="muted">{emptyLabel}</p>
      ) : (
        <select value={selectedId ?? ""} onChange={(e) => onSelect(e.target.value)}>
          {ports.map((port) => (
            <option key={port.id} value={port.id}>
              {port.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function describeMsg(msg: MidiMsg): string {
  switch (msg.t) {
    case "noteOn":
      return `Note on ch${msg.ch} n${msg.note} v${msg.vel}`;
    case "noteOff":
      return `Note off ch${msg.ch} n${msg.note} v${msg.vel ?? 0}`;
    case "cc":
      return `CC ch${msg.ch} #${msg.cc} -> ${msg.val}`;
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
