import { useEffect, useRef } from "react";
import {
  ModulationEngine,
  type ModulationEngineState,
  morphModulationSources,
  type ComputedModulation,
} from "@midi-playground/core";
import { type ControlElement } from "@midi-playground/core";
import { type DeviceConfig } from "../../../shared/projectTypes";
import { clampMidi } from "../lib/clamp";

interface ModulationRunnerProps {
  state: ModulationEngineState;
  bpm: number;
  running: boolean; // Internal transport
  clockRunning: boolean; // External clock running
  controls: ControlElement[];
  devices: DeviceConfig[];
  midiApi: any; // Typed as MidiApi in wider app
  onEmit: (control: ControlElement, value: number) => void;
}

export function ModulationRunner({
  state,
  bpm,
  running,
  clockRunning,
  controls,
  devices,
  onEmit,
}: ModulationRunnerProps) {
  // Stable engine instance
  const engine = useRef(new ModulationEngine()).current;

  // Sync state to engine
  useEffect(() => {
    let effectiveSources = state.sources;

    if (state.morph > 0 && state.targetSceneId) {
      const activeScene = state.scenes.find(
        (s) => s.id === state.activeSceneId
      );
      const targetScene = state.scenes.find(
        (s) => s.id === state.targetSceneId
      );

      const baseSources = activeScene ? activeScene.sources : state.sources;
      if (targetScene) {
        effectiveSources = morphModulationSources(
          baseSources,
          targetScene.sources,
          state.morph
        );
      }
    }

    engine.setState({ ...state, sources: effectiveSources });
  }, [state, engine]);

  // Timing state
  const lastTimeRef = useRef<number | null>(null);
  const totalBarsRef = useRef(0);

  // Stable refs for loop access
  const controlsRef = useRef(controls);
  const onEmitRef = useRef(onEmit);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    onEmitRef.current = onEmit;
  }, [onEmit]);

  useEffect(() => {
    let animationFrame: number;

    const loop = (now: number) => {
      const lastTime = lastTimeRef.current ?? now;
      const deltaMs = now - lastTime;
      lastTimeRef.current = now;

      // Determine if we should advance time
      const effectiveRunning = running || clockRunning;

      if (effectiveRunning) {
        // Bars per millisecond * delta
        const barsPerMs = bpm / 240000; // 4 beats * 60000? No.
        // 1 bar = 4 beats. 1 beat = 60000/bpm ms.
        // Bar duration = 4 * (60000/bpm) = 240000/bpm.
        // Bars advanced = deltaMs / BarDuration = deltaMs / (240000/bpm) = deltaMs * bpm / 240000.
        const bars = (deltaMs * bpm) / 240000.0;
        totalBarsRef.current += bars;

        // Generate mod values
        const results = engine.tick(totalBarsRef.current);

        // Dispatch results
        // Dispatch results
        const currentControls = controlsRef.current;
        const emit = onEmitRef.current;

        results.forEach((res: ComputedModulation) => {
          // engine.tick returns ComputedModulation { targetControlId, effectiveScalar, ... }
          const control = currentControls.find(
            (c: ControlElement) => c.id === res.targetControlId
          );
          if (control) {
            // Map scalar (0-1 or -1..1) to MIDI 0-127
            // Unipolar (0-1) -> 0..127
            // Bipolar (-1..1) -> we might need to know the center?
            // For now, assuming absolute control (LFO drives the parameter fully)
            // and simply clamping 0-127.
            // Ideally modulation *adds* to the base value, but that requires reading base value.
            // control.value is the current UI value.

            // Simple approach: LFO Output * 127
            const raw = res.effectiveScalar * 127;
            const midiVal = Math.max(0, Math.min(127, Math.round(raw)));

            // Throttle check could go here
            emit(control, midiVal);
          }
        });
      }

      animationFrame = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animationFrame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrame);
  }, [bpm, running, clockRunning, engine]);

  return null;
}
