import type {
  ControlElement,
  MidiEvent,
  SnapshotBurstLimit,
  SnapshotRecallOptions,
  SnapshotRecallStrategy,
  SnapshotState,
  TimedMidiSend
} from "@midi-playground/core";
import { computeMappingSends, SnapshotTracker, planSnapshotRecall } from "@midi-playground/core";
import { performance } from "node:perf_hooks";
import type {
  MacroRampPayload,
  SnapshotCapturePayload,
  SnapshotDropBundlePayload,
  SnapshotQueueStatus,
  SnapshotRecallPayload,
  SnapshotSchedulePayload
} from "../shared/ipcTypes";
import type { DeviceConfig } from "../shared/projectTypes";
import type { MidiBridge } from "./midiBridge";
import type { SessionLogger } from "./sessionLogger";

type ClockSource = SnapshotSchedulePayload["clockSource"];
type QuantizeKind = SnapshotSchedulePayload["quantize"];

type QueueItem = {
  id: number;
  snapshotId: string | null;
  snapshotName: string | null;
  snapshot: SnapshotState;
  strategy: SnapshotRecallStrategy;
  fadeMs?: number;
  commitDelayMs?: number;
  burst?: SnapshotBurstLimit;
  clockSource: ClockSource;
  quantize: QuantizeKind;
  cycleLengthBars: number;
  bpm: number | null;
  requestedAt: number;
  macroRamp?: {
    control: ControlElement;
    from: number;
    to: number;
    durationMs: number;
    stepMs: number;
    perSendSpacingMs: number;
  } | null;
};

type ArmedItem = {
  itemId: number;
  dueTick: number;
  dueAtMs: number | null;
};

export class SnapshotService {
  private static readonly MAX_QUEUE = 32;

  private tracker = new SnapshotTracker();
  private lastSnapshot: SnapshotState | null = null;
  private recallTimer: NodeJS.Timeout | null = null;
  private recallRunId = 0;
  private queue: QueueItem[] = [];
  private nextQueueId = 1;
  private armed: ArmedItem | null = null;
  private queueTimer: NodeJS.Timeout | null = null;
  private executingQueued = false;
  private devices: DeviceConfig[] = [];

  private clockRunning = false;
  private clockTickCount = 0;
  private clockLastTickAt: number | null = null;
  private clockBpm: number | null = null;
  private readonly ppqn = 24;
  private internalEpochMs: number | null = null;
  private onStatus: ((status: SnapshotQueueStatus) => void) | null = null;

  constructor(
    private midi: MidiBridge,
    private sessionLogger?: SessionLogger
  ) {}

  setStatusEmitter(listener: ((status: SnapshotQueueStatus) => void) | null) {
    this.onStatus = listener;
    this.emitQueueStatus();
  }

  updateDevices(devices: DeviceConfig[]) {
    this.devices = devices ?? [];
    this.tracker.updateBindings(
      devices.map((d) => ({
        deviceId: d.id,
        outputId: d.outputId,
        inputId: d.inputId ?? undefined,
        channel: d.channel,
        name: d.name
      }))
    );
  }

  ingest(evt: MidiEvent) {
    this.tracker.ingest(evt);

    const now = typeof evt.ts === "number" ? evt.ts : Date.now();
    if (evt.msg.t === "clock") {
      this.handleClock(now);
      return;
    }
    if (evt.msg.t === "start") {
      this.clockRunning = true;
      this.clockTickCount = 0;
      this.clockLastTickAt = null;
      this.clockBpm = null;
      this.emitQueueStatus();
      this.maybeScheduleNextQueued();
      return;
    }
    if (evt.msg.t === "stop") {
      this.clockRunning = false;
      this.emitQueueStatus();
      if (this.armed) {
        this.armFallbackTimer(this.peekQueueHead());
      }
    }
  }

  capture(req?: SnapshotCapturePayload): SnapshotState {
    if (req?.notes) {
      this.tracker.setNotesMeta(req.notes);
    }
    const snapshot = this.tracker.capture({ notes: req?.notes, bpm: req?.bpm ?? undefined });
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  scheduleDropBundle(payload: SnapshotDropBundlePayload): boolean {
    if (!payload?.schedule) return false;
    const scheduleOk = this.schedule({
      ...payload.schedule,
      // Ensure name/id are present for dedupe + UI status when the caller can provide them.
      snapshotId: payload.schedule.snapshotId ?? null,
      snapshotName: payload.schedule.snapshotName ?? null,
    });
    if (!scheduleOk) return false;

    const head = this.queue[this.queue.length - 1];
    if (!head) return scheduleOk;

    const ramp = payload.macroRamp ?? null;
    if (!ramp) return scheduleOk;
    if (!ramp.control) return scheduleOk;

    head.macroRamp = normalizeMacroRamp(ramp);
    this.emitQueueStatus();
    return scheduleOk;
  }

  schedule(payload: SnapshotSchedulePayload): boolean {
    if (!payload?.snapshot) return false;

    const clockSource: ClockSource = payload.clockSource ?? "oxi";
    const quantize: QuantizeKind = payload.quantize ?? "immediate";
    const cycleLengthBars = clampInt(payload.cycleLengthBars ?? 4, 1, 32);

    if (this.queue.length >= SnapshotService.MAX_QUEUE) {
      this.sessionLogger?.log("snapshotQueueOverflow", {
        max: SnapshotService.MAX_QUEUE,
        queueLength: this.queue.length,
        snapshotId: payload.snapshotId ?? null,
        snapshotName: payload.snapshotName ?? null,
      });
      return false;
    }

    const item: QueueItem = {
      id: this.nextQueueId++,
      snapshotId: payload.snapshotId ?? null,
      snapshotName: payload.snapshotName ?? null,
      snapshot: payload.snapshot,
      strategy: payload.strategy,
      fadeMs: payload.fadeMs,
      commitDelayMs: payload.commitDelayMs,
      burst: payload.burst,
      clockSource,
      quantize,
      cycleLengthBars,
      bpm: typeof payload.bpm === "number" ? payload.bpm : null,
      requestedAt: Date.now(),
      macroRamp: null,
    };

    if (item.snapshotId) {
      this.queue = this.queue.filter((q, idx) => {
        if (!q.snapshotId) return true;
        if (q.snapshotId !== item.snapshotId) return true;
        if (idx === 0 && (this.executingQueued || this.armed)) return true;
        return false;
      });
    }

    if (clockSource === "internal" && this.internalEpochMs == null) {
      this.internalEpochMs = Date.now();
    }

    this.queue.push(item);
    this.sessionLogger?.log("snapshotQueued", {
      snapshotId: item.snapshotId,
      snapshotName: item.snapshotName,
      strategy: item.strategy,
      quantize: item.quantize,
      clockSource: item.clockSource,
      cycleLengthBars: item.cycleLengthBars,
      queueLength: this.queue.length,
    });
    this.emitQueueStatus();
    this.maybeScheduleNextQueued();
    return true;
  }

  recall(payload: SnapshotRecallPayload): boolean {
    if (!payload?.snapshot) return false;
    this.cancelPendingRecall();
    const options: SnapshotRecallOptions = {
      from: this.lastSnapshot ?? this.tracker.getCurrentState(),
      strategy: payload.strategy,
      fadeMs: payload.fadeMs,
      commitDelayMs: payload.commitDelayMs,
      burst: payload.burst
    };
    const plan = planSnapshotRecall(payload.snapshot, options);
    this.sessionLogger?.log("snapshotRecallPlanned", {
      strategy: payload.strategy,
      fadeMs: payload.fadeMs ?? null,
      commitDelayMs: payload.commitDelayMs ?? null,
      burst: payload.burst ?? null,
      sendCount: plan.length,
      maxDelayMs: plan.reduce((acc, s) => Math.max(acc, s.delayMs), 0),
    });
    this.lastSnapshot = payload.snapshot;
    this.execute(plan);
    return true;
  }

  flushQueue(): boolean {
    this.queue = [];
    this.executingQueued = false;
    this.armed = null;
    this.clearQueueTimer();
    this.cancelPendingRecall();
    this.internalEpochMs = null;
    this.emitQueueStatus();
    this.sessionLogger?.log("snapshotQueueFlushed", {});
    return true;
  }

  private execute(plan: TimedMidiSend[], onDone?: () => void) {
    if (!plan.length) return;
    const runId = ++this.recallRunId;

    const portIds = new Set<string>();
    for (const send of plan) portIds.add(send.portId);
    for (const portId of portIds) {
      void this.midi.openOut(portId);
    }

    const ordered = [...plan].sort((a, b) => a.delayMs - b.delayMs);
    const start = performance.now();
    let index = 0;

    const tick = () => {
      if (runId !== this.recallRunId) return;

      const elapsed = performance.now() - start;
      while (index < ordered.length && ordered[index]!.delayMs <= elapsed + 0.5) {
        const send = ordered[index]!;
        void this.midi.send({ portId: send.portId, msg: send.msg });
        index += 1;
      }

      if (index >= ordered.length) {
        this.clearTimer();
        onDone?.();
        return;
      }

      const nextDelay = ordered[index]!.delayMs;
      const waitMs = Math.max(0, Math.round(nextDelay - elapsed));
      this.recallTimer = setTimeout(tick, waitMs);
    };

    this.recallTimer = setTimeout(tick, 0);
  }

  private cancelPendingRecall() {
    this.recallRunId += 1;
    this.clearTimer();
  }

  private clearTimer() {
    if (!this.recallTimer) return;
    clearTimeout(this.recallTimer);
    this.recallTimer = null;
  }

  private handleClock(now: number) {
    const delta = this.clockLastTickAt ? now - this.clockLastTickAt : null;
    if (delta && delta > 0) {
      const bpmFromTick = 60000 / (delta * this.ppqn);
      const smoothed = this.clockBpm ? this.clockBpm * 0.7 + bpmFromTick * 0.3 : bpmFromTick;
      this.clockBpm = smoothed;
    }

    this.clockTickCount += 1;
    this.clockLastTickAt = now;
    this.clockRunning = true;

    if (this.armed && this.clockTickCount >= this.armed.dueTick) {
      const head = this.peekQueueHead();
      if (head && head.id === this.armed.itemId) {
        this.armed = null;
        this.emitQueueStatus();
        this.startExecutingQueueHead();
        return;
      }
      this.armed = null;
      this.emitQueueStatus();
    }
  }

  private maybeScheduleNextQueued() {
    if (this.executingQueued) return;
    if (this.queueTimer || this.armed) return;
    if (!this.queue.length) return;

    const head = this.queue[0]!;
    const shouldUseOxi = head.clockSource === "oxi";

    if (shouldUseOxi && this.clockRunning) {
      const dueTick = this.computeDueTick(head);
      if (dueTick <= this.clockTickCount) {
        this.startExecutingQueueHead();
        return;
      }
      this.armed = { itemId: head.id, dueTick, dueAtMs: null };
      this.emitQueueStatus();
      return;
    }

    const delayMs = this.computeFallbackDelayMs(head);
    this.queueTimer = setTimeout(() => this.startExecutingQueueHead(), delayMs);
    this.emitQueueStatus();
  }

  private startExecutingQueueHead() {
    if (this.executingQueued) return;
    const head = this.queue[0];
    if (!head) return;

    this.executingQueued = true;
    this.clearQueueTimer();
    this.armed = null;
    this.emitQueueStatus();

    const effectiveFrom = this.lastSnapshot ?? this.tracker.getCurrentState();
    const fadeMs = head.strategy === "commit" ? 0 : head.fadeMs;
    const options: SnapshotRecallOptions = {
      from: effectiveFrom,
      strategy: "jump",
      fadeMs,
      burst: head.burst,
    };
    const snapshotPlan = planSnapshotRecall(head.snapshot, options);
    const macroPlan = head.macroRamp
      ? this.planMacroRamp(head.macroRamp, head.burst)
      : [];
    const plan = [...snapshotPlan, ...macroPlan];
    this.sessionLogger?.log("snapshotRecallPlanned", {
      queued: true,
      snapshotId: head.snapshotId,
      snapshotName: head.snapshotName,
      strategy: head.strategy,
      quantize: head.quantize,
      clockSource: head.clockSource,
      fadeMs: head.fadeMs ?? null,
      burst: head.burst ?? null,
      sendCount: plan.length,
      maxDelayMs: plan.reduce((acc, s) => Math.max(acc, s.delayMs), 0),
      macroRamp: head.macroRamp
        ? {
            controlId: head.macroRamp.control.id,
            from: head.macroRamp.from,
            to: head.macroRamp.to,
            durationMs: head.macroRamp.durationMs,
            stepMs: head.macroRamp.stepMs,
            perSendSpacingMs: head.macroRamp.perSendSpacingMs,
          }
        : null,
    });

    this.execute(plan, () => {
      this.lastSnapshot = head.snapshot;
      this.queue.shift();
      this.executingQueued = false;
      this.emitQueueStatus();
      this.maybeScheduleNextQueued();
    });
  }

  private armFallbackTimer(head: QueueItem | null) {
    if (!head) return;
    if (this.queueTimer) return;
    const delayMs = this.computeFallbackDelayMs(head);
    this.queueTimer = setTimeout(() => this.startExecutingQueueHead(), delayMs);
    this.emitQueueStatus();
  }

  private clearQueueTimer() {
    if (!this.queueTimer) return;
    clearTimeout(this.queueTimer);
    this.queueTimer = null;
  }

  private computeDueTick(head: QueueItem): number {
    const ticksPerBeat = this.ppqn;
    const ticksPerBar = ticksPerBeat * 4;

    const boundaryTicks = (() => {
      if (head.strategy === "commit") return ticksPerBar * clampInt(head.cycleLengthBars, 1, 32);
      switch (head.quantize) {
        case "beat":
          return ticksPerBeat;
        case "bar":
          return ticksPerBar;
        case "bar4":
          return ticksPerBar * 4;
        default:
          return 1;
      }
    })();

    const safeBoundary = Math.max(1, boundaryTicks);
    const remainder = this.clockTickCount % safeBoundary;
    const ticksToNext = remainder === 0 ? 0 : safeBoundary - remainder;
    return this.clockTickCount + ticksToNext;
  }

  private computeFallbackDelayMs(head: QueueItem): number {
    if (head.clockSource === "internal") {
      return this.computeInternalAlignedDelayMs(head);
    }
    if (head.strategy === "commit") {
      const override = head.commitDelayMs;
      if (typeof override === "number" && override >= 0) return Math.round(override);

      const bpm = head.bpm ?? this.clockBpm;
      if (bpm && bpm > 0) {
        const barMs = (60000 / bpm) * 4;
        return Math.round(barMs * clampInt(head.cycleLengthBars, 1, 32));
      }
      return 500;
    }

    const bpm = head.bpm ?? this.clockBpm;
    if (!bpm || bpm <= 0) {
      return head.quantize === "immediate" ? 0 : 0;
    }

    const quarterMs = 60000 / bpm;
    switch (head.quantize) {
      case "beat":
        return Math.round(quarterMs);
      case "bar":
        return Math.round(quarterMs * 4);
      case "bar4":
        return Math.round(quarterMs * 16);
      default:
        return 0;
    }
  }

  private computeInternalAlignedDelayMs(head: QueueItem): number {
    if (head.quantize === "immediate" && head.strategy !== "commit") return 0;
    if (!this.internalEpochMs) this.internalEpochMs = Date.now();

    const bpm = head.bpm;
    if (!bpm || bpm <= 0) return 0;

    const quarterMs = 60000 / bpm;
    const barMs = quarterMs * 4;

    const boundaryMs = (() => {
      if (head.strategy === "commit") return barMs * clampInt(head.cycleLengthBars, 1, 32);
      switch (head.quantize) {
        case "beat":
          return quarterMs;
        case "bar":
          return barMs;
        case "bar4":
          return barMs * 4;
        default:
          return 0;
      }
    })();

    if (boundaryMs <= 0) return 0;

    const elapsed = Date.now() - this.internalEpochMs;
    const remainder = elapsed % boundaryMs;
    const delay = remainder === 0 ? 0 : boundaryMs - remainder;
    return Math.max(0, Math.round(delay));
  }

  private peekQueueHead(): QueueItem | null {
    return this.queue[0] ?? null;
  }

  private emitQueueStatus() {
    const head = this.peekQueueHead();
    const status: SnapshotQueueStatus = {
      queueLength: this.queue.length,
      executing: this.executingQueued,
      armed: !!this.armed,
      activeSnapshotId: head?.snapshotId ?? null,
      activeSnapshotName: head?.snapshotName ?? null,
      clockRunning: this.clockRunning,
      clockSource: head?.clockSource ?? "oxi",
    };
    this.onStatus?.(status);
  }

  private planMacroRamp(
    ramp: NonNullable<QueueItem["macroRamp"]>,
    burst?: SnapshotBurstLimit
  ): TimedMidiSend[] {
    const safeDuration = Math.max(0, Math.round(ramp.durationMs));
    if (safeDuration <= 0) return [];

    const stepMs = Math.max(10, Math.round(ramp.stepMs));
    const perSendSpacingMs = Math.max(0, Math.round(ramp.perSendSpacingMs));
    const steps = Math.max(1, Math.round(safeDuration / stepMs));

    const devices = this.devices
      .filter((d) => !!d.outputId)
      .map((d) => ({ id: d.id, outputId: d.outputId, channel: d.channel }));

    if (!devices.length) return [];

    const from = clampInt(ramp.from, 0, 127);
    const to = clampInt(ramp.to, 0, 127);

    const sends: TimedMidiSend[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 1 : i / steps;
      const value = Math.round(from + (to - from) * t);
      const stepSends = computeMappingSends(
        { ...ramp.control, value },
        value,
        devices
      );
      stepSends.forEach((send, idx) => {
        sends.push({
          portId: send.portId,
          msg: send.msg,
          delayMs: i * stepMs + idx * perSendSpacingMs
        });
      });
    }

    const limiter = burst;
    const limited = limiter ? applyBurstLimitTimed(sends, limiter) : sends;
    return limited;
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), max);
}

function normalizeMacroRamp(ramp: MacroRampPayload): NonNullable<QueueItem["macroRamp"]> {
  return {
    control: ramp.control,
    from: clampInt(ramp.from, 0, 127),
    to: clampInt(ramp.to, 0, 127),
    durationMs: Math.max(0, Math.round(ramp.durationMs)),
    stepMs: clampInt(ramp.stepMs ?? 30, 10, 2000),
    perSendSpacingMs: clampInt(ramp.perSendSpacingMs ?? 6, 0, 2000),
  };
}

function applyBurstLimitTimed(sends: TimedMidiSend[], limit: SnapshotBurstLimit): TimedMidiSend[] {
  const maxPer = Math.max(1, limit.maxPerInterval);
  const interval = Math.max(1, limit.intervalMs);
  const ordered = [...sends].sort((a, b) => a.delayMs - b.delayMs);
  let windowStart = 0;
  let count = 0;

  return ordered.map((send) => {
    let delay = send.delayMs;
    if (delay >= windowStart + interval) {
      windowStart = delay;
      count = 0;
    }
    if (count >= maxPer) {
      windowStart += interval;
      count = 0;
      delay = Math.max(delay, windowStart);
    }
    count += 1;
    return { ...send, delayMs: delay };
  });
}
