export type ModulationSourceType = "lfo" | "sequencer" | "euclidean" | "env";

export type LFOShape =
  | "sine"
  | "triangle"
  | "saw"
  | "square"
  | "random"
  | "noise";

export interface LFOConfig {
  id: string;
  type: "lfo";
  enabled: boolean;
  label: string;
  shape: LFOShape;
  rate: number; // in bars (e.g. 0.25 = 1/4 note)
  depth: number; // 0-1
  phase: number; // 0-1 (offset)
  bias: number; // 0-1 (center point adjustment)
  bipolar: boolean; // if true, output is -1 to 1, else 0 to 1
}

export interface SequencerConfig {
  id: string;
  type: "sequencer";
  enabled: boolean;
  label: string;
  steps: number[]; // 0-1 values
  rate: number; // duration of one step in bars (e.g. 0.0625 = 1/16)
  smooth: boolean; // if true, interpolate between steps
}

export interface EuclideanConfig {
  id: string;
  type: "euclidean";
  enabled: boolean;
  label: string;
  steps: number; // sequence length (e.g. 16)
  pulses: number; // number of active hits (e.g. 7)
  rotate: number; // shift offset (e.g. 2)
  rate: number; // duration of one step (e.g. 0.0625 = 1/16)
}

export type ModulationSource = LFOConfig | SequencerConfig | EuclideanConfig;

export interface ModulationTarget {
  sourceId: string;
  targetControlId: string; // The UI control ID this modulates
  amount: number; // Scaling factor (0-1)
}

export interface ModulationScene {
  id: string;
  label: string;
  sources: ModulationSource[];
}

export interface ModulationEngineState {
  sources: ModulationSource[];
  targets: ModulationTarget[];
  scenes: ModulationScene[];
  activeSceneId: string | null;
  targetSceneId: string | null;
  morph: number; // 0-1 crossfade amount
}
