import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaultProjectDoc } from "../shared/projectTypes";
import { ProjectStorage } from "../electron/projectStorage";

async function main() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "midimuncher-persist-"));
  const storage = new ProjectStorage({ dir, filename: "project.json" });

  const doc = defaultProjectDoc();
  doc.state.devices = [
    {
      id: "device-1",
      name: "OXI One",
      instrumentId: null,
      inputId: null,
      outputId: null,
      channel: 1,
      clockEnabled: false
    }
  ];

  await storage.save(doc);
  const loaded = await storage.load(() => defaultProjectDoc());
  assert.equal((loaded as any).schemaVersion, 2);
  assert.equal((loaded as any).state?.devices?.[0]?.name, "OXI One");

  const targetPath = storage.filePath();
  await fs.writeFile(targetPath, "{ this is not json", "utf8");
  const recovered = await storage.load(() => defaultProjectDoc());
  assert.equal((recovered as any).state?.devices?.[0]?.name, "OXI One");

  const parsed = JSON.parse(await fs.readFile(targetPath, "utf8"));
  assert.equal(parsed.state.devices[0].name, "OXI One");

  console.log("OK: persistence smoke test passed");
  console.log(`Temp dir: ${dir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

