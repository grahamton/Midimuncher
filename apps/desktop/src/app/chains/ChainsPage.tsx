import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import type { ChainStep, SnapshotQuantize } from "../../../shared/projectTypes";
import { Panel, Page, PageHeader } from "../components/layout";
import { styles } from "../styles";

export type ChainsPageProps = {
  chainSteps: ChainStep[];
  playing: boolean;
  currentIndex: number;
  quantize: SnapshotQuantize;
  onStart: () => void;
  onStop: () => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onMoveStep: (from: number, to: number) => void;
  onUpdateBars: (index: number, bars: number) => void;
};

export function ChainsPage({
  chainSteps,
  playing,
  currentIndex,
  quantize,
  onStart,
  onStop,
  onAddStep,
  onRemoveStep,
  onMoveStep,
  onUpdateBars,
}: ChainsPageProps) {
  return (
    <Page>
      <PageHeader
        title="Performance Chains"
        right={
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={onAddStep}>
              Add Step
            </button>
            <button style={styles.btnSecondary} onClick={onStart} disabled={playing}>
              Play
            </button>
            <button style={styles.btnSecondary} onClick={onStop} disabled={!playing}>
              Stop
            </button>
          </div>
        }
      />
      <Panel title="Sequence Timeline">
        <div style={{ display: "flex", gap: "12px", flexDirection: "column" }}>
          <div style={styles.card}>
            <div style={{ ...styles.row, justifyContent: "space-between" }}>
              <strong>Main Chain</strong>
              <span style={styles.muted}>
                Quantize:{" "}
                {quantize === "immediate" ? "Immediate" : quantize === "bar4" ? "4 bars" : "1 bar"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "6px",
              }}
            >
              {chainSteps.length === 0 ? (
                <span style={styles.muted}>No steps yet.</span>
              ) : (
                chainSteps.map((step, idx) => (
                  <div
                    key={`${step.snapshot}-${idx}`}
                    style={{
                      ...styles.pillRow,
                      backgroundColor:
                        idx === currentIndex && playing ? "#103553" : "#1f2a33",
                      border:
                        idx === currentIndex && playing ? "1px solid #19b0d7" : "1px solid #29313a",
                    }}
                  >
                    <span style={styles.valueText}>{step.snapshot}</span>
                    <div style={styles.row}>
                      <span style={styles.muted}>Bars</span>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        min={1}
                        max={64}
                        value={step.bars}
                        onChange={(e) =>
                          onUpdateBars(
                            idx,
                            Math.max(1, Math.min(64, Number(e.target.value) || 1))
                          )
                        }
                      />
                    </div>
                    <div style={styles.row}>
                      <button
                        style={styles.btnTiny}
                        onClick={() => onMoveStep(idx, idx - 1)}
                        disabled={idx === 0}
                      >
                        <ChevronLeft size={12} />
                      </button>
                      <button
                        style={styles.btnTiny}
                        onClick={() => onMoveStep(idx, idx + 1)}
                        disabled={idx === chainSteps.length - 1}
                      >
                        <ChevronRight size={12} />
                      </button>
                      <button style={styles.btnTiny} onClick={() => onRemoveStep(idx)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
              <button style={styles.btnSecondary} onClick={onAddStep}>
                + Step
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </Page>
  );
}
