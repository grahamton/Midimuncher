import { SnapshotChain, SnapshotChainState, SnapshotChainStep } from "./types";

export interface ChainRunnerDelegate {
  onTriggerSnapshot: (snapshotId: string) => void;
  onStepChanged: (index: number) => void;
  onEnd: () => void;
}

export class SnapshotChainRunner {
  private state: SnapshotChainState;
  private delegate: ChainRunnerDelegate;

  private totalBars = 0;
  private currentStepStartBar = 0;
  private currentStepIndex = -1;

  constructor(state: SnapshotChainState, delegate: ChainRunnerDelegate) {
    this.state = state;
    this.delegate = delegate;
  }

  setState(state: SnapshotChainState) {
    const wasPlaying = this.state.playing;
    const prevActiveId = this.state.activeChainId;

    this.state = state;

    // Reset if chain changed or stopped
    if (
      state.activeChainId !== prevActiveId ||
      (!state.playing && wasPlaying)
    ) {
      this.stop();
    }
  }

  start(atBar: number) {
    this.totalBars = atBar;
    this.currentStepStartBar = atBar;
    this.currentStepIndex = 0;
    this.triggerCurrentStep();
  }

  stop() {
    this.currentStepIndex = -1;
  }

  tick(totalBars: number) {
    if (!this.state.playing || this.currentStepIndex < 0) return;

    this.totalBars = totalBars;
    const chain = this.getActiveChain();
    if (!chain) return;

    const step = chain.steps[this.currentStepIndex];
    if (!step) return;

    const barsInCurrentStep = totalBars - this.currentStepStartBar;

    if (barsInCurrentStep >= step.bars) {
      this.advance(totalBars);
    }
  }

  private advance(ts: number) {
    const chain = this.getActiveChain();
    if (!chain) return;

    const nextIndex = this.currentStepIndex + 1;

    if (nextIndex >= chain.steps.length) {
      if (chain.loop) {
        this.currentStepIndex = 0;
        this.currentStepStartBar = ts;
        this.triggerCurrentStep();
      } else {
        this.stop();
        this.delegate.onEnd();
      }
    } else {
      this.currentStepIndex = nextIndex;
      this.currentStepStartBar = ts;
      this.triggerCurrentStep();
    }
  }

  private triggerCurrentStep() {
    const chain = this.getActiveChain();
    if (!chain) return;
    const step = chain.steps[this.currentStepIndex];
    if (step && step.snapshotId) {
      this.delegate.onTriggerSnapshot(step.snapshotId);
      this.delegate.onStepChanged(this.currentStepIndex);
    }
  }

  private getActiveChain(): SnapshotChain | null {
    if (!this.state.activeChainId) return null;
    return (
      this.state.chains.find((c) => c.id === this.state.activeChainId) || null
    );
  }
}
