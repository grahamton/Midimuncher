import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coerceProjectDoc, defaultProjectDoc } from "../shared/projectTypes";

describe("coerceProjectDoc", () => {
  it("applies snapshots defaults when missing", () => {
    const result = coerceProjectDoc({ schemaVersion: 2, updatedAt: 123, state: {} });
    assert.equal(result.state.snapshots.burst.intervalMs, 6);
    assert.equal(result.state.snapshots.burst.maxPerInterval, 1);
    assert.equal(result.state.snapshots.banks.length, 20);
    assert.equal(result.state.snapshots.banks[0]?.slots.length, 20);
  });

  it("falls back to defaults for invalid payloads", () => {
    const fallback = defaultProjectDoc();
    const result = coerceProjectDoc({ schemaVersion: 99, state: null });

    assert.equal(result.state.activeView, fallback.state.activeView);
    assert.deepStrictEqual(result.state.devices, fallback.state.devices);
  });

  it("sanitizes nested state fields", () => {
    const dirty = coerceProjectDoc({
      schemaVersion: 2,
      updatedAt: 123,
      state: {
        backendId: 0,
        selectedIn: false,
        selectedOut: {},
        activeView: "unknown",
        selectedDeviceId: 42,
        devices: [
          { id: null, name: 12, instrumentId: 9, inputId: 5, outputId: {}, channel: 99, clockEnabled: "yes" }
        ],
        tempoBpm: "fast",
        useClockSync: "yes",
        followClockStart: "no",
        snapshotQuantize: "bad",
        snapshotMode: "bad",
        snapshotFadeMs: -10,
        chainSteps: [{ snapshot: 5, bars: 999 }],
        routes: [{ id: "r1", fromId: "a", toId: "b" }],
        controls: [{ id: "c1" }],
        selectedControlId: undefined,
        ui: {
          routeBuilder: { forceChannelEnabled: "no", routeChannel: -3, allowNotes: 1, allowClock: "yes", clockDiv: 300 },
          diagnostics: { note: -10, ccValue: 999 }
        }
      }
    });

    assert.equal(dirty.state.activeView, defaultProjectDoc().state.activeView);
    assert.deepStrictEqual(dirty.state.devices[0], {
      id: "device-1",
      name: "Device 1",
      instrumentId: null,
      lane: 1,
      inputId: null,
      outputId: null,
      channel: 16,
      clockEnabled: false
    });
    assert.equal(dirty.state.ui.routeBuilder.routeChannel, 1);
    assert.equal(dirty.state.ui.routeBuilder.clockDiv, 96);
    assert.deepStrictEqual(dirty.state.ui.diagnostics, { note: 0, ccValue: 127 });
    assert.equal(dirty.state.tempoBpm, defaultProjectDoc().state.tempoBpm);
    assert.equal(dirty.state.snapshotQuantize, defaultProjectDoc().state.snapshotQuantize);
    assert.equal(dirty.state.snapshotMode, defaultProjectDoc().state.snapshotMode);
    assert.equal(dirty.state.useClockSync, defaultProjectDoc().state.useClockSync);
    assert.equal(dirty.state.followClockStart, defaultProjectDoc().state.followClockStart);
    assert.equal(dirty.state.snapshotFadeMs, defaultProjectDoc().state.snapshotFadeMs);
    assert.equal(dirty.state.snapshotClockSource, defaultProjectDoc().state.snapshotClockSource);
    assert.equal(dirty.state.snapshotCycleBars, defaultProjectDoc().state.snapshotCycleBars);
    assert.equal(dirty.state.stageDropControlId, defaultProjectDoc().state.stageDropControlId);
    assert.equal(dirty.state.stageDropToValue, defaultProjectDoc().state.stageDropToValue);
    assert.equal(dirty.state.stageDropDurationMs, defaultProjectDoc().state.stageDropDurationMs);
    assert.equal(dirty.state.chainSteps.length, defaultProjectDoc().state.chainSteps.length);
  });
});
