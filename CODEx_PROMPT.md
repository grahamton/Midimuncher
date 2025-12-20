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

Milestone 1 (shipped)
- Add apps/desktop Electron + Vite + React wiring.
- Implement main process midiBridge with listPorts, openIn, openOut, send.
- Implement IPC: renderer subscribes to midi events.
- UI: device picker, activity log, send test note.

Status
- Phase 1 (Device graph + routing): done.
- Phase 2 (Mapping engine v1): done (CC learn, CC/PC/Note slots, main-process send path).
- Phase 3 (Snapshots/Jump/Commit): done (main-process scheduler, queue/flush, burst limiting, cycle bars, clock source selection; Stage Launch/Drop bundle wired).

Next milestone (Phase 4)
- Stage performance layout: rig-aware instrument strips + transition progress/fader.
- Drop workflow polish: better status/feedback; bundled transitions beyond a single macro ramp (optional).
- Snapshot morphing: crossfader + per-parameter curves, optional slew/smoothing.
- Assignment flow: bulk bind macros/pads with tagging + quick instrument pickers.
