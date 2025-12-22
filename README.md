# midi-playground

![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)

Windows desktop MIDI playground that uses the OXI One as the hardware hub (USB in to OXI, OXI handles DIN/TRS downstream).

Core goals

- Snapshot-style routing and stability
- Generative sequencer rack
- Instrument registry and CC maps
- OXI stays the hardware brain for downstream synths via MIDI out

Quick start

1. Install Node 20+ and enable corepack (`corepack enable`)
2. Install deps: `corepack pnpm install`
3. Dev server: `corepack pnpm -C apps/desktop dev`
   - Or run the VS Code task `run:desktop-app` / `dev:desktop`
4. Smoke test MIDI ports: `corepack pnpm -C apps/desktop smoke:midi`
5. Smoke test persistence: `corepack pnpm -C apps/desktop smoke:persist`
6. Smoke test mapping: `corepack pnpm -C apps/desktop smoke:mapping`
7. User guide: see `docs/how-to.md` for the current flow (setup, mapping, snapshots, chains, clock, monitor)

Current desktop app highlights

- Backend selector (WinMM active; Windows MIDI Services stubbed for future)
- Device setup (up to 8), port binding, default channel/clock flag, OXI quick-setup + port labeling
- Routing patchbay with filters, channel force/passthrough, clock thinning, loop guard
- Mapping v1: virtual controls (8 slots) with curves/ranges + MIDI Learn (CC), Program Change + Note slots; inline slot editor now has enable toggles, device pickers, curve/min/max, and a macro multi-bind shortcut
- Surfaces board: live fader/knob/button cards wired to mapping emit; Surfaces Lab demos macro multi-bind with rate limiting and per-target curves
- Snapshots: 20x20 banks, Jump/Commit at cycle boundaries, burst-limited recall, queue + flush, clock source selection (OXI default) and cycle bars (1–32)
- Stage: scene launcher with Launch (quantized) and Drop (commit + optional macro ramp); rig strips map explicitly to OXI lanes 1–4 via per-device lane numbers (no MIDI OUT required on instruments)
- Persistence: saved project state (devices/routes/mapping) under Electron userData
- Diagnostics card (sends test note), monitor view, manual ping (note/CC), outgoing messages visible in Monitor

## Latest updates (Dec 2025)

- **Major Refactor**: Extracted core application logic and state management from `App.tsx` into a dedicated `useAppController` hook, significantly improving code maintainability and separating concerns.
- **Phase 6 (Multi-Chain Mode)**: Performance timeline with up to 20 chains, 64 steps each, bar-accurate auto-advance, and renaming.
- **Phase 7 (OXI Integration)**: Transport remote control (CC 105-107), "Quick Setup" routing presets for Split mode, and hardware best-practices guidance.
- Added Surfaces board and control primitives (fader/knob/crossfader/pads/step grid) with coarse/fine drag and bi-directional feedback
- Mapping page: slot editor now supports device selection, per-slot enable, curve/min/max editing; macro multi-bind button; assignment wizard stub with multi-select CCs, curve/range/start slot/device, and color highlighting
- Snapshot scheduler moved to main process (queueing + cycle-aware commit); Stage Drop supports a bundled macro ramp

Roadmap (see `docs/roadmap.md` for full details)

- Phase 0: MIDI backend abstraction (done)
- Phase 1: Device graph + routing UI (done)
- Phase 2: Mapping engine v1 (done)
- Phase 3: Snapshots (done)
- Phase 4: Performance surfaces (done)
- Phase 5: Software modulation + generative (in-progress)
- Phase 6: Chain mode (done)
- Phase 7: OXI integration templates/presets (done)
- Phase 8: Optional grid/DAW features

Docs

- docs/product-brief.md
- docs/oxi-integration.md
- docs/routing-model.md
- docs/sequencer-modules.md
- docs/roadmap.md
- docs/instruments.md
- docs/how-to.md
- docs/midi_cc_implementation_guide - CC Map.csv
- docs/engineering.md

Agent entrypoints

- docs/agent-flow.md

## License

This project is licensed under the GNU Affero General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
