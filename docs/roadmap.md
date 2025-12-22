# Roadmap

Goal: Build a snapshot-driven performance controller in software, using the OXI One as the hardware router (app + OXI over USB MIDI, OXI routes DIN/TRS downstream). Platform: Windows with Electron/React front-end and dual MIDI backends (WinMM fallback, Windows MIDI Services when available).

Current status (Dec 2025): Release Candidate (v0.8.2-beta). Phase 6 (Multi-Chain Mode) and Phase 7 (OXI Integration) are fully implemented and verified. The application now supports complex performance timelines and tight hardware integration with the OXI One hub, including remote transport control and automated routing templates.

Status vs goals: Phase 0–7 shipped; Phase 8 (Grid/DAW) and further refinement planned next.

## Phases

- **Phase 0 - MIDI backend spike (done)**

  - Backend abstraction + WinMM provider; stub Windows MIDI Services provider.
  - Backend selector UI and basic diagnostics (send test note).

- **Phase 1 - Device graph + routing (done)**

  - Device model (max 8) with port binding, default channel, clock flag, and instrument selection.
  - Routing patchbay with filters, channel force/passthrough, clock thinning, loop guard, and device-aware route creation.
  - Monitor view with backend/port context, log cap indicator, and clear control.
  - Optional: merge controls.

- **Phase 2 - Mapping engine v1 (done)**

  - Virtual controls with 8 CC slots each (per-slot curve, min/max, optional channel override, device target).
  - Curated CC presets pulled from the instrument registry for quick slot selection.
  - Includes: MIDI Learn, program change + note mapping, button semantics (toggle/momentary), save/load.

- **Phase 3 - Snapshots, Jump, Commit (done)**

  - Snapshot = per-device CC state + optional one-shots; stores BPM and metadata.
  - 20 banks A- 20 snapshots per project.
  - Jump (fade, incl. zero), Commit (cycle-end, no fade); global cycle length 1-32 bars; queue/flush behavior.
  - Snapshot scheduling runs in the main process and uses OXI clock by default (selectable), with internal alignment when not clocked.
  - Burst limiting on recall: 5-10ms spacing between outgoing messages to avoid choking OXI/synth buffers; optional per-parameter slew to prevent zippering on fast recalls.
  - Snapshot pads grid for live recall (big touch targets) with color labels per pad.
  - Snapshot morphing crossfader: interpolate between two snapshots with per-parameter curves; support staged fades (e.g., slow filters, fast mutes).
  - Assign flow to bind multiple controls to a snapshot pad or morph lane in one pass.
  - Safety rails: rate limiting and smoothing to avoid overloading DIN/TRS endpoints when multiple LFOs/sequencers run; per-engine CPU/throughput guardrails.

- **Phase 4 - Performance surfaces (Condukt-inspired) (done)**

  - Stage view: scene launcher (quantized), Drop transition (commit + macro ramp), and rig-aware instrument strips using new Fader components.
  - Resizable controls: Fader/Knob/Crossfader/Button/StepGrid support flexible sizing via style props (1x2, 2x1 compatible).
  - Macro faders: "Macro Multi-Bind" in Assignment Wizard enables one control driving multiple targets with custom curves.
  - Assignment wizard: Instrument-aware picker to browse CCs by name and category; streamlined mapping workflow.
  - Polish: UI now features collapsible LeftNavRail with Premium Lucide icons (Waveform, Cable, Sliders) and smooth transitions.
  - Refactoring: `App.tsx` significantly reduced (~900 lines), state extraction to `useAppController` complete.

- **Phase 5 - Software modulation + generative (done)**

  - Software LFO engine: unlimited tempo-synced LFOs (sine/saw/square/random/S+H) assignable to any mapped parameter; per-LFO depth, phase, and polyrhythmic divisions. (DONE)
  - Aesthetics: TI-31 Solar Calculator hardware theme applied globally (LCD text, ridged buttons, deep navy palette). (DONE)
  - Parameter sequencer lanes: 16-32 step grids that emit CC/NRPN values; supports probability, density, velocity scaling, per-step curves, and lock steps to snapshots. (DONE)
  - Euclidean pattern generator for gates/notes and CC pulses; randomize/seed tools with per-lane dice and undo. (DONE)
  - Crossfader/XY macros for morphing between modulation scenes (e.g., LFO set A -> set B); scene store/recall slots. (DONE)

- **Phase 6 - Chain mode (done)**

  - Up to 20 chains, 64 steps each; step/auto-advance quantized to cycle boundaries.
  - UI: chain editor (list of steps), transport controls, and renaming.

- **Phase 7 - OXI integration (done)**

  - OXI configuration surfaced in docs and UI hints (Setup Page Best Practices).
  - Transport control via OXI CC transport messages (CC 105: Stop, 106: Play, 107: Record).
  - OXI-aware routing presets ("OXI Quick Setup" wizard for Split mode).
  - OXI Remote Transport controls added to the Top Bar for hardware playback sync.

- **Phase 8 - Grid/DAW (optional)**

  - Grid view for notes/clip launch; Ableton/Bitwig templates after core perf features are solid.

- **Phase 9 - Instrument Library & Ecosystem (Done)**

  - **Instrument Definition Schema**: Define a robust JSON format (`.mididef.json`) for hardware profiles (CCs, NRPNs, Ranges).
  - **Local Library**: App scans `%USERPROFILE%/.midimuncher/instruments` for user-defined profiles.
  - **Community Sync**: Scripts to ingest external repositories and heuristic tagging logic.
  - **Smart Mapping**: Auto-map controls based on profile tags (e.g., "Cutoff" -> Macro 1).

- **Phase 10 - The "Ghost" Buster (Bi-Directional Sync) (Planned)**

  - **The Problem**: Software faders "lie" when hardware knobs move.
  - **Parameter Fetching**: On snapshot load, ask hardware for current values (CC Request/Dump) to sync UI.
  - **"Soft Takeover" UI (Ghost Faders)**: Shadow faders that show the software value vs hardware value; hardware must cross software value to "latch" and take control.

- **Phase 11 - Visual Signal Flow ("The Pulse") (Planned)**

  - **The Problem**: Invisible MIDI routing makes debugging hard.
  - **Active Cable Animations**: Virtual cables pulse/glow when data flows (e.g. LFO -> Filter).
  - **Mini-Oscilloscopes**: High-contrast scrolling graphs next to macros to visualize automation shapes.

- **Phase 12 - "Stage Mode" (High-Contrast UI) (Planned)**

  - **The Problem**: Studio UI is too complex/small for dark stages.
  - **The "Big Board" View**: Hide all setup/wiring. Show ONLY 8 Global Macros + 16 Snapshot Pads.
  - **Safe Zones & Touch Opt**: Huge buttons, long-press for critical actions (Stop), High-Vis Neon color scheme.

- **Phase 13 - Setlist Manager (Planned)**
  - **The Problem**: Need specific subsets of snapshots for gigs, not entire studio projects.
  - **Song Containers**: Group Snapshots into "Songs".
  - **The Setlist**: Drag-and-drop ordering of Songs.
  - **OXI Sync**: Changing OXI Pattern auto-loads the corresponding "Song".

## Engineering backlog

- **P0 correctness/perf**
  - High-res scheduler for cycle boundaries; decouple UI from MIDI send path.
  - Backpressure/overflow handling in monitor; deterministic snapshot recall.
- **P1 reliability**
  - Versioned project save format; autosave; crash-safe persistence.
- **P1 Maintenance**
  - Continuous QA passes (recent: Dec 2025 pass reduced God Object, verified tests/lints).
- **P2 UX**
  - Onboarding wizard mirroring the workflow (gear + init project + add devices + map + snapshots).

## Deliverables to scaffold soon

- `/midi`: `IMidiBackend`, WinMM provider, Windows MIDI Services provider (feature-flagged).
- `/core`: routing graph, mapping engine, snapshot engine, scheduler.
- `/ui`: setup, routing, mapping, performance, chain, monitor views.
- `/tests`: mapping/snapshot determinism; scheduler boundary cases.

## Immediate tickets to open

- Software modulation (P0): LFO engine (shapes/divisions/depth/phase) and parameter sequencer lanes (probability/density/curves/lock to snapshots) with throughput guardrails. DoD: run 3 LFOs + 2 sequencer lanes concurrently without buffer overrun; per-lane on/off and depth.
- Mixer template (P1): 8-16 channel layout with mute/solo, level/pan, and global send macros; theming hooks for stage/studio skins. DoD: template instantiates from device list; mutes/solos round-trip to mapping; global send macro drives multiple channels.
