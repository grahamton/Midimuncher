import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveTransportFromOxiCc } from "../electron/oxiTransport";

describe("deriveTransportFromOxiCc", () => {
  it("maps OXI transport CCs to start/stop/continue", () => {
    assert.deepEqual(deriveTransportFromOxiCc({ t: "cc", ch: 1, cc: 105, val: 127 }), { t: "stop" });
    assert.deepEqual(deriveTransportFromOxiCc({ t: "cc", ch: 1, cc: 106, val: 127 }), { t: "start" });
    assert.deepEqual(deriveTransportFromOxiCc({ t: "cc", ch: 1, cc: 107, val: 127 }), { t: "continue" });
  });

  it("ignores release events (value 0) and non-transport CCs", () => {
    assert.equal(deriveTransportFromOxiCc({ t: "cc", ch: 1, cc: 106, val: 0 }), null);
    assert.equal(deriveTransportFromOxiCc({ t: "cc", ch: 1, cc: 1, val: 127 }), null);
  });

  it("ignores non-CC messages", () => {
    assert.equal(deriveTransportFromOxiCc({ t: "start" }), null);
  });
});

