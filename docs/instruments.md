# Instruments

This repo includes a small built-in instrument registry used to speed up setup and mapping.

Scope and intent
- These are convenience defaults for a personal rig, not exhaustive MIDI implementations.
- CC picks are “jam-friendly” parameters intended for quick mapping and generative modulation.

## OXI routing notes

- If you enable OXI Split in OXI MIDI settings, Windows may expose multiple OXI ports (A/B/C). Bind devices to the desired OXI output port to access more channels.
- If you hear double-triggering or loops, disable OXI USB Thru so Midimuncher is the only router.

## Local control notes (recommended when routing keys through the app)

- Arturia MicroFreak: set Local to OFF (Utility → MIDI).
- Korg Monologue: set Local SW to OFF (Global Edit).
- Elektron Digitakt: check INT TO MAIN depending on your monitoring/Overbridge workflow.

## Curated CC sets

These are currently defined in `packages/core/src/instruments/registry.ts`.

- Arturia MicroFreak: osc type/wave/timbre/shape, spice, filter cutoff.
- Korg Monologue: cutoff/resonance, VCO wave/shape, VCO2 pitch, EG attack/decay.
- Elektron Digitakt: sample select, bit reduction, filter freq, tune, track level.
- Behringer PRO VS MINI: vector/mod, filter cutoff, wave A–D select, chorus depth.
- Sonicware Liven Ambient Ø: layer blend, filter cutoff, reverb mix, tape wow/flutter, random/dice.
