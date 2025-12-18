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

Status
- Phase 1 (Device graph + routing): done.
- Phase 2 (Mapping engine v1): done (CC learn, CC/PC/Note slots, main-process send path).

Next milestone (Phase 3)
- Snapshots engine (store per-device states + metadata).
- Jump/Commit behaviors (fade vs cycle-end apply).
- Throttled snapshot recall scheduling (5–10ms spacing).
- Project save format: version + migrations for snapshots.
