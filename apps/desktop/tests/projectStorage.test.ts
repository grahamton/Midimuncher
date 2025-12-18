import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { ProjectStore } from "../electron/projectStore";
import { ProjectStorage } from "../electron/projectStorage";
import { defaultProjectDoc } from "../shared/projectTypes";

async function createTempDir(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("ProjectStorage", () => {
  it("writes fallback docs and restores from backups", async () => {
    const dir = await createTempDir("storage-");
    const storage = new ProjectStorage({ dir, filename: "doc.json" });

    const created = await storage.load(() => defaultProjectDoc());
    const targetPath = storage.filePath();
    const backupPath = storage.backupPath();

    assert.deepStrictEqual(JSON.parse(await fs.readFile(targetPath, "utf8")), created);
    assert.ok(await fs.readFile(backupPath, "utf8"));

    await storage.save({ ...created, schemaVersion: 1, updatedAt: 1234 });
    await fs.rm(targetPath);

    const restored = await storage.load(() => defaultProjectDoc());
    assert.equal(restored.updatedAt, 1234);
    assert.deepStrictEqual(JSON.parse(await fs.readFile(targetPath, "utf8")), restored);
  });
});

describe("ProjectStore", () => {
  it("debounces saves and flushes to disk", async () => {
    const dir = await createTempDir("store-");
    const store = new ProjectStore({ dir });

    const loaded = await store.load();
    const next = {
      ...loaded.state,
      backendId: "winmm",
      selectedDeviceId: "device-99"
    };

    await new Promise((resolve) => setTimeout(resolve, 1));
    store.setState(next);
    await store.flush();

    const saved = JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf8"));
    assert.equal(saved.state.backendId, "winmm");
    assert.equal(saved.state.selectedDeviceId, "device-99");
    assert.ok(saved.updatedAt > loaded.updatedAt);
  });
});
