import type { MidiEvent, SnapshotRecallOptions, SnapshotState, TimedMidiSend } from "@midi-playground/core";
import { SnapshotTracker, planSnapshotRecall } from "@midi-playground/core";
import type { SnapshotCapturePayload, SnapshotRecallPayload } from "../shared/ipcTypes";
import type { DeviceConfig } from "../shared/projectTypes";
import type { MidiBridge } from "./midiBridge";

export class SnapshotService {
  private tracker = new SnapshotTracker();
  private lastSnapshot: SnapshotState | null = null;

  constructor(private midi: MidiBridge) {}

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
    const options: SnapshotRecallOptions = {
      from: this.lastSnapshot ?? this.tracker.getCurrentState(),
      strategy: payload.strategy,
      fadeMs: payload.fadeMs,
      commitDelayMs: payload.commitDelayMs,
      burst: payload.burst
    };
    const plan = planSnapshotRecall(payload.snapshot, options);
    this.lastSnapshot = payload.snapshot;
    this.execute(plan);
    return true;
  }

  private execute(plan: TimedMidiSend[]) {
    if (!plan.length) return;
    for (const send of plan) {
      setTimeout(() => {
        this.midi.openOut(send.portId);
        this.midi.send({ portId: send.portId, msg: send.msg });
      }, send.delayMs);
    }
  }
}
