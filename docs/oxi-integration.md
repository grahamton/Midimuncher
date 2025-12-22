# OXI Integration

## Overview

This configuration treats the OXI One as the hardware hub and physical sequencer, while Midimuncher acts as the global modulation and state management brain.

- **Wiring:** OXI One USB to Windows laptop. OXI One MIDI TRS/BLE to synth chain.
- **Flow:** Midimuncher sends macros/LFOs to OXI USB IN. OXI forwards data to synths via MIDI Thru or processes it via the Mod Matrix.

## OXI Configuration Checklist

### 1. System & Connection

- **USB Mode:** Set to **Device** [1].
  - _Troubleshooting:_ If you hear ground loop noise from the laptop connection, switch to **Device Self Powered** mode [2]. This requires re-plugging the USB cable to take effect.
- **Bluetooth:** Set to **ON** if using wireless MIDI as an alternative to USB [3].

### 2. MIDI Routing

- **USB Thru:**
  - **Enable** if you want OXI to act as a pure interface, forwarding Midimuncher notes directly to the synth chain [4].
  - **Disable** if OXI is generating notes and Midimuncher is only sending control data (prevents double-triggering).
- **OXI Split:** Enable "OXI Split selection" in Config if using the splitter accessory to expose Ports B and C (48 channels total) [5].

### 3. "Same Brain" Transport Sync (Bidirectional)

To ensure the app and hardware start/stop together, configure **CC Transport Msgs** [6].

1. Go to `Config > MIDI`.
2. Set **CC Transport Msgs transmit Channel** to a specific channel (e.g., Ch 16).
3. Ensure Midimuncher is listening on this channel.
4. Mapping references:
   - **Stop:** CC 105
   - **Play:** CC 106
   - **Rec:** CC 107 (Toggle)
5. **Behavior:** Pressing Play on OXI sends CC 106 to Midimuncher. Pressing Play in Midimuncher sends CC 106 to OXI.

### 4. Remote Control (Midimuncher controlling OXI)

Use the **External Mod Matrix** to map Midimuncher LFOs/Macros to OXI internal parameters (e.g., Scale, Probability, Mute states) [7].

1. Double-tap the **MOD** button on OXI to enter External Mod Matrix.
2. Select an empty slot.
3. **Source:** Select **MIDI CC** and define the CC# Midimuncher is sending (e.g., CC 20).
4. **Destination:** Select an **INT DEST** (Internal Destination).
   - Examples: _Seq Scale_ [8], _Seq Root_ [8], _Global Tempo_ [9], _Random Trig Probability_ [10].
5. **Amount:** Dial in how much the Midimuncher macro affects the OXI parameter.

## App Configuration (Midimuncher)

- **Rig Setup:** Add "OXI One" as a device. Point to the OXI USB MIDI port.
- **Clock:** Send Sync to OXI.
  - _OXI Setting:_ Set OXI Sync Source to **USB** or **Auto** [11].
- **Lanes:** Map Midimuncher Sequencer Lanes to OXI **Multitrack** mode (Tracks 1–8) for drum/trigger integration [12].
