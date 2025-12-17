const { spawn } = require("node:child_process");
const electronPath = require("electron");

// Strip ELECTRON_RUN_AS_NODE so Electron starts in browser mode even if it's set globally.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
if (args.length === 0) {
  args.push(".");
}

const child = spawn(electronPath, args, {
  stdio: "inherit",
  env,
  windowsHide: false
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
