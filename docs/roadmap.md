# Roadmap

Goal: Recreate the core Neuzeit Drop workflow in software, using the OXI One as the hardware router (app -> OXI over USB MIDI, OXI routes DIN/CV/other outs). Platform is Windows with an Electron/React front-end and dual MIDI backends (WinMM fallback, Windows MIDI Services when available).

## Phases

- **Phase 0 · MIDI backend spike**
  - Add `IMidiBackend` abstraction; wire current WinMM (@julusian/midi) path.
  - Spike Windows MIDI Services provider behind a feature flag; diagnostics panel to show active backend and run a send/receive sanity check to OXI.

- **Phase 1 · Device graph + routing**
  - Device model (max 8) with in/out/clock flags, default channel, port binding.
  - Routing rules per device, merge toggle, basic filters (message types, channel), per-device clock enable/delay placeholder.
  - Monitor view with overload indicators and per-device activity badges.

- **Phase 2 · Mapping engine v1**
  - `ControlElement` with 8 slots; slot: type (CC/NRPN/note/PC), channel, param, min/max, curve, target device, enabled.
  - MIDI Learn workflow; curve presets (linear, expo, log).
  - UI: mapping grid (controls left, slot editor right).

- **Phase 3 · Snapshots, Jump, Drop**
  - 20 banks × 20 snapshots; snapshot stores control values + up to 8 one-shots.
  - Jump (fade, incl. zero), Drop (cycle-end, no fade); global cycle length 1–32 bars.
  - UI: performance view with snapshot grid, Jump/Drop buttons, fade time, cycle display.

- **Phase 4 · Chain mode**
  - Up to 20 chains, 64 steps each; step/auto-advance quantized to cycle boundaries.
  - UI: chain editor (list of steps), transport controls.

- **Phase 5 · OXI integration**
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
  - Onboarding wizard mirroring Drop workflow (gear → init project → add devices → map → snapshots).

## Deliverables to scaffold soon

- `/midi`: `IMidiBackend`, WinMM provider, Windows MIDI Services provider (feature-flagged).
- `/core`: routing graph, mapping engine, snapshot engine, scheduler.
- `/ui`: setup, mapping, performance, chain views.
- `/tests`: mapping/snapshot determinism; scheduler boundary cases.
