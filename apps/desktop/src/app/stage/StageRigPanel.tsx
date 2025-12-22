import { getInstrumentProfile } from "@midi-playground/core";
import { Fader } from "@midi-playground/ui";
import type { DeviceConfig } from "../../../shared/projectTypes";
import { stageStyles } from "./styles";

export type StageRigPanelProps = {
  rig: Array<DeviceConfig | null>;
  ccValues: Record<string, number>;
  onSendCc: (deviceId: string, cc: number, value: number) => void;
};

export function StageRigPanel({ rig, ccValues, onSendCc }: StageRigPanelProps) {
  return (
    <div style={stageStyles.panel}>
      <div style={stageStyles.rigHeader}>
        <div style={stageStyles.rigTitle}>Rig strips (send-only)</div>
        <div style={{ fontSize: 12, color: "#cbd5e1" }}>
          Instruments don’t need MIDI OUT connected; strips use your configured
          device + CC map.
        </div>
      </div>
      <div style={stageStyles.rigGrid}>
        {rig.map((device, idx) => {
          if (!device) {
            return (
              <div key={`lane-${idx + 1}`} style={stageStyles.rigEmpty}>
                <div
                  style={{
                    fontSize: 12,
                    color: "#94a3b8",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  Lane {idx + 1}
                </div>
                <div
                  style={{ fontWeight: 800, color: "#e2e8f0", marginTop: 4 }}
                >
                  Unassigned
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                  Assign a device to Lane {idx + 1} in Setup.
                </div>
              </div>
            );
          }
          const profile = getInstrumentProfile(device.instrumentId);
          const topCcs = (profile?.cc ?? []).slice(0, 3);
          const outputOk = Boolean(device.outputId);
          return (
            <div
              key={device.id}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 12,
                padding: 12,
                background: "#0b1220",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Lane {idx + 1}
                  </div>
                  <div style={{ fontWeight: 800, color: "#e2e8f0" }}>
                    {device.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {profile ? profile.name : "No instrument selected"} · Ch{" "}
                    {device.channel} · Out {device.outputId ?? "unassigned"}
                  </div>
                </div>
                <div
                  style={{
                    ...stageStyles.pill,
                    background: outputOk ? "#22c55e22" : "#ef444422",
                    border: `1px solid ${outputOk ? "#22c55e55" : "#ef444455"}`,
                    color: outputOk ? "#86efac" : "#fecaca",
                  }}
                  title={outputOk ? "Output assigned" : "No output"}
                >
                  {outputOk ? "Wired" : "No out"}
                </div>
              </div>
              <div
                style={{ display: "flex", gap: 10, justifyContent: "center" }}
              >
                {topCcs.length ? (
                  topCcs.map((cc) => {
                    const key = `${device.id}:${cc.cc}`;
                    const value = ccValues[key] ?? 0;
                    return (
                      <Fader
                        key={cc.cc}
                        label={cc.label || `CC ${cc.cc}`}
                        value={value / 127}
                        onChange={(v) =>
                          onSendCc(device.id, cc.cc, Math.round(v * 127))
                        }
                        size="sm"
                        orientation="vertical"
                        color={outputOk ? "#38bdf8" : "#94a3b8"}
                      />
                    );
                  })
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      padding: "20px 0",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    No CC map found for this instrument. Assign a device in
                    Setup to enable quick controls.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
