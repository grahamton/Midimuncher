# Agent brief

You are implementing a Windows desktop MIDI playground.

Hard constraints
- Desktop first. Windows target.
- Electron main process owns MIDI IO, routing, clock, scheduling.
- Renderer is UI only.
- OXI One is the hub to downstream synths via its MIDI OUT.

Baseline definition of done (shipped)
- App detects MIDI ports (OXI included) and can open in/out.
- App can send test note/CC/program to selected output.
- UI shows incoming MIDI activity + monitor.
- Routing patchbay supports filters + channel remap/passthrough.
- Main-process snapshot scheduler supports queueing, Jump/Commit, burst limiting.
- Stage page supports Launch (quantized) and Drop (commit + optional macro ramp bundle).

Next milestone focus (Phase 4)
- Stage performance layout: rig-aware instrument strips + transition progress control.
- Snapshot morphing + optional per-parameter slew/smoothing.
- Assignment flow: faster bulk bind + tagging for performance macros.

Do not implement
- Audio.
- Preset system.
- Cloud sync.
