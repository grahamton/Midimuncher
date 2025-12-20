import {
  coerceStageState,
  defaultStageRigState,
  defaultStageState,
  exportStageRig,
  importStageRig,
  type StageInstrumentPreset,
  type StageRigExport,
  type StageScene,
  type StageState
} from "../../shared/stageTypes";

function ensureRig(state: StageState, rigId?: string): StageState {
  const targetRigId = rigId && rigId.trim() ? rigId : state.activeRigId;
  if (state.rigs[targetRigId]) return state;
  return {
    ...state,
    rigs: {
      ...state.rigs,
      [targetRigId]: defaultStageRigState()
    }
  };
}

export function setActiveRig(state: StageState, rigId: string): StageState {
  const next = ensureRig(state, rigId);
  return { ...next, activeRigId: rigId.trim() || next.activeRigId };
}

export function addScene(state: StageState, name?: string): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  const scene: StageScene = {
    id: `scene-${Date.now().toString(36)}`,
    name: name?.trim() || `Scene ${rig.scenes.length + 1}`
  };
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        scenes: [...rig.scenes, scene]
      }
    }
  };
}

export function updateScene(state: StageState, sceneId: string, partial: Partial<StageScene>): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        scenes: rig.scenes.map((scene) => (scene.id === sceneId ? { ...scene, ...partial } : scene))
      }
    }
  };
}

export function removeScene(state: StageState, sceneId: string): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        scenes: rig.scenes.filter((scene) => scene.id !== sceneId)
      }
    }
  };
}

export function setMacro(state: StageState, macroId: string, value: number): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  const nextValue = Math.min(127, Math.max(0, Math.round(value)));
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        macros: {
          ...rig.macros,
          [macroId]: nextValue
        }
      }
    }
  };
}

export function upsertInstrumentPreset(state: StageState, preset: StageInstrumentPreset): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        instrumentPresets: {
          ...rig.instrumentPresets,
          [preset.instrumentId]: preset
        }
      }
    }
  };
}

export function removeInstrumentPreset(state: StageState, instrumentId: string): StageState {
  const prepared = ensureRig(state);
  const rig = prepared.rigs[prepared.activeRigId] ?? defaultStageRigState();
  const { [instrumentId]: _removed, ...rest } = rig.instrumentPresets;
  return {
    ...prepared,
    rigs: {
      ...prepared.rigs,
      [prepared.activeRigId]: {
        ...rig,
        instrumentPresets: rest
      }
    }
  };
}

export function importRigFromFile(state: StageState, payload: StageRigExport): StageState {
  return importStageRig(state, payload);
}

export function exportActiveRig(state: StageState): StageRigExport {
  return exportStageRig(state);
}

export function coerceStageSlice(raw: unknown): StageState {
  return coerceStageState(raw, defaultStageState());
}

export function resetStageSlice(): StageState {
  return defaultStageState();
}
