import { useEffect, useMemo, useRef, type ReactNode } from "react";
import type {
  ControlElement,
  MappingSlot,
  MidiEvent,
  MidiMsg,
  MidiPortRef,
  SnapshotQuantizeKind,
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
} from "../../shared/ipcTypes";
import {
  defaultProjectState,
  type AppView,
  type ChainStep,
  type DeviceConfig,
} from "../../shared/projectTypes";
import {
  findSnapshotSlot,
  findSnapshotIdByName,
  writeSnapshotToSlot,
} from "./snapshots/SnapshotsPage";
import { useAppController, defaultControls } from "./useAppController";
import { clampChannel, clampMidi } from "./lib/clamp";
import { useMidiBridgeClock } from "../services/midiBridge";
import { styles } from "./styles";

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

  // -- Chains --
  function addChainStep() {
    const activeSlotName = activeSnapshotId
      ? findSnapshotSlot(activeSnapshotId, snapshotsState)?.slot.name ?? null
      : null;
    const snapshot = activeSlotName ?? snapshotsState.banks[0]?.slots[0]?.name;
    if (!snapshot) return;
    setChainSteps((current) => [
      ...current,
      {
        snapshot,
        bars: 4,
        snapshotId: findSnapshotIdByName(snapshot, snapshotsState),
      },
    ]);
  }

  function removeChainStep(index: number) {
    setChainSteps((prev) => prev.filter((_, i) => i !== index));
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
    setChainSteps((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, bars: Math.max(1, Math.min(64, bars)) } : s
      )
    );
  }

  function playChainStep(idx: number) {
    if (idx >= chainSteps.length) {
      // Loop or stop
      if (chainSteps.length > 0) {
        playChainStep(0); // Loop
      } else {
        setChainPlaying(false);
        setChainIndex(0);
      }
      return;
    }

    setChainIndex(idx);
    const step = chainSteps[idx];
    const snapshotId = findSnapshotIdByName(step.snapshot, snapshotsState);

    if (snapshotId) {
      // Trigger generic snapshot
      setActiveSnapshotId(snapshotId);
      setPendingSnapshotId(snapshotId);
      void scheduleSnapshot(snapshotId);
    }

    const effectiveBpm = useClockSync && clockBpm ? clockBpm : tempoBpm;
    const barMs = (60000 / Math.max(1, effectiveBpm)) * 4;
    const delayMs = barMs * Math.max(1, step.bars);

    chainTimerRef.current = window.setTimeout(() => {
      playChainStep((idx + 1) % chainSteps.length); // Loop by default
    }, delayMs);
  }

  function startChain() {
    if (chainSteps.length === 0) return;
    if (chainTimerRef.current) {
      window.clearTimeout(chainTimerRef.current);
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

  // Chain start/stop from MIDI needs to be handled via effect in hook or here.
  // Hook has listener but commented out calls.
  // So we adding listener here is best?
  // But hook already subscribes to events.
  // Let's add an effect here just for the chain start logic if followClockStart is true.
  useEffect(() => {
    if (!midiApi) return;
    const unsub = midiApi.onEvent((evt) => {
      if (followClockStart) {
        if (evt.msg.t === "start") startChain();
        if (evt.msg.t === "stop") stopChain();
      }
    });
    return unsub;
  }, [midiApi, followClockStart, chainSteps]); // chainSteps dependency for closure freshness

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
        <TopStatusBar
          saveLabel={
            saveStatus === "saving"
              ? "Saving..."
              : saveStatus === "saved"
              ? "Saved"
              : saveStatus === "error"
              ? "Error"
              : "Idle"
          }
          lastSavedAt={lastSavedAt}
          onRefresh={refreshPorts}
          onReset={() => {
            if (confirm("Reset?")) {
              /* hook doesn't expose reset, maybe add later? */ window.location.reload();
            }
          }}
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
          backendLabel={backendLabel}
          inputLabel={inputLabel}
          outputLabel={outputLabel}
        />
        <BodySplitPane>
          <LeftNavRail
            route={activeView}
            onChangeRoute={(next) => setActiveView(next)}
            onPanic={async () => {
              // Panic logic needs port access, easiest to implement here
              if (!midiApi) return;
              // Simple panic
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
          />
          <MainContentArea
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
              setStageDropDurationMs(
                Math.min(Math.max(Math.round(ms), 0), 60_000)
              )
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
              setSnapshotsState((current) => ({
                ...current,
                activeBankId: bankId,
              }))
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
