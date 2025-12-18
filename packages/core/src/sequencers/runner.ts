import type { MidiMsg } from "../midi/types";
import type {
  GenerativeSequencer,
  ProposedEvent,
  ProposedEventFilter,
  ProposedEventMutator,
  SequencerChain,
  SequencerChainStep,
  SequencerTarget,
  SequencerTickContext,
  SequencerWorldState
} from "./types";

export const MAX_SEQUENCER_CHAINS = 20;
export const MAX_SEQUENCER_STEPS = 64;

export type SequencerRunnerOptions = {
  chains?: SequencerChain[];
  sequencers?: GenerativeSequencer[];
  worldState?: SequencerWorldState;
  pulsesPerQuarter?: number;
  pulsesPerStep?: number;
  filters?: ProposedEventFilter[];
  mutators?: ProposedEventMutator[];
  defaultTargets?: SequencerTarget[];
};

export type SequencerSend = {
  chainId: string;
  stepId: string;
  event: ProposedEvent;
  portId: string;
  msg: MidiMsg;
  target?: SequencerTarget;
};

export class SequencerRunner {
  private chains: SequencerChain[] = [];
  private sequencers = new Map<string, GenerativeSequencer>();
  private world: SequencerWorldState = defaultWorldState();
  private readonly pulsesPerQuarter: number;
  private readonly pulsesPerStep: number;
  private running = false;
  private pulseCounter = 0;
  private stepCounter = 0;
  private cycleStep = 0;
  private activeChainId: string | null = null;
  private pendingChainId: string | null = null;
  private filters: ProposedEventFilter[];
  private mutators: ProposedEventMutator[];
  private defaultTargets: SequencerTarget[];

  constructor(opts?: SequencerRunnerOptions) {
    this.pulsesPerQuarter = clampPositive(opts?.pulsesPerQuarter ?? 24);
    this.pulsesPerStep = clampPositive(opts?.pulsesPerStep ?? 6); // 16th-note at MIDI clock rate.
    this.filters = opts?.filters ?? [];
    this.mutators = opts?.mutators ?? [];
    this.defaultTargets = opts?.defaultTargets ?? [];
    this.setWorldState(opts?.worldState ?? defaultWorldState());
    this.setSequencers(opts?.sequencers ?? []);
    this.setChains(opts?.chains ?? []);
  }

  setWorldState(world: SequencerWorldState): void {
    this.world = normalizeWorld(world);
  }

  setSequencers(sequencers: GenerativeSequencer[]): void {
    this.sequencers.clear();
    sequencers.forEach((s) => this.sequencers.set(s.id, s));
  }

  setChains(chains: SequencerChain[]): void {
    this.chains = chains.slice(0, MAX_SEQUENCER_CHAINS).map((chain) => ({
      ...chain,
      steps: (chain.steps ?? []).slice(0, MAX_SEQUENCER_STEPS)
    }));
    if (!this.activeChainId && this.chains.length > 0) {
      this.activeChainId = this.chains[0].id;
    }
  }

  queueChain(id: string | null): void {
    if (!id) {
      this.pendingChainId = null;
      this.activeChainId = null;
      return;
    }
    const exists = this.chains.some((c) => c.id === id);
    if (!exists) return;
    this.pendingChainId = id;
    if (!this.running) {
      this.activeChainId = id;
      this.pendingChainId = null;
    }
  }

  start(ts: number): SequencerSend[] {
    this.running = true;
    this.pulseCounter = 0;
    this.stepCounter = 0;
    this.cycleStep = 0;
    if (!this.activeChainId && this.chains[0]) {
      this.activeChainId = this.chains[0].id;
    }
    return this.runStep(ts);
  }

  stop(): void {
    this.running = false;
    this.pulseCounter = 0;
    this.stepCounter = 0;
    this.cycleStep = 0;
  }

  handleClock(ts: number): SequencerSend[] {
    if (!this.running) return [];
    this.pulseCounter += 1;
    if (this.pulseCounter % this.pulsesPerStep !== 0) return [];
    return this.runStep(ts);
  }

  private runStep(ts: number): SequencerSend[] {
    const chain = this.getActiveChain();
    if (!chain) return [];

    const stepsPerCycle = clampCycleLength(chain.cycleLength ?? chain.steps.length ?? 0);
    if (stepsPerCycle <= 0) return [];

    if (this.pendingChainId && this.cycleStep % stepsPerCycle === 0) {
      const next = this.chains.find((c) => c.id === this.pendingChainId);
      if (next) {
        this.activeChainId = next.id;
      }
      this.pendingChainId = null;
    }

    const effectiveChain = this.getActiveChain();
    if (!effectiveChain) return [];

    const stepIndexInCycle = this.cycleStep % stepsPerCycle;
    const step = effectiveChain.steps[stepIndexInCycle];
    const ctx = this.buildContext(ts);
    const sends: SequencerSend[] = [];

    if (step && !step.muted) {
      const proposed = this.collectEvents(step, ctx);
      const filtered = this.applyFilters(proposed, ctx, step.filters ?? []);
      const mutated = filtered.map((evt) => this.applyMutators(evt, ctx, step.mutators ?? []));
      const targets = (step.targets?.length ? step.targets : this.defaultTargets) ?? [];

      for (const event of mutated) {
        for (const target of targets) {
          if (!target.portId) continue;
          const msg = applyTarget(event.msg, target);
          sends.push({
            chainId: effectiveChain.id,
            stepId: step.id,
            event,
            portId: target.portId,
            msg,
            target
          });
        }
      }
    }

    const stepLength = clampPositive(step?.length ?? 1);
    this.stepCounter += stepLength;
    this.cycleStep = (this.cycleStep + stepLength) % stepsPerCycle;
    return sends;
  }

  private collectEvents(step: SequencerChainStep, ctx: SequencerTickContext): ProposedEvent[] {
    const sequencer = step.sequencerId ? this.sequencers.get(step.sequencerId) : null;
    if (sequencer) {
      return sequencer.onTick(ctx).map((evt) => ({ ...evt, ts: ctx.ts }));
    }
    if (step.events?.length) {
      return step.events.map((evt) => ({ ...evt, ts: ctx.ts }));
    }
    return [];
  }

  private applyFilters(events: ProposedEvent[], ctx: SequencerTickContext, stepFilters: ProposedEventFilter[]): ProposedEvent[] {
    return events.filter((evt) => {
      if (!defaultWorldFilter(evt, ctx.world)) return false;
      for (const filter of this.filters) {
        if (!filter(evt, ctx)) return false;
      }
      for (const filter of stepFilters) {
        if (!filter(evt, ctx)) return false;
      }
      return true;
    });
  }

  private applyMutators(event: ProposedEvent, ctx: SequencerTickContext, stepMutators: ProposedEventMutator[]): ProposedEvent {
    let result = applyWorldMutation(event, ctx.world);
    for (const mut of this.mutators) {
      result = mut(result, ctx);
    }
    for (const mut of stepMutators) {
      result = mut(result, ctx);
    }
    return result;
  }

  private buildContext(ts: number): SequencerTickContext {
    const beat = this.stepCounter * 0.25; // 16th-note steps.
    const bar = Math.floor(beat / 4) + 1;
    return {
      ts,
      stepIndex: this.stepCounter,
      beat,
      bar,
      world: this.world
    };
  }

  private getActiveChain(): SequencerChain | null {
    if (!this.activeChainId) return null;
    return this.chains.find((c) => c.id === this.activeChainId) ?? null;
  }
}

function clampPositive(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.round(n));
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 1);
}

function clampCycleLength(n: number): number {
  const positive = clampPositive(n || 0);
  return Math.min(Math.max(positive, 1), MAX_SEQUENCER_STEPS);
}

function defaultWorldState(): SequencerWorldState {
  return {
    energy: 0.5,
    density: 0.5,
    stability: 0.5,
    mutationPressure: 0.25,
    silenceDebt: 0
  };
}

function normalizeWorld(world: SequencerWorldState): SequencerWorldState {
  return {
    energy: clamp01(world.energy),
    density: clamp01(world.density),
    stability: clamp01(world.stability),
    mutationPressure: clamp01(world.mutationPressure),
    silenceDebt: clamp01(world.silenceDebt)
  };
}

function defaultWorldFilter(evt: ProposedEvent, world: SequencerWorldState): boolean {
  const density = clamp01(world.density);
  const energy = clamp01(world.energy);
  const stability = clamp01(world.stability);
  const debt = clamp01(world.silenceDebt);
  const base = clamp01(evt.weight);
  const score = base * (0.4 + 0.6 * energy) * (0.4 + 0.6 * density);
  const stabilityGate = evt.tags.includes("chaos") ? 0.2 : 0.05;
  return score >= stabilityGate + debt * 0.25 && score >= 0.25 * (1 - stability);
}

function applyWorldMutation(evt: ProposedEvent, world: SequencerWorldState): ProposedEvent {
  const energy = clamp01(world.energy);
  const mutation = clamp01(world.mutationPressure);
  const mutatedMsg = mutateMsg(evt.msg, energy, mutation);
  return {
    ...evt,
    msg: mutatedMsg
  };
}

function mutateMsg(msg: MidiMsg, energy: number, mutation: number): MidiMsg {
  switch (msg.t) {
    case "noteOn": {
      const vel = clampMidi(msg.vel * (0.6 + 0.4 * energy + mutation * 0.2));
      return { ...msg, vel };
    }
    case "noteOff": {
      const vel = clampMidi((msg.vel ?? 0) * (0.5 + energy * 0.5));
      return { ...msg, vel };
    }
    case "cc": {
      const val = clampMidi(msg.val * (0.6 + 0.4 * energy));
      return { ...msg, val };
    }
    case "pitchBend": {
      const span = Math.round(msg.val * (0.5 + mutation * 0.5));
      return { ...msg, val: span };
    }
    case "aftertouch": {
      const val = clampMidi(msg.val * (0.6 + mutation * 0.3));
      return { ...msg, val };
    }
    default:
      return msg;
  }
}

function clampMidi(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 127);
}

function applyTarget(msg: MidiMsg, target: SequencerTarget): MidiMsg {
  if (!target.channel || !("ch" in msg)) return msg;
  return { ...msg, ch: clampChannel(target.channel) } as MidiMsg;
}

function clampChannel(ch: number): number {
  if (!Number.isFinite(ch)) return 1;
  return Math.min(Math.max(Math.round(ch), 1), 16);
}
