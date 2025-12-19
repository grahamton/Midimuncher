import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { quantizeToMs } from "../src/app/lib/tempo";

describe("quantizeToMs", () => {
  it("computes expected durations", () => {
    assert.equal(quantizeToMs("immediate", 120), 0);
    assert.equal(Math.round(quantizeToMs("bar1", 120)), 2000);
    assert.equal(Math.round(quantizeToMs("bar4", 120)), 8000);
  });

  it("falls back to safe bpm when invalid", () => {
    assert.equal(Math.round(quantizeToMs("bar1", 0)), 2000);
  });
});
