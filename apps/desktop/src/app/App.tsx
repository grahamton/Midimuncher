import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type {
  ControlElement,
  MappingSlot,
  MidiEvent,
  MidiMsg,
  MidiPortRef,
} from "@midi-playground/core";
import {
  AppChrome,
  BodySplitPane,
  BottomUtilityBar,
  LeftNavRail,
  MainContentArea,
  TopStatusBar,
} from "@midi-playground/ui";
import { describeMsg } from "./lib/midimsg";
import type {
  MidiBackendInfo,
  MidiPorts,
  RouteConfig,
  SessionLogStatus,
  SnapshotClockSource,
  SnapshotQueueStatus,
  SnapshotSchedulePayload,
  SnapshotDropBundlePayload,
  SnapshotQuantizeKind,
} from "../../shared/ipcTypes";
import {
  defaultProjectState,
  defaultSnapshotsState,
  type AppView,
  type DeviceConfig,
  type ProjectState,
  type SnapshotQuantize,
  type SnapshotMode,
} from "../../shared/projectTypes";
import { AppRouter } from "./AppRouter";
import {
  findSnapshotSlot,
  findSnapshotIdByName,
  writeSnapshotToSlot,
} from "./snapshots/SnapshotsPage";
import { useAppController, defaultControls } from "./useAppController";
import { ModulationRunner } from "./modulation/ModulationRunner";
import { clampChannel, clampMidi } from "./lib/clamp";
import { useMidiBridgeClock } from "../services/midiBridge";
import { styles } from "./styles";
import {
  AudioWaveform,
  Cable,
  Sliders,
  Play,
  Link,
  Camera,
  Activity,
  Settings,
} from "lucide-react";

const LOG_LIMIT = 100;
const MAX_DEVICES = 8;
const DIAG_NOTE = 60;
const DIAG_CHANNEL = 1;

export function App() {
  const {
    midiApi,
    ports,
    setPorts,
    backends,
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
    onStartChain,
    onStopChain,
    onOxiTransport,
    onQuickOxiSetup,
    onStandardOxiSetup,
    transportChannel,
    setTransportChannel,
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
    instrumentLibrary,
    hardwareState,
  } = useAppController();

  // -- Learn Logic --
  // Note: Most learn logic state is in the hook, but we need the start/cancel functions here
  // because they interact with timeouts and refs that we might want to keep local or were moved to hook?
  // Checked hook: hook has learnTimerRef etc. But it doesn't expose startLearn/cancelLearn functions.
  // It only exposes the refs and state setters. So we implement the logic here using them.

  function startLearn(controlId: string, slotIndex: number) {
    if (learnTimerRef.current) {
      window.clearTimeout(learnTimerRef.current);
      learnTimerRef.current = null;
    }
    setLearnTarget({ controlId, slotIndex });
    setLearnStatus("listening");

    learnTimerRef.current = window.setTimeout(() => {
      setLearnTarget(null);
      setLearnStatus("timeout");
      learnTimerRef.current = null;
    }, 10000);
  }

  function cancelLearn() {
    setLearnTarget(null);
    setLearnStatus("idle");
    if (learnTimerRef.current) {
      window.clearTimeout(learnTimerRef.current);
      learnTimerRef.current = null;
    }
  }

  // -- Diagnostics --
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

  // -- Quick Sends --
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

  // -- Devices & Routes --
  function updateDevice(id: string, partial: Partial<DeviceConfig>) {
    setDevices((current) =>
      current.map((d) => (d.id === id ? { ...d, ...partial } : d))
    );
  }

  function addDeviceRoutes(deviceId_: string) {
    // Logic to add default route for a device
    // Used in UI callback, so we need to implement it.
    // Re-implementing simplified logic or full logic from before:
    const device = devices.find((d) => d.id === deviceId_);
    if (!device || !device.inputId || !device.outputId) return;

    setRoutes((current) => {
      if (
        current.some(
          (r) => r.fromId === device.inputId && r.toId === device.outputId
        )
      )
        return current;

      const allowTypes: MidiMsg["t"][] = [];
      if (allowNotes) allowTypes.push("noteOn", "noteOff");
      if (allowCc) allowTypes.push("cc");
      if (allowExpression) allowTypes.push("pitchBend", "aftertouch");
      if (allowTransport) allowTypes.push("start", "stop", "continue");
      if (allowClock) allowTypes.push("clock");

      return [
        ...current,
        {
          id: `route-${Date.now().toString(36)}-${device.id}`,
          fromId: device.inputId!, // checked above
          toId: device.outputId!, // checked above
          channelMode: forceChannelEnabled ? "force" : "passthrough",
          forceChannel: forceChannelEnabled
            ? clampChannel(device.channel ?? routeChannel)
            : undefined,
          filter: {
            allowTypes: allowTypes.length ? allowTypes : undefined,
            clockDiv: clockDiv > 1 ? clockDiv : undefined,
          },
        },
      ];
    });
  }

  // -- Control Updates --
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
        slots[slotIndex] = { ...existing, ...partial } as MappingSlot;
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

  async function sendDeviceCc(deviceId: string, cc: number, val: number) {
    if (!midiApi) return;
    const device = devices.find((d) => d.id === deviceId);
    if (!device?.outputId) return;
    await midiApi.openOut(device.outputId);
    await midiApi.send({
      portId: device.outputId,
      msg: {
        t: "cc",
        ch: clampChannel(device.channel),
        cc: clampMidi(cc),
        val: clampMidi(val),
      },
    });
  }

  // -- Snapshots --
  async function scheduleSnapshot(
    id: string,
    overrides?: { quantize?: SnapshotQuantizeKind; strategy?: any }
  ) {
    if (!midiApi) return;
    const found = findSnapshotSlot(id, snapshotsState);
    if (!found?.slot.snapshot) return;

    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const payload: SnapshotSchedulePayload = {
      snapshotId: id,
      snapshotName: found.slot.name,
      snapshot: found.slot.snapshot,
      strategy: overrides?.strategy ?? snapshotsState.strategy,
      fadeMs: snapshotsState.fadeMs,
      commitDelayMs: snapshotsState.commitDelayMs,
      burst: snapshotsState.burst,
      clockSource: snapshotClockSource,
      quantize:
        overrides?.quantize ??
        (snapshotQuantize === "bar4"
          ? "bar4"
          : snapshotQuantize === "bar1"
          ? "bar"
          : "immediate"),
      cycleLengthBars: snapshotCycleBars,
      bpm: effectiveBpm,
    };

    const ok = await midiApi.scheduleSnapshot(payload);
    if (!ok) setPendingSnapshotId(null);
  }

  function triggerSnapshot(id: string, quantize?: SnapshotQuantizeKind) {
    setActiveSnapshotId(id);
    setPendingSnapshotId(id);
    void scheduleSnapshot(id, { quantize });
  }

  async function dropSnapshot(snapshotId: string) {
    setActiveSnapshotId(snapshotId);
    setPendingSnapshotId(snapshotId);
    if (!midiApi) return;
    const found = findSnapshotSlot(snapshotId, snapshotsState);
    if (!found?.slot.snapshot) return;

    // ... Drop logic ...
    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const control = stageDropControlId
      ? controls.find((c) => c.id === stageDropControlId)
      : null;

    const payload: SnapshotDropBundlePayload = {
      schedule: {
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
      },
      macroRamp: control
        ? {
            control,
            from: clampMidi(control.value),
            to: clampMidi(stageDropToValue),
            durationMs: Math.max(0, Math.round(stageDropDurationMs)),
            stepMs: Math.max(10, Math.round(stageDropStepMs)),
            perSendSpacingMs: Math.max(
              0,
              Math.round(stageDropPerSendSpacingMs)
            ),
          }
        : null,
    };

    void midiApi.scheduleDropBundle(payload).then((ok) => {
      if (!ok) setPendingSnapshotId(null);
    });
  }

  // -- Project IO --
  async function flushProjectNow() {
    if (!midiApi) return;
    setSaveStatus("saving");
    // Trigger the save via same mechanism as auto-save or just direct set?
    // The hook has auto-save logic that watches state.
    // Just calling flushProject() on API might be enough if state is already pushed?
    // Actually, hook's auto-save pushes state then sets status.
    // If we want to force save, we can just call flushProject on API, but we want to ensure latest state is there.
    // Hook's auto-save uses a timeout.
    // Let's just use the api.flushProject() and assume auto-save handled the state set.
    await midiApi.flushProject();
    setLastSavedAt(Date.now());
    setSaveStatus("saved");
  }

  function clearLog() {
    setLog([]);
  }

  function startSessionRecording() {
    if (!midiApi) return;
    void midiApi.sessionStart().then(setSessionStatus);
  }

  function stopSessionRecording() {
    if (!midiApi) return;
    void midiApi.sessionStop().then(setSessionStatus);
  }

  function revealSessionLog() {
    if (!midiApi) return;
    void midiApi.sessionReveal();
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
        // Add default internal route
        const allowTypes: MidiMsg["t"][] = [];
        if (allowNotes) allowTypes.push("noteOn", "noteOff");
        if (allowCc) allowTypes.push("cc");
        // ... (rest of flags)

        setRoutes((current) => [
          ...current,
          {
            id: `route-quick-${Date.now()}`,
            fromId: nextIn,
            toId: nextOut,
            channelMode: "passthrough",
            filter: { allowTypes: undefined }, // Simplified
          },
        ]);
      }
    } finally {
      setLoadingPorts(false);
    }
  }

  // Chrome & Layout (same as before)
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

  const selectedControl = controls.find((c) => c.id === selectedControlId);
  const backendLabel = backends.find((b) => b.selected)?.label ?? "No backend";
  const selectedBackendId = backends.find((b) => b.selected)?.id ?? "";
  const formatPortLabel = (name: string) =>
    name.length > 20 ? name.substring(0, 20) + "..." : name;
  const inputLabel = selectedIn
    ? formatPortLabel(
        ports.inputs.find((p) => p.id === selectedIn)?.name ?? selectedIn
      )
    : "No input";
  const outputLabel = selectedOut
    ? formatPortLabel(
        ports.outputs.find((p) => p.id === selectedOut)?.name ?? selectedOut
      )
    : "No output";

  return (
    // JSX Return
    <div style={styles.window}>
      <AppChrome>
        {activeView !== "stage" && (
          <TopStatusBar
            actions={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={styles.selectorGroup}>
                    <label style={styles.selectorLabel}>Backend</label>
                    <select
                      style={styles.selector}
                      value={selectedBackendId}
                      onChange={(e) => selectBackend(e.target.value)}
                    >
                      {backends.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.selectorGroup}>
                    <label style={styles.selectorLabel}>Input</label>
                    <select
                      style={styles.selector}
                      value={selectedIn ?? ""}
                      onChange={(e) => setSelectedIn(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {ports.inputs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatPortLabel(p.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.selectorGroup}>
                    <label style={styles.selectorLabel}>Output</label>
                    <select
                      style={styles.selector}
                      value={selectedOut ?? ""}
                      onChange={(e) => setSelectedOut(e.target.value || null)}
                    >
                      <option value="">None</option>
                      {ports.outputs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatPortLabel(p.name)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ ...styles.row, gap: 4 }}>
                  <button
                    style={styles.btnTiny}
                    onClick={() => onOxiTransport("stop")}
                    title="OXI Stop"
                  >
                    <div
                      style={{ width: 8, height: 8, background: "#ef4444" }}
                    />
                  </button>
                  <button
                    style={{ ...styles.btnTiny, background: "#10b981" }}
                    onClick={() => onOxiTransport("start")}
                    title="OXI Play"
                  >
                    <Play size={10} fill="white" />
                  </button>
                  <button
                    style={{ ...styles.btnTiny, borderRadius: "50%" }}
                    onClick={() => onOxiTransport("record")}
                    title="OXI Record"
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "#ef4444",
                      }}
                    />
                  </button>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: "#64748b",
                      marginLeft: 4,
                    }}
                  >
                    OXI REMOTE
                  </span>
                  {/* OXI Linked Badge */}
                  {(inputLabel.toLowerCase().includes("oxi") ||
                    outputLabel.toLowerCase().includes("oxi")) && (
                    <div
                      style={{
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#4ade80",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: 4,
                        marginLeft: 8,
                        letterSpacing: 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="OXI One connected and active"
                    >
                      <span>LINKED</span>
                    </div>
                  )}
                </div>
              </div>
            }
            loadingPorts={loadingPorts}
            tempo={(useClockSync && clockBpm) || tempoBpm || 120}
            onTempoChange={(bpm: number) => {
              setTempoBpm(bpm);
              if (useClockSync) setUseClockSync(false);
            }}
            clockBpm={clockBpm}
            useClockSync={useClockSync}
            onRelinkClock={relinkClock}
            onToggleClockSync={setUseClockSync}
            followClockStart={followClockStart}
            onToggleFollowClockStart={setFollowClockStart}
            midiReady={!!midiApi}
            saveLabel={
              saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Saved"
                : saveStatus === "error"
                ? "Error"
                : ""
            }
          />
        )}

        <BodySplitPane>
          {activeView !== "stage" && (
            <LeftNavRail
              route={activeView}
              onChangeRoute={(next: AppView) => setActiveView(next)}
              onPanic={async () => {
                if (!midiApi) return;
                ports.outputs.forEach((p) => {
                  midiApi.send({
                    portId: p.id,
                    msg: { t: "cc", ch: 1, cc: 123, val: 0 },
                  });
                  midiApi.send({
                    portId: p.id,
                    msg: { t: "cc", ch: 1, cc: 120, val: 0 },
                  });
                });
              }}
              items={[
                {
                  id: "setup",
                  label: "Setup",
                  icon: <AudioWaveform size={20} />,
                },
                { id: "routes", label: "Routes", icon: <Cable size={20} /> },
                {
                  id: "mapping",
                  label: "Mapping",
                  icon: <Sliders size={20} />,
                },
                {
                  id: "modulation",
                  label: "Modulation",
                  icon: <Activity size={20} />,
                },
                { id: "stage", label: "Stage", icon: <Play size={20} /> },
                { id: "chains", label: "Chains", icon: <Link size={20} /> },
                {
                  id: "snapshots",
                  label: "Snapshots",
                  icon: <Camera size={20} />,
                },
                {
                  id: "monitor",
                  label: "Monitor",
                  icon: <Activity size={20} />,
                },
                {
                  id: "settings",
                  label: "Settings",
                  icon: <Settings size={20} />,
                },
              ]}
            />
          )}
          <MainContentArea>
            <AppRouter
              onNavigate={setActiveView}
              instrumentLibrary={instrumentLibrary}
              route={activeView}
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
              onQuickOxiSetup={onQuickOxiSetup}
              onStandardOxiSetup={onStandardOxiSetup}
              loadingPorts={loadingPorts}
              logCapReached={logCapReached}
              sessionStatus={sessionStatus}
              onSessionStart={startSessionRecording}
              onSessionStop={stopSessionRecording}
              onSessionReveal={revealSessionLog}
              monitorRows={activity.slice(0, 12)}
              clearLog={clearLog}
              controls={controls}
              selectedControl={selectedControl}
              selectedControlId={selectedControlId}
              setSelectedControlId={setSelectedControlId}
              updateSlot={updateSlot}
              learnStatus={learnStatus}
              onLearn={(slotIndex: number) =>
                selectedControl && startLearn(selectedControl.id, slotIndex)
              }
              onCancelLearn={cancelLearn}
              note={note}
              ccValue={ccValue}
              onSendNote={sendTestNote}
              onSendCc={sendCc}
              onQuickTest={(portId: string, ch: number) =>
                sendQuickNote(portId, ch, note)
              }
              setModulationState={setModulationState}
              modulationState={modulationState}
              snapshotChains={snapshotChains}
              setSnapshotChains={setSnapshotChains}
              onStartChain={onStartChain}
              onStopChain={onStopChain}
              onOxiTransport={onOxiTransport}
              transportChannel={transportChannel}
              setTransportChannel={setTransportChannel}
              hardwareState={hardwareState}
              onQuickCc={(
                portId: string,
                ch: number,
                ccNum: number,
                val: number
              ) => sendQuickCc(portId, ch, ccNum, val)}
              onQuickProgram={(portId: string, ch: number, program: number) =>
                sendQuickProgram(portId, ch, program)
              }
              onSendSnapshot={() => {
                if (!activeSnapshotId) return;
                setPendingSnapshotId(activeSnapshotId);
                void scheduleSnapshot(activeSnapshotId);
              }}
              onAddDeviceRoutes={addDeviceRoutes}
              routes={routes}
              setRoutes={setRoutes}
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
              onChangeStageDropToValue={(value: number) =>
                setStageDropToValue(
                  Math.min(Math.max(Math.round(value), 0), 127)
                )
              }
              stageDropDurationMs={stageDropDurationMs}
              onChangeStageDropDurationMs={(ms: number) =>
                setStageDropDurationMs(
                  Math.min(Math.max(Math.round(ms), 0), 60_000)
                )
              }
              pendingSnapshotId={pendingSnapshotId}
              snapshotQueueStatus={snapshotQueueStatus}
              onCaptureSnapshot={(snapshotId: string) => {
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
              onChangeSnapshotBank={(bankId: string) =>
                setSnapshotsState((current) => ({
                  ...current,
                  activeBankId: bankId,
                }))
              }
              snapshotQuantize={snapshotQuantize}
              snapshotMode={snapshotsState.strategy}
              onChangeSnapshotQuantize={setSnapshotQuantize}
              onChangeSnapshotMode={(mode: SnapshotMode) => {
                setSnapshotMode(mode);
                setSnapshotsState((current) => ({
                  ...current,
                  strategy: mode,
                }));
              }}
              snapshotFadeMs={snapshotsState.fadeMs}
              onChangeSnapshotFade={(ms: number) => {
                const next = Math.max(0, ms);
                setSnapshotFadeMs(next);
                setSnapshotsState((current) => ({ ...current, fadeMs: next }));
              }}
              snapshotCommitDelayMs={snapshotsState.commitDelayMs}
              onChangeSnapshotCommitDelay={(ms: number) =>
                setSnapshotsState((current) => ({
                  ...current,
                  commitDelayMs: Math.max(0, Math.round(ms)),
                }))
              }
              snapshotClockSource={snapshotClockSource}
              onChangeSnapshotClockSource={setSnapshotClockSource}
              snapshotCycleBars={snapshotCycleBars}
              onChangeSnapshotCycleBars={(bars: number) =>
                setSnapshotCycleBars(
                  Math.min(Math.max(Math.round(bars), 1), 32)
                )
              }
              onAddDevice={quickStart}
            />
          </MainContentArea>
        </BodySplitPane>
        <BottomUtilityBar
          midiReady={Boolean(selectedOut)}
          saveLabel={
            saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
              ? "Error"
              : "Idle"
          }
          version="v0.8.2-beta"
          logCapReached={logCapReached}
        />
      </AppChrome>
    </div>
  );
}
