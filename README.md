# midi-playground

Windows desktop MIDI playground that connects to OXI One over USB MIDI.

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

Docs
- docs/product-brief.md
- docs/oxi-integration.md
- docs/routing-model.md
- docs/sequencer-modules.md

Agent entrypoints
- AGENT_BRIEF.md
- CODEx_PROMPT.md
