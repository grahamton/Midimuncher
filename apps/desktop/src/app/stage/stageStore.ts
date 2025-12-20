import { useMemo, useState } from "react";

export type StageScene = { id: string; name: string };
export type StageMacro = { id: string; name: string; value: number };

type StageSnapshot = { activeSceneId: string | null; macroValues: Record<string, number> };
type StageHistoryEntry = { label: string; snapshot: StageSnapshot };

export type StageState = {
  scenes: StageScene[];
  activeSceneId: string | null;
  macros: StageMacro[];
  history: StageHistoryEntry[];
  future: StageHistoryEntry[];
};

const HISTORY_LIMIT = 50;

export function createDefaultStageState(): StageState {
  return {
    scenes: [
      { id: "scene-intro", name: "Intro" },
      { id: "scene-build", name: "Build" },
      { id: "scene-drop", name: "Drop" },
      { id: "scene-outro", name: "Outro" }
    ],
    activeSceneId: "scene-intro",
    macros: [
      { id: "macro-bright", name: "Brightness", value: 0.4 },
      { id: "macro-drive", name: "Drive", value: 0.25 },
      { id: "macro-space", name: "Space", value: 0.5 }
    ],
    history: [],
    future: []
  };
}

function snapshotState(state: StageState): StageSnapshot {
  return {
    activeSceneId: state.activeSceneId,
    macroValues: Object.fromEntries(state.macros.map((macro) => [macro.id, macro.value]))
  };
}

function applySnapshot(state: StageState, snapshot: StageSnapshot): StageState {
  return {
    ...state,
    activeSceneId: snapshot.activeSceneId,
    macros: state.macros.map((macro) => ({
      ...macro,
      value: snapshot.macroValues[macro.id] ?? macro.value
    }))
  };
}

function clampMacro(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

export function useStageStore(initialState?: StageState) {
  const [state, setState] = useState<StageState>(initialState ?? createDefaultStageState());

  const recordChange = (label: string, nextState: StageState) => {
    setState((current) => {
      const prevSnapshot = snapshotState(current);
      const trimmedHistory = [...current.history, { label, snapshot: prevSnapshot }].slice(-HISTORY_LIMIT);
      return {
        ...nextState,
        history: trimmedHistory,
        future: []
      };
    });
  };

  const selectScene = (sceneId: string) => {
    if (state.activeSceneId === sceneId) return;
    recordChange(
      "scene",
      {
        ...state,
        activeSceneId: sceneId
      }
    );
  };

  const setMacroValue = (macroId: string, value: number) => {
    const nextValue = clampMacro(value);
    recordChange(
      "macro",
      {
        ...state,
        macros: state.macros.map((macro) => (macro.id === macroId ? { ...macro, value: nextValue } : macro))
      }
    );
  };

  const undo = () => {
    setState((current) => {
      if (!current.history.length) return current;
      const history = [...current.history];
      const entry = history.pop()!;
      const nextFuture = [{ label: entry.label, snapshot: snapshotState(current) }, ...current.future].slice(
        0,
        HISTORY_LIMIT
      );
      const restored = applySnapshot(current, entry.snapshot);
      return {
        ...restored,
        history,
        future: nextFuture
      };
    });
  };

  const redo = () => {
    setState((current) => {
      if (!current.future.length) return current;
      const [entry, ...rest] = current.future;
      const nextHistory = [...current.history, { label: entry.label, snapshot: snapshotState(current) }].slice(
        -HISTORY_LIMIT
      );
      const restored = applySnapshot(current, entry.snapshot);
      return {
        ...restored,
        history: nextHistory,
        future: rest
      };
    });
  };

  const canUndo = state.history.length > 0;
  const canRedo = state.future.length > 0;

  const api = useMemo(
    () => ({
      state,
      selectScene,
      setMacroValue,
      undo,
      redo,
      canUndo,
      canRedo
    }),
    [state, canUndo, canRedo]
  );

  return api;
}
