export type InstrumentCC = {
  id: string;
  label: string;
  cc: number;
};

export type InstrumentProfile = {
  id: string;
  name: string;
  defaultChannel: number;
  localControlNote?: string;
  notes?: string[];
  cc: InstrumentCC[];
};

import { GENERATED_PROFILES } from "./generatedProfiles";

const BASE_PROFILES: InstrumentProfile[] = [
  {
    id: "oxi_one",
    name: "OXI One (hub)",
    defaultChannel: 1,
    notes: [
      "Enable “CC Transport Msgs” on OXI to use transport CCs.",
      "Enable OXI Split selection to expose ports A/B/C when using the split box.",
      "USB Thru controls whether USB MIDI is forwarded to DIN/TRS outputs."
    ],
    cc: [
      { id: "transport_stop", label: "Transport Stop", cc: 105 },
      { id: "transport_play", label: "Transport Play", cc: 106 },
      { id: "transport_record_toggle", label: "Transport Record (toggle)", cc: 107 }
    ]
  },
  {
    id: "microfreak",
    name: "Arturia MicroFreak",
    defaultChannel: 1,
    localControlNote: "Set Local to OFF (Utility → MIDI) when routing keys through the app.",
    cc: [
      { id: "osc_type", label: "Oscillator Type", cc: 9 },
      { id: "osc_wave", label: "Oscillator Wave", cc: 10 },
      { id: "osc_timbre", label: "Oscillator Timbre", cc: 12 },
      { id: "osc_shape", label: "Oscillator Shape", cc: 13 },
      { id: "spice", label: "Spice", cc: 2 },
      { id: "filter_cutoff", label: "Filter Cutoff", cc: 23 }
    ]
  },
  {
    id: "monologue",
    name: "Korg Monologue",
    defaultChannel: 2,
    localControlNote: "Set Local SW to OFF (Global Edit) when routing keys through the app.",
    notes: ["Supports CC and NRPN; start with CC for v1.", "Some parameter CCs vary by firmware; verify on device."],
    cc: [
      { id: "filter_cutoff", label: "Filter Cutoff", cc: 43 },
      { id: "resonance", label: "Resonance", cc: 44 },
      { id: "vco2_pitch", label: "VCO2 Pitch", cc: 35 },
      { id: "vco1_level", label: "VCO1 Level", cc: 39 },
      { id: "vco2_level", label: "VCO2 Level", cc: 40 },
      { id: "eg_attack", label: "EG Attack", cc: 16 },
      { id: "eg_decay", label: "EG Decay", cc: 17 }
    ]
  },
  {
    id: "digitakt",
    name: "Elektron Digitakt",
    defaultChannel: 10,
    localControlNote: "Check INT TO MAIN setting depending on your monitoring/Overbridge workflow.",
    notes: ["Ensure RECEIVE CC/NRPN is enabled in MIDI Config → Port Config."],
    cc: [
      { id: "sample_select", label: "Sample Select", cc: 19 },
      { id: "bit_reduction", label: "Bit Reduction", cc: 18 },
      { id: "filter_freq", label: "Filter Frequency", cc: 74 },
      { id: "delay_send", label: "Delay Send", cc: 82 },
      { id: "reverb_send", label: "Reverb Send", cc: 83 },
      { id: "tune", label: "Tune (Pitch)", cc: 16 },
      { id: "track_level", label: "Track Level", cc: 95 }
    ]
  },
  {
    id: "pro_vs_mini",
    name: "Behringer PRO VS MINI",
    defaultChannel: 3,
    cc: [
      { id: "mod", label: "Modulation / Vector Mix", cc: 1 },
      { id: "filter_env_decay", label: "Filter Env Decay", cc: 13 },
      { id: "filter_env_sustain", label: "Filter Env Sustain", cc: 14 },
      { id: "filter_cutoff", label: "Filter Cutoff", cc: 74 },
      { id: "wave_a", label: "Wave Select A", cc: 24 },
      { id: "wave_b", label: "Wave Select B", cc: 25 },
      { id: "wave_c", label: "Wave Select C", cc: 26 },
      { id: "wave_d", label: "Wave Select D", cc: 27 },
      { id: "chorus_depth", label: "Chorus Depth", cc: 91 }
    ]
  },
  {
    id: "liven_ambient0",
    name: "Sonicware Liven Ambient Ø",
    defaultChannel: 4,
    notes: ["Some CC assignments may vary; verify on device."],
    cc: [
      { id: "layer_blend", label: "Layer Blend", cc: 12 },
      { id: "tape_wow_flutter", label: "Tape FX (Wow/Flutter)", cc: 21 },
      { id: "reverb_mix", label: "Reverb Mix", cc: 25 },
      { id: "filter_cutoff", label: "Filter Cutoff", cc: 74 },
      { id: "random_dice", label: "Random (Dice)", cc: 102 }
    ]
  }
];

export const INSTRUMENT_PROFILES: InstrumentProfile[] = [
  ...BASE_PROFILES,
  ...GENERATED_PROFILES.filter((p) => !BASE_PROFILES.some((base) => base.id === p.id))
];

export function getInstrumentProfile(id: string | null | undefined): InstrumentProfile | null {
  if (!id) return null;
  return INSTRUMENT_PROFILES.find((p) => p.id === id) ?? null;
}
