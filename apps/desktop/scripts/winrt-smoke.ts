import { WindowsMidiServicesBackend } from "../electron/backends/windowsMidiServicesBackend";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const backend = new WindowsMidiServicesBackend();
  const available = await backend.isAvailable();
  if (!available) {
    console.log("Windows MIDI Services backend is not available (non-Windows platform or runtime not installed).");
    return;
  }

  const ports = await backend.listPorts();
  console.log("Windows MIDI Services inputs:");
  ports.inputs.forEach((p) => console.log(`  ${p.id} :: ${p.name}`));
  if (!ports.inputs.length) console.log("  (none)");

  console.log("\nWindows MIDI Services outputs:");
  ports.outputs.forEach((p) => console.log(`  ${p.id} :: ${p.name}`));
  if (!ports.outputs.length) console.log("  (none)");

  const firstOut = ports.outputs[0];
  const firstIn = ports.inputs[0];

  if (firstOut) {
    console.log(`\nOpening output ${firstOut.name}...`);
    const outOk = await backend.openOut(firstOut.id);
    if (!outOk) {
      console.log("Failed to open output.");
    } else {
      const on = await backend.send(firstOut.id, [0x90, 60, 100]);
      await sleep(180);
      const off = await backend.send(firstOut.id, [0x80, 60, 0]);
      console.log(on && off ? "Sent note on/off on Windows MIDI Services backend." : "Send failed.");
    }
  }

  if (firstIn) {
    console.log(`\nOpening input ${firstIn.name} for 1s of monitoring...`);
    backend.on("midi", (packet) => {
      console.log(`MIDI packet on ${packet.portId}: [${packet.bytes.join(", ")}]`);
    });
    const inOk = await backend.openIn(firstIn.id);
    if (inOk) {
      await sleep(1000);
    } else {
      console.log("Failed to open input.");
    }
  }

  await backend.closeAll();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
