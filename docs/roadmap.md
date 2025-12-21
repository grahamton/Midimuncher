# Roadmap

Goal: Build a snapshot-driven performance controller in software, using the OXI One as the hardware router (app + OXI over USB MIDI, OXI routes DIN/TRS downstream). Platform: Windows with Electron/React front-end and dual MIDI backends (WinMM fallback, Windows MIDI Services when available).

Current status (Dec 2025): Surfaces board and control primitives are live and emit mapped MIDI; mapping page has per-slot editing and a stub assignment wizard; snapshot scheduler (queueing + cycle-aware commit + burst limiting) is live; Stage page has Launch (quantized) and Drop (commit + optional macro ramp) as a bundled transition. A new Stage/Performance layout (Neuzeit Drop + Condukt-inspired) is being iterated to unify scene launch, transition “Drop” fader, and rig-aware instrument strips for the OXI-driven setup (Monologue, MicroFreak, Pro VS Mini, Digitakt).

Status vs goals: Phase 0–2 shipped; Phase 3 snapshot scheduling/burst limiting + queueing are live, with morphing and assignment-flow improvements still pending; Phase 4 performance surfaces are moving with the Stage view prototype and Drop bundle work; Phase 7 OXI transport consumption is queued to align drops to clock/transport.

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

- **Phase 3 - Snapshots, Jump, Commit**
  - Snapshot = per-device CC state + optional one-shots; stores BPM and metadata.
  - 20 banks A- 20 snapshots per project.
  - Jump (fade, incl. zero), Commit (cycle-end, no fade); global cycle length 1-32 bars; queue/flush behavior.
  - Snapshot scheduling runs in the main process and uses OXI clock by default (selectable), with internal alignment when not clocked.
  - Burst limiting on recall: 5-10ms spacing between outgoing messages to avoid choking OXI/synth buffers; optional per-parameter slew to prevent zippering on fast recalls.
  - Snapshot pads grid for live recall (big touch targets) with color labels per pad.
  - Snapshot morphing crossfader: interpolate between two snapshots with per-parameter curves; support staged fades (e.g., slow filters, fast mutes).
  - Assign flow to bind multiple controls to a snapshot pad or morph lane in one pass.

- **Phase 4 - Performance surfaces (Condukt-inspired)**
  - Board/page system: Sound Design Lab (dense editing), Performance surface (macro faders/XY), Mix desk (levels/pan/mutes); one-tap page switching.
  - Stage view (Neuzeit Drop + Condukt mashup): scene launcher with quantized Launch and a bundled Drop transition (commit-at-cycle-end + optional macro ramp), transition progress fader, and rig-aware instrument strips for OXI lanes 1–4 (Monologue, MicroFreak, Pro VS Mini, Digitakt).
  - Resizable controls (fader/knob/crossfader/button/step grid) with orientation presets (1x2, 1x3, 2x1, 3x1) and multi-touch; includes value taper and coarse/fine drag.
  - Macro faders driving multiple targets with per-target min/max, curve type (linear/inverse/exponential/log), and optional channel overrides; bi-directional feedback rendering.
  - Instrument-aware picker: browse/search CC/NRPN by name/category; quick-add sets for envelopes, filters, LFOs, sequencer params; assignment wizard for rapid multi-bind and bulk color tagging.
  - Control theming: dark "stage" skin and light "studio" skin; per-control color tags to mirror hardware groupings.
  - Mixer template for 8-16 channels with mute/solo, level/pan, and "global send" macros (e.g., one fader lifts all reverb sends).

- **Phase 5 - Software modulation + generative**
  - Software LFO engine: unlimited tempo-synced LFOs (sine/saw/square/random/S+H) assignable to any mapped parameter; per-LFO depth, phase, and polyrhythmic divisions.
  - Parameter sequencer lanes: 16-32 step grids that emit CC/NRPN values; supports probability, density, velocity scaling, per-step curves, and lock steps to snapshots.
  - Euclidean pattern generator for gates/notes and CC pulses; randomize/seed tools with per-lane dice and undo.
  - Crossfader/XY macros for morphing between modulation scenes (e.g., LFO set A -> set B); scene store/recall slots.
  - Safety rails: rate limiting and smoothing to avoid overloading DIN/TRS endpoints when multiple LFOs/sequencers run; per-engine CPU/throughput guardrails.

- **Phase 6 - Chain mode**
  - Up to 20 chains, 64 steps each; step/auto-advance quantized to cycle boundaries.
  - UI: chain editor (list of steps), transport controls.

- **Phase 7 - OXI integration**
  - OXI configuration surfaced in docs and UI hints:
    - USB mode: Device
    - OXI Split (A/B/C ports) to expand available channels
    - Thru expectations (avoid feedback loops)
  - Transport control via OXI CC transport messages (requires CC Transport Msgs enabled on OXI):
    - CC 105: Stop
    - CC 106: Play
    - CC 107: Record (toggle)
  - OXI-aware templates and routing presets; port labeling/wizard.
  - OXI sanity test (mode/firmware check, round-trip messages).
  - Optional: consume OXI transport/clock to align cycles.

- **Phase 8 - Grid/DAW (optional)**
  - Grid view for notes/clip launch; Ableton/Bitwig templates after core perf features are solid.

## Engineering backlog

- **P0 correctness/perf**
  - High-res scheduler for cycle boundaries; decouple UI from MIDI send path.
  - Backpressure/overflow handling in monitor; deterministic snapshot recall.
- **P1 reliability**
  - Versioned project save format; autosave; crash-safe persistence.
- **P2 UX**
  - Onboarding wizard mirroring the workflow (gear + init project + add devices + map + snapshots).

## Deliverables to scaffold soon

- `/midi`: `IMidiBackend`, WinMM provider, Windows MIDI Services provider (feature-flagged).
- `/core`: routing graph, mapping engine, snapshot engine, scheduler.
- `/ui`: setup, routing, mapping, performance, chain, monitor views.
- `/tests`: mapping/snapshot determinism; scheduler boundary cases.

## Immediate tickets to open

- UI primitives (P0): fader/knob/crossfader/button/step grid with resize/orientation presets, coarse/fine drag, and bi-directional value feedback. DoD: reusable components, unit snapshot of value rendering, event plumbing to mapping engine stub.
- Assignment wizard (P0): instrument-aware picker (search/browse CC/NRPN), bulk bind to macros/pads with per-target curves and color tags. DoD: can multi-bind 3+ targets in one flow, writes bindings to mapping engine, preserves tags.
- Snapshot morphing (P0): pads grid + crossfader with staged per-parameter curves; per-parameter slew config; rate-limit burst sends. DoD: morph between two saved states with per-parameter curves; sends rate-limited; visual feedback of current morph position.
- Stage mode (P0): Stage page with scene launcher, Drop/transition fader, rig-aware instrument strips for OXI lanes 1–4, and global macros that fan out CCs across multiple synths. DoD: one-to-many macro routing works end-to-end, scene launches can quantize to clock/transport, UI reflects rig device health.
- Note: Stage mode, morphing, and macro ramp controls are still prototypes; they should be marked as experimental in the UI until they're fully tested so users understand the status.
- Software modulation (P0): LFO engine (shapes/divisions/depth/phase) and parameter sequencer lanes (probability/density/curves/lock to snapshots) with throughput guardrails. DoD: run 3 LFOs + 2 sequencer lanes concurrently without buffer overrun; per-lane on/off and depth.
- Mixer template (P1): 8-16 channel layout with mute/solo, level/pan, and global send macros; theming hooks for stage/studio skins. DoD: template instantiates from device list; mutes/solos round-trip to mapping; global send macro drives multiple channels.
