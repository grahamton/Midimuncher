import type { MidiEvent, SnapshotRecallOptions, SnapshotState, TimedMidiSend } from "@midi-playground/core";
import { SnapshotTracker, planSnapshotRecall } from "@midi-playground/core";
import { performance } from "node:perf_hooks";
import type { SnapshotCapturePayload, SnapshotRecallPayload } from "../shared/ipcTypes";
import type { DeviceConfig } from "../shared/projectTypes";
import type { MidiBridge } from "./midiBridge";
import type { SessionLogger } from "./sessionLogger";

export class SnapshotService {
  private tracker = new SnapshotTracker();
  private lastSnapshot: SnapshotState | null = null;
  private recallTimer: NodeJS.Timeout | null = null;
  private recallRunId = 0;

  constructor(
    private midi: MidiBridge,
    private sessionLogger?: SessionLogger
  ) {}

  updateDevices(devices: DeviceConfig[]) {
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
  }

  capture(req?: SnapshotCapturePayload): SnapshotState {
    if (req?.notes) {
      this.tracker.setNotesMeta(req.notes);
    }
    const snapshot = this.tracker.capture({ notes: req?.notes, bpm: req?.bpm ?? undefined });
    this.lastSnapshot = snapshot;
    return snapshot;
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

  private execute(plan: TimedMidiSend[]) {
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
}
