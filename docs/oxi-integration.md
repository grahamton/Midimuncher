# OXI integration

Expected wiring
- OXI One USB to Windows laptop.
- OXI One MIDI OUT to synth chain.

App behavior
- Send MIDI to OXI USB IN.
- Optionally listen to OXI USB OUT for monitoring.
- Never require synths to connect directly to laptop.

OXI configuration checklist
- USB mode: Device.
- USB Thru: enable if you want OXI to forward USB MIDI to DIN/TRS outs; disable if you are creating a feedback loop (double-triggering).
- Optional: enable OXI Split selection to expose ports A/B/C (48 channels total).
- Enable “CC Transport Msgs” if you want Midimuncher to control OXI transport via CC:
  - CC 105: Stop
  - CC 106: Play
  - CC 107: Record (toggle)
- Enable the desired MIDI output destinations per sequencer.
