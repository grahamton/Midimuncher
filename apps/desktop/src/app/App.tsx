import { useEffect, useMemo, useState } from "react";
import type { MidiEvent, MidiMsg } from "@midi-playground/core";
import type { MidiBackendInfo, MidiPortInfo, MidiPorts, RouteConfig, RouteFilter } from "../../shared/ipcTypes";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;

type Device = {
  id: string;
  name: string;
  inputId: string | null;
  outputId: string | null;
  channel: number;
  clockEnabled: boolean;
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
          <h1>OXI loop test</h1>
          <p className="lede">Select OXI ports, watch incoming MIDI, and fire a test note/CC.</p>
        </div>
        <button className="ghost" onClick={refreshPorts} disabled={loadingPorts}>
          {loadingPorts ? "Scanning..." : "Refresh devices"}
        </button>
      </header>

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
            <div className="stack">
              {devices.map((d, idx) => (
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
                </div>
              ))}
            </div>
            <button onClick={addDevice} disabled={devices.length >= MAX_DEVICES}>
              Add device
            </button>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Create route</h3>
              <span className="pill">Patchbay</span>
            </div>
            <p className="muted">Forward input to output with optional filters.</p>
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

      <section className="panel">
        <div className="panel-head">
          <h2>Activity</h2>
          <p>Live MIDI from the selected input.</p>
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
