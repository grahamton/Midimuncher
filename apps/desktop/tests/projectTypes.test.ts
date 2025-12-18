import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { coerceProjectDoc, defaultProjectDoc } from "../shared/projectTypes";

describe("coerceProjectDoc", () => {
  it("falls back to defaults for invalid payloads", () => {
    const fallback = defaultProjectDoc();
    const result = coerceProjectDoc({ schemaVersion: 2, state: null });

    assert.equal(result.state.activeView, fallback.state.activeView);
    assert.deepStrictEqual(result.state.devices, []);
  });

  it("sanitizes nested state fields", () => {
    const dirty = coerceProjectDoc({
      schemaVersion: 1,
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
        routes: [{ id: "r1", fromId: "a", toId: "b" }],
        controls: [{ id: "c1" }],
        selectedControlId: undefined,
        ui: {
          routeBuilder: { forceChannelEnabled: "no", routeChannel: -3, allowNotes: 1, allowClock: "yes", clockDiv: 300 },
          diagnostics: { note: -10, ccValue: 999 }
        }
      }
    });

    assert.equal(dirty.state.activeView, "setup");
    assert.deepStrictEqual(dirty.state.devices[0], {
      id: "device-1",
      name: "Device 1",
      instrumentId: null,
      inputId: null,
      outputId: null,
      channel: 16,
      clockEnabled: false
    });
    assert.equal(dirty.state.ui.routeBuilder.routeChannel, 1);
    assert.equal(dirty.state.ui.routeBuilder.clockDiv, 96);
    assert.deepStrictEqual(dirty.state.ui.diagnostics, { note: 0, ccValue: 127 });
  });
});
