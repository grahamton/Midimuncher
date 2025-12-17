# Agent brief

You are implementing a Windows desktop MIDI playground.

Hard constraints
- Desktop first. Windows target.
- Electron main process owns MIDI IO, routing, clock, scheduling.
- Renderer is UI only.
- OXI One is the hub to downstream synths via its MIDI OUT.

Definition of done for first milestone
- App detects OXI MIDI ports.
- App can send a test note and CC to OXI.
- UI shows incoming MIDI activity.
- Routing graph supports one route with channel remap.

Do not implement
- Audio.
- Preset system.
- Cloud sync.
