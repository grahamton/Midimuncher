# Codex agent prompt

Role
- Build the repo from this scaffold into a working Electron app.

Priorities
1. MIDI reliability on Windows.
2. Clean module boundaries: core engine is pure TS, main process owns MIDI.
3. Minimal UI that proves the loop: OXI in, app processes, app out.

Rules
- Prefer small, testable increments.
- Add a smoke test script for device discovery.
- Keep dependencies minimal.

Milestone 1 tasks
- Add apps/desktop Electron + Vite + React wiring.
- Implement main process midiBridge with listPorts, openIn, openOut, send.
- Implement IPC: renderer subscribes to midi events.
- UI: device picker, activity log, send test note.
