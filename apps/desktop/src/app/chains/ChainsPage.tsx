import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import {
  SnapshotChainState,
  SnapshotsState,
} from "../../../shared/projectTypes";
import { Panel, Page, PageHeader } from "../components/layout";
import { styles } from "../styles";

export type ChainsPageProps = {
  state: SnapshotChainState;
  onChange: (state: SnapshotChainState) => void;
  snapshots: SnapshotsState;
};

export function ChainsPage({ state, onChange, snapshots }: ChainsPageProps) {
  const activeChain =
    state.chains.find((c) => c.id === state.activeChainId) || state.chains[0];

  const handleAddChain = () => {
    if (state.chains.length >= 20) return;
    const newId = `chain-${Date.now()}`;
    const newChain = {
      id: newId,
      name: `Chain ${state.chains.length + 1}`,
      steps: [],
      loop: true,
    };
    onChange({
      ...state,
      chains: [...state.chains, newChain],
      activeChainId: newId,
    });
  };

  const handleUpdateActiveChain = (updater: (c: any) => any) => {
    if (!activeChain) return;
    const nextChains = state.chains.map((c) =>
      c.id === activeChain.id ? updater(c) : c
    );
    onChange({ ...state, chains: nextChains });
  };

  const handleAddStep = () => {
    if (activeChain && activeChain.steps.length >= 64) return;
    handleUpdateActiveChain((c) => ({
      ...c,
      steps: [
        ...c.steps,
        {
          id: `step-${Date.now()}`,
          snapshotId: null,
          snapshotName: "Slot",
          bars: 4,
        },
      ],
    }));
  };

  return (
    <Page>
      <PageHeader
        title="Performance Chains"
        subtitle="Create automated sequences of snapshot changes for live performances"
        right={
          <div style={styles.row}>
            <button
              style={styles.btnSecondary}
              onClick={() => onChange({ ...state, playing: !state.playing })}
            >
              {state.playing ? "Stop" : "Play"}
            </button>
          </div>
        }
      />
      <div
        style={{ display: "flex", gap: "20px", flex: 1, overflow: "hidden" }}
      >
        {/* Sidebar: Chain List */}
        <div style={{ width: "240px", flexShrink: 0 }}>
          <Panel title="Chains">
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {state.chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() =>
                    onChange({ ...state, activeChainId: chain.id })
                  }
                  style={{
                    ...styles.btnSecondary,
                    justifyContent: "flex-start",
                    backgroundColor:
                      chain.id === state.activeChainId
                        ? "#103553"
                        : "transparent",
                    border:
                      chain.id === state.activeChainId
                        ? "1px solid #19b0d7"
                        : "1px solid #29313a",
                  }}
                >
                  {chain.name}
                </button>
              ))}
              <button
                style={{
                  ...styles.btnSecondary,
                  marginTop: "8px",
                  opacity: state.chains.length >= 20 ? 0.5 : 1,
                  cursor: state.chains.length >= 20 ? "not-allowed" : "pointer",
                }}
                disabled={state.chains.length >= 20}
                onClick={handleAddChain}
              >
                {state.chains.length >= 20 ? "Limit Reached" : "+ Add Chain"}
              </button>
            </div>
          </Panel>

          {/* Main: Step Editor */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            <Panel
              title={
                <div style={styles.row}>
                  <input
                    style={{
                      ...styles.input,
                      width: "200px",
                      fontWeight: "bold",
                    }}
                    value={activeChain?.name || ""}
                    onChange={(e) =>
                      handleUpdateActiveChain((c) => ({
                        ...c,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Chain Name"
                  />
                  <button
                    style={styles.btnTiny}
                    onClick={() => {
                      if (window.confirm("Delete this chain?")) {
                        onChange({
                          ...state,
                          chains: state.chains.filter(
                            (c) => c.id !== state.activeChainId
                          ),
                          activeChainId:
                            state.chains.find(
                              (c) => c.id !== state.activeChainId
                            )?.id || null,
                        });
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              }
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {activeChain?.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    style={{
                      ...styles.card,
                      width: "160px",
                      border:
                        idx === state.currentIndex && state.playing
                          ? "1px solid #19b0d7"
                          : "1px solid #29313a",
                    }}
                  >
                    <div
                      style={{ ...styles.row, justifyContent: "space-between" }}
                    >
                      <strong>#{idx + 1}</strong>
                      <button
                        style={styles.btnTiny}
                        onClick={() => {
                          handleUpdateActiveChain((c) => ({
                            ...c,
                            steps: c.steps.filter(
                              (_: any, sIdx: number) => sIdx !== idx
                            ),
                          }));
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <select
                      style={{
                        ...styles.input,
                        marginTop: "8px",
                        width: "100%",
                      }}
                      value={step.snapshotId || ""}
                      onChange={(e) => {
                        const snapId = e.target.value;
                        const snapName =
                          snapshots.banks
                            .flatMap((b) => b.slots)
                            .find((s) => s.id === snapId)?.name || "Slot";
                        handleUpdateActiveChain((c) => ({
                          ...c,
                          steps: c.steps.map((s: any, sIdx: number) =>
                            sIdx === idx
                              ? {
                                  ...s,
                                  snapshotId: snapId,
                                  snapshotName: snapName,
                                }
                              : s
                          ),
                        }));
                      }}
                    >
                      <option value="">Select Snapshot...</option>
                      {snapshots.banks.map((bank) => (
                        <optgroup key={bank.id} label={bank.name}>
                          {bank.slots
                            .filter((s) => s.snapshot)
                            .map((slot) => (
                              <option key={slot.id} value={slot.id}>
                                {slot.name}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                    </select>
                    <div style={{ ...styles.row, marginTop: "8px" }}>
                      <span style={styles.muted}>Bars:</span>
                      <input
                        style={styles.inputNarrow}
                        type="number"
                        value={step.bars}
                        onChange={(e) => {
                          const val = Math.max(
                            1,
                            parseInt(e.target.value) || 1
                          );
                          handleUpdateActiveChain((c) => ({
                            ...c,
                            steps: c.steps.map((s: any, sIdx: number) =>
                              sIdx === idx ? { ...s, bars: val } : s
                            ),
                          }));
                        }}
                      />
                    </div>
                    <div
                      style={{
                        ...styles.row,
                        marginTop: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        style={styles.btnTiny}
                        disabled={idx === 0}
                        onClick={() => {
                          handleUpdateActiveChain((c) => {
                            const nextSteps = [...c.steps];
                            const [moved] = nextSteps.splice(idx, 1);
                            nextSteps.splice(idx - 1, 0, moved);
                            return { ...c, steps: nextSteps };
                          });
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        style={styles.btnTiny}
                        disabled={idx === activeChain.steps.length - 1}
                        onClick={() => {
                          handleUpdateActiveChain((c) => {
                            const nextSteps = [...c.steps];
                            const [moved] = nextSteps.splice(idx, 1);
                            nextSteps.splice(idx + 1, 0, moved);
                            return { ...c, steps: nextSteps };
                          });
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  style={{
                    ...styles.card,
                    ...styles.row,
                    justifyContent: "center",
                    cursor:
                      (activeChain?.steps.length || 0) >= 64
                        ? "not-allowed"
                        : "pointer",
                    borderStyle: "dashed",
                    opacity: (activeChain?.steps.length || 0) >= 64 ? 0.5 : 1,
                  }}
                  disabled={(activeChain?.steps.length || 0) >= 64}
                  onClick={handleAddStep}
                >
                  {(activeChain?.steps.length || 0) >= 64
                    ? "Max Steps"
                    : "+ Step"}
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </Page>
  );
}
