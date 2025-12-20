export type StageScene = {
  id: string;
  name: string;
  notes?: string;
};

export type StageMacroValues = Record<string, number>;

export type StageInstrumentPreset = {
  instrumentId: string;
  name: string;
  values: Record<string, number>;
};

export type StageRigState = {
  scenes: StageScene[];
  macros: StageMacroValues;
  instrumentPresets: Record<string, StageInstrumentPreset>;
};

export type StageState = {
  activeRigId: string;
  rigs: Record<string, StageRigState>;
};

function clampMidi(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(127, Math.max(0, Math.round(value)));
}

function coerceScene(raw: unknown, idx: number): StageScene {
  if (!raw || typeof raw !== "object") {
    return { id: `scene-${idx + 1}`, name: `Scene ${idx + 1}` };
  }
  const rec = raw as Record<string, unknown>;
  const id = typeof rec.id === "string" && rec.id.trim() ? rec.id : `scene-${idx + 1}`;
  const name = typeof rec.name === "string" && rec.name.trim() ? rec.name : `Scene ${idx + 1}`;
  const notes = typeof rec.notes === "string" ? rec.notes : undefined;
  return { id, name, ...(notes ? { notes } : {}) };
}

function coercePreset(raw: unknown): StageInstrumentPreset | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const instrumentId = typeof rec.instrumentId === "string" ? rec.instrumentId : null;
  const name = typeof rec.name === "string" && rec.name.trim() ? rec.name : "Preset";
  const values = (rec.values && typeof rec.values === "object" ? rec.values : {}) as Record<string, unknown>;
  if (!instrumentId) return null;
  const cleaned: Record<string, number> = {};
  Object.entries(values).forEach(([key, val]) => {
    if (typeof val === "number") cleaned[key] = clampMidi(val);
  });
  return { instrumentId, name, values: cleaned };
}

export function defaultStageRigState(): StageRigState {
  return {
    scenes: [],
    macros: {},
    instrumentPresets: {}
  };
}

export function defaultStageState(): StageState {
  return {
    activeRigId: "default",
    rigs: { default: defaultStageRigState() }
  };
}

export function coerceStageState(raw: unknown, fallback: StageState = defaultStageState()): StageState {
  if (!raw || typeof raw !== "object") return fallback;
  const rec = raw as Record<string, unknown>;
  const rigs = rec.rigs && typeof rec.rigs === "object" ? (rec.rigs as Record<string, unknown>) : {};
  const activeRigId = typeof rec.activeRigId === "string" && rec.activeRigId.trim() ? rec.activeRigId : fallback.activeRigId;

  const cleanedRigs: Record<string, StageRigState> = {};
  Object.entries(rigs).forEach(([rigId, rigRaw], rigIdx) => {
    const rigRec = rigRaw && typeof rigRaw === "object" ? (rigRaw as Record<string, unknown>) : {};
    const scenesRaw = Array.isArray(rigRec.scenes) ? rigRec.scenes.slice(0, 64) : [];
    const scenes = scenesRaw.map((s, sceneIdx) => coerceScene(s, sceneIdx));
    const macrosRaw = rigRec.macros && typeof rigRec.macros === "object" ? (rigRec.macros as Record<string, unknown>) : {};
    const macros: StageMacroValues = {};
    Object.entries(macrosRaw).forEach(([key, val]) => {
      if (typeof val === "number") macros[key] = clampMidi(val);
    });

    const presetsRaw = rigRec.instrumentPresets && typeof rigRec.instrumentPresets === "object"
      ? (rigRec.instrumentPresets as Record<string, unknown>)
      : {};
    const instrumentPresets: Record<string, StageInstrumentPreset> = {};
    Object.values(presetsRaw).forEach((presetRaw) => {
      const preset = coercePreset(presetRaw);
      if (preset) instrumentPresets[preset.instrumentId] = preset;
    });

    const rigKey = rigId || `rig-${rigIdx + 1}`;
    cleanedRigs[rigKey] = { scenes, macros, instrumentPresets };
  });

  if (!cleanedRigs[activeRigId]) {
    cleanedRigs[activeRigId] = fallback.rigs[activeRigId] ?? defaultStageRigState();
  }

  return { activeRigId, rigs: Object.keys(cleanedRigs).length ? cleanedRigs : fallback.rigs };
}

export type StageRigExport = {
  rigId: string;
  scenes: StageScene[];
  macros: StageMacroValues;
  instrumentPresets: StageInstrumentPreset[];
};

export function exportStageRig(state: StageState): StageRigExport {
  const rig = state.rigs[state.activeRigId] ?? defaultStageRigState();
  return {
    rigId: state.activeRigId,
    scenes: rig.scenes,
    macros: rig.macros,
    instrumentPresets: Object.values(rig.instrumentPresets)
  };
}

export function importStageRig(state: StageState, preset: StageRigExport): StageState {
  const next = coerceStageState(state);
  const rigId = preset.rigId && preset.rigId.trim() ? preset.rigId : next.activeRigId;
  const scenes = Array.isArray(preset.scenes) ? preset.scenes.map((s, idx) => coerceScene(s, idx)) : [];
  const macros: StageMacroValues = {};
  Object.entries(preset.macros ?? {}).forEach(([key, val]) => {
    if (typeof val === "number") macros[key] = clampMidi(val);
  });
  const instrumentPresets: Record<string, StageInstrumentPreset> = {};
  (preset.instrumentPresets ?? []).forEach((p) => {
    const cleaned = coercePreset(p);
    if (cleaned) instrumentPresets[cleaned.instrumentId] = cleaned;
  });

  return {
    activeRigId: rigId,
    rigs: {
      ...next.rigs,
      [rigId]: {
        scenes,
        macros,
        instrumentPresets
      }
    }
  };
}
