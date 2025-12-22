import { SnapshotState } from "../snapshots/types";

export type SnapshotChainStep = {
  id: string;
  snapshotId: string | null;
  snapshotName: string; // Helpful for UI if IDs are missing
  bars: number;
};

export type SnapshotChain = {
  id: string;
  name: string;
  steps: SnapshotChainStep[];
  loop: boolean;
};

export type SnapshotChainState = {
  chains: SnapshotChain[];
  activeChainId: string | null;
  playing: boolean;
  currentIndex: number;
};
