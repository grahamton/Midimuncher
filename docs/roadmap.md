# Roadmap

Goal: Build a snapshot-driven performance controller in software, using the OXI One as the hardware router (app → OXI over USB MIDI, OXI routes DIN/TRS downstream). Platform: Windows with Electron/React front-end and dual MIDI backends (WinMM fallback, Windows MIDI Services when available).

## Phases

- **Phase 0 · MIDI backend spike (done)**
  - Backend abstraction + WinMM provider; stub Windows MIDI Services provider.
  - Backend selector UI and basic diagnostics (send test note).

- **Phase 1 · Device graph + routing (mostly done)**
  - Device model (max 8) with port binding, default channel, clock flag, and instrument selection.
  - Routing patchbay with filters, channel force/passthrough, clock thinning, loop guard, and device-aware route creation.
  - Monitor view with backend/port context, log cap indicator, and clear control.
  - Remaining: persistence of devices/routes, optional “merge” controls, clearer OXI port labeling.

- **Phase 2 · Mapping engine v1 (in progress)**
  - Virtual controls with 8 CC slots each (per-slot curve, min/max, optional channel override, device target).
  - Curated CC presets pulled from the instrument registry for quick slot selection.
  - Remaining: MIDI Learn, non-CC messages (NRPN/note/PC), button semantics (toggle/momentary), save/load.

- **Phase 3 · Snapshots, Jump, Commit**
  - Snapshot = per-device CC state + optional one-shots; stores BPM and metadata.
  - 20 banks × 20 snapshots per project.
  - Jump (fade, incl. zero), Commit (cycle-end, no fade); global cycle length 1–32 bars.
  - Burst limiting on recall: 5–10ms spacing between outgoing messages to avoid choking OXI/synth buffers.
  - “Global P-lock” mental model: the hardware sequencer runs the patterns; snapshots reset global params.

- **Phase 4 · Chain mode**
  - Up to 20 chains, 64 steps each; step/auto-advance quantized to cycle boundaries.
  - UI: chain editor (list of steps), transport controls.

- **Phase 5 · OXI integration**
  - OXI configuration surfaced in docs and UI hints:
    - USB mode: Device
    - OXI Split (A/B/C ports) to expand available channels
    - Thru expectations (avoid feedback loops)
  - Transport control via OXI CC transport messages (requires “CC Transport Msgs” enabled on OXI):
    - CC 105: Stop
    - CC 106: Play
    - CC 107: Record (toggle)
  - OXI-aware templates and routing presets; port labeling/wizard.
  - OXI “sanity test” (mode/firmware check, round-trip messages).
  - Optional: consume OXI transport/clock to align cycles.

- **Phase 6 · Grid/DAW (optional)**
  - Grid view for notes/clip launch; Ableton/Bitwig templates after core perf features are solid.

## Engineering backlog

- **P0 correctness/perf**
  - High-res scheduler for cycle boundaries; decouple UI from MIDI send path.
  - Backpressure/overflow handling in monitor; deterministic snapshot recall.
- **P1 reliability**
  - Versioned project save format; autosave; crash-safe persistence.
- **P2 UX**
  - Onboarding wizard mirroring the workflow (gear → init project → add devices → map → snapshots).

## Deliverables to scaffold soon

- `/midi`: `IMidiBackend`, WinMM provider, Windows MIDI Services provider (feature-flagged).
- `/core`: routing graph, mapping engine, snapshot engine, scheduler.
- `/ui`: setup, routing, mapping, performance, chain, monitor views.
- `/tests`: mapping/snapshot determinism; scheduler boundary cases.
