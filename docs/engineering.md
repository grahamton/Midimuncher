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
- Snapshots/chains: keep quantize/fade math central; avoid duplicating tempo logic.

## When adding features
- Add a smoke test if the code touches MIDI I/O or persistence.
- Update `docs/how-to.md` for user-visible changes and `README.md` if commands shift.
- Keep perf-sensitive code out of React renders; use refs and stable timers.
