# Engineering playbook (current state)

This repo will grow quickly. Keep the core loops fast and predictable.

## Commands (from repo root)

- Dev app: `corepack pnpm -C apps/desktop dev`
- Lint desktop: `corepack pnpm -C apps/desktop lint`
- Test desktop: `corepack pnpm -C apps/desktop test`
- Build desktop: `corepack pnpm -C apps/desktop build`
- Core package lint/test: `corepack pnpm -C packages/core lint` / `... test`
- Smoke checks: `corepack pnpm -C apps/desktop smoke:midi | smoke:persist | smoke:mapping | smoke:winrt`

## Stability checklist (P0/P1)

- Scheduler: keep time-sensitive work off React; batch MIDI sends, respect quantize and burst limits.
- Persistence: use versioned project doc (schemaVersion), validate inputs, clamp MIDI ranges.
- Clock/transport: when following MIDI clock, always show effective BPM; guard start/stop follow.
- Monitor: cap log, avoid main-thread churn; drop or throttle if buffer fills.
- CSP/build: keep local fonts or allow-listed sources; no remote fonts in production.

## Patterns to follow

- Type safety: prefer `tsc --noEmit` as the default lint gate; avoid `any`.
- IPC contracts: keep shared types in `apps/desktop/shared`; validate at boundaries.
- Feature flags: gate Windows MIDI Services, sequencer host, or experimental schedulers.
- Snapshots/chains: keep quantize/commit/burst logic in the main process scheduler; avoid renderer timers and duplicated tempo math.

## Architecture guardrails (avoid monoliths)

- Domain code lives in `packages/core`; Electron/React should mostly be orchestration + UX.
- Electron main stays a thin host:
  - `apps/desktop/electron/*` owns IO, routing, scheduling, persistence, and IPC wiring.
  - Prefer feature modules (`snapshotService`, `sequencerHost`, etc.) over growing `main.ts`.
- Renderer stays UI-only:
  - `apps/desktop/src/services/*` is the bridge layer (hooks/adapters), not business rules.
  - Keep MIDI/routing/snapshot algorithms out of React components; use the main process + `@midi-playground/core`.
- Size/ownership triggers:
  - If a file mixes 2+ domains (e.g. routing + snapshots + mapping) or grows beyond ~800 LOC, split by feature.
  - Prefer “feature folders” over “god components” (e.g. `src/app/mapping/*`, `src/app/snapshots/*`, `src/app/setup/*`).
- Prototype hygiene:
  - Avoid parallel implementations (e.g. two Stage pages) lasting more than a sprint; either delete the older one or gate it behind a flag.
- Shared UI primitives:
  - When control widgets become stable, move them into `packages/ui` (or delete `packages/ui` if we decide not to use it). We now host the `Fader`, `Knob`, `Crossfader`, `PadButton`, and `StepGrid` widgets in that package for reuse across desktop and future surfaces.

## Current monolith risks (as of Dec 2025)

- `apps/desktop/src/app/App.tsx` previously mixed many concerns. It has now been refactored to delegate state and logic to `useAppController.ts`, but the UI render tree is still quite deep and could be further componentized.
- Stage is now consolidated under the single implementation at `apps/desktop/src/app/StagePage.tsx` with helper pieces living inside `apps/desktop/src/app/stage/`, so the previous duplication has been removed.
- **Phase 7 OXI Integration** (Dec 2025): Remote transport control (CC 105-107) and automated routing templates for OXI Split mode are live.

## Near-term refactor targets

- Continue extracting feature panels out of `apps/desktop/src/app/App.tsx` into feature folders (e.g., specific diagnostics or settings components).
- Consolidate Stage to one implementation (pick “rig-aware strips + Drop bundle” as the canonical Stage, delete or flag the other).

## When adding features

- Add a smoke test if the code touches MIDI I/O or persistence.
- Update `docs/how-to.md` for user-visible changes and `README.md` if commands shift.
- Keep perf-sensitive code out of React renders; use refs and stable timers.
