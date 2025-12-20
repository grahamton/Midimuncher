import { stageColors, stageStyles } from "./styles";

export type StageSceneGridProps = {
  snapshots: string[];
  activeSnapshot: string | null;
  transitionStatus: "idle" | "armed" | "executing";
  transitionScene: string | null;
  onArmScene: (scene: string) => void;
  onDropScene: (scene: string) => void;
};

export function StageSceneGrid({
  snapshots,
  activeSnapshot,
  transitionStatus,
  transitionScene,
  onArmScene,
  onDropScene
}: StageSceneGridProps) {
  return (
    <div style={stageStyles.grid}>
      {snapshots.map((scene, idx) => {
        const color = stageColors[idx % stageColors.length];
        const isActive = activeSnapshot === scene;
        const isArmed = transitionStatus === "armed" && transitionScene === scene;
        const isExecuting = transitionStatus === "executing" && transitionScene === scene;
        return (
          <div
            key={scene}
            style={{
              ...stageStyles.card,
              borderColor: color,
              background: isActive ? `${color}22` : "#0b1220",
              boxShadow: isExecuting ? `0 0 18px ${color}88` : "none"
            }}
          >
            <div style={stageStyles.cardTitle}>{scene}</div>
            <div style={{ color, fontSize: 12 }}>{isActive ? "Active" : isArmed ? "Armed" : "Ready"}</div>
            <div style={stageStyles.cardActions}>
              <button
                onClick={() => onArmScene(scene)}
                style={{ ...stageStyles.cardActionBtn, borderColor: "#1f2937" }}
                disabled={isExecuting}
              >
                Launch
              </button>
              <button
                onClick={() => onDropScene(scene)}
                style={{ ...stageStyles.cardActionBtn, borderColor: color }}
                disabled={isExecuting}
                title="Commit at next cycle boundary (Drop)."
              >
                Drop
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
