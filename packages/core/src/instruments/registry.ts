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

export const INSTRUMENT_PROFILES: InstrumentProfile[] = [
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
    defaultChannel: 1,
    localControlNote: "Set Local SW to OFF (Global Edit) when routing keys through the app.",
    notes: ["Supports CC and NRPN; start with CC for v1."],
    cc: [
      { id: "cutoff", label: "Filter Cutoff", cc: 43 },
      { id: "resonance", label: "Resonance", cc: 44 },
      { id: "vco1_wave", label: "VCO1 Wave", cc: 39 },
      { id: "vco1_shape", label: "VCO1 Shape", cc: 40 },
      { id: "vco2_pitch", label: "VCO2 Pitch", cc: 56 },
      { id: "eg_attack", label: "EG Attack", cc: 16 },
      { id: "eg_decay", label: "EG Decay", cc: 17 }
    ]
  },
  {
    id: "digitakt",
    name: "Elektron Digitakt",
    defaultChannel: 10,
    localControlNote: "Check INT TO MAIN setting depending on your monitoring/Overbridge workflow.",
    cc: [
      { id: "sample_select", label: "Sample Select", cc: 19 },
      { id: "bit_reduction", label: "Bit Reduction", cc: 18 },
      { id: "filter_freq", label: "Filter Frequency", cc: 74 },
      { id: "tune", label: "Tune (Pitch)", cc: 16 },
      { id: "track_level", label: "Track Level", cc: 95 }
    ]
  },
  {
    id: "pro_vs_mini",
    name: "Behringer PRO VS MINI",
    defaultChannel: 1,
    cc: [
      { id: "mod", label: "Modulation / Vector Mix", cc: 1 },
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
    defaultChannel: 1,
    cc: [
      { id: "layer_blend", label: "Layer Blend", cc: 12 },
      { id: "filter_cutoff", label: "Filter Cutoff", cc: 74 },
      { id: "reverb_mix", label: "Reverb Mix", cc: 94 },
      { id: "tape_wow_flutter", label: "Tape Wow/Flutter", cc: 21 },
      { id: "random_dice", label: "Random (Dice)", cc: 102 }
    ]
  }
];

export function getInstrumentProfile(id: string | null | undefined): InstrumentProfile | null {
  if (!id) return null;
  return INSTRUMENT_PROFILES.find((p) => p.id === id) ?? null;
}
