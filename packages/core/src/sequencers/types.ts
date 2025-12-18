import type { MidiEvent, MidiMsg } from "../midi/types";

export type ProposedEvent = {
  ts: number;
  weight: number;
  tags: string[];
  msg: MidiMsg;
};

export type SequencerWorldState = {
  energy: number;
  density: number;
  stability: number;
  mutationPressure: number;
  silenceDebt: number;
};

export type SequencerTickContext = {
  ts: number;
  stepIndex: number;
  beat: number;
  bar: number;
  world: SequencerWorldState;
};

export interface GenerativeSequencer {
  id: string;
  onMidi?: (e: MidiEvent) => void;
  onTick: (ctx: SequencerTickContext) => ProposedEvent[];
}

export type ProposedEventFilter = (event: ProposedEvent, ctx: SequencerTickContext) => boolean;

export type ProposedEventMutator = (event: ProposedEvent, ctx: SequencerTickContext) => ProposedEvent;

export type SequencerTarget = {
  portId: string | null;
  channel?: number | null;
  gateMs?: number;
};

export type SequencerChainStep = {
  id: string;
  label?: string;
  length?: number;
  muted?: boolean;
  sequencerId?: string | null;
  events?: ProposedEvent[];
  filters?: ProposedEventFilter[];
  mutators?: ProposedEventMutator[];
  targets?: SequencerTarget[];
};

export type SequencerChain = {
  id: string;
  name: string;
  steps: SequencerChainStep[];
  cycleLength?: number;
};
