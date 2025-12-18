# midi-playground

Windows desktop MIDI playground that uses the OXI One as the hardware hub (USB in to OXI, OXI handles DIN/CV downstream).

Core goals
- Snapshot-style routing and stability
- Generative sequencer rack
- Instrument registry and CC maps
- OXI stays the hardware brain for downstream synths via MIDI out

Quick start
1. Install Node 20+ and enable corepack (`corepack enable`)
2. Install deps: `corepack pnpm install`
3. Dev server: `corepack pnpm -C apps/desktop dev`
4. Smoke test MIDI ports: `corepack pnpm -C apps/desktop smoke:midi`
5. Run the VS Code task `dev:desktop` for the same dev command

Current desktop app highlights
- Backend selector (WinMM active; Windows MIDI Services stubbed for future)
- Device setup (up to 8), port binding, default channel/clock flag
- Routing patchbay with filters, channel force/passthrough, clock thinning, loop guard
- Diagnostics card (sends test note), monitor view, manual ping (note/CC)

Roadmap (see `docs/roadmap.md` for full details)
- Phase 0: MIDI backend abstraction (done)
- Phase 1: Device graph + routing UI (in progress)
- Phase 2: Mapping engine v1 (8 slots per control, MIDI Learn, curves)
- Phase 3: Snapshots (20x20), Jump/Commit cycle-end behavior
- Phase 4: Chain mode (20 chains, 64 steps)
- Phase 5: OXI integration templates/presets
- Phase 6: Optional grid/DAW features

Docs
- docs/product-brief.md
- docs/oxi-integration.md
- docs/routing-model.md
- docs/sequencer-modules.md
- docs/roadmap.md

Agent entrypoints
- AGENT_BRIEF.md
- CODEx_PROMPT.md
