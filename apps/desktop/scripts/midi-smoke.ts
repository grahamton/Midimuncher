import midi from "@julusian/midi";

function listPorts() {
  const probeIn = new midi.Input();
  const probeOut = new midi.Output();

  const inputs = Array.from({ length: probeIn.getPortCount() }, (_, idx) => probeIn.getPortName(idx));
  const outputs = Array.from({ length: probeOut.getPortCount() }, (_, idx) => probeOut.getPortName(idx));

  console.log("MIDI inputs:");
  inputs.forEach((name, idx) => console.log(`  [${idx}] ${name}`));
  if (inputs.length === 0) console.log("  (none)");

  console.log("\nMIDI outputs:");
  outputs.forEach((name, idx) => console.log(`  [${idx}] ${name}`));
  if (outputs.length === 0) console.log("  (none)");

  return { inputs, outputs };
}

async function main() {
  const { inputs } = listPorts();
  if (inputs.length === 0) {
    console.log("\nNo inputs to monitor. Plug in OXI and re-run.");
    return;
  }

  const monitor = new midi.Input();
  monitor.on("message", (delta, message) => {
    console.log(`msg +${delta.toFixed(4)}s -> [${message.join(", ")}]`);
  });
  monitor.openPort(0);
  monitor.ignoreTypes(false, false, false);

  console.log("\nListening on input 0 for 3 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  monitor.closePort();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
