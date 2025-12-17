import type { MidiEvent, MidiMsg } from "../midi/types";

export type ProposedEvent = {
  ts: number;
  weight: number;
  tags: string[];
  msg: MidiMsg;
};

export type SequencerTickContext = {
  ts: number;
  stepIndex: number;
  beat: number;
  bar: number;
  world: {
    energy: number;
    density: number;
    stability: number;
    mutationPressure: number;
    silenceDebt: number;
  };
};

export interface GenerativeSequencer {
  id: string;
  onMidi?: (e: MidiEvent) => void;
  onTick: (ctx: SequencerTickContext) => ProposedEvent[];
}
