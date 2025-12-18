# Instruments

This repo includes a small built-in instrument registry used to speed up setup and mapping.

Scope and intent
- These are convenience defaults for a personal rig, not exhaustive MIDI implementations.
- CC picks are “jam-friendly” parameters intended for quick mapping and generative modulation.
- Some CC assignments can vary by firmware/model; treat these as starting points and verify on your gear.

## OXI hub configuration (recommended)

- USB mode: Device (OXI powered by the PC and receives USB MIDI).
- MIDI routing:
  - USB Thru: enable if you want OXI to forward USB MIDI to DIN/TRS outputs.
  - If you get double-triggering/feedback loops, disable USB Thru and make sure only one path is routing messages.
- OXI Split: if using the Split box, enable OXI Split selection in OXI MIDI settings so Windows exposes multiple OXI ports (A/B/C). That gives 3 ports × 16 channels = 48 channels.
- Transport CCs (requires “CC Transport Msgs” enabled on OXI):
  - CC 105: Stop
  - CC 106: Play
  - CC 107: Record (toggle)

## Local control notes (recommended when routing keys through the app)

- Arturia MicroFreak: set Local to OFF (Utility → MIDI).
- Korg Monologue: set Local SW to OFF (Global Edit).
- Elektron Digitakt: check INT TO MAIN depending on monitoring/Overbridge workflow.

Troubleshooting reminders
- Digitakt: ensure RECEIVE CC/NRPN is enabled (MIDI Config → Port Config).
- Monologue: ensure Rx CC is ON (Global Edit).

## Curated CC sets

These are defined in `packages/core/src/instruments/registry.ts` and used by the Mapping UI.

Mapping notes
- Mapping v1 supports CC, Program Change, and Note slots.
- MIDI Learn currently targets CC messages (move a knob/fader that sends CC on the selected input).
