---
title: Multi-Agent Flow Plan (Vibe Mode)
---

## Goal

Keep the workspace modular so each agent can focus on a clear domain, stay lean, and finish their work without touching unrelated folders. This doc captures the lightweight flow we discussed so another agent system can pick it up.

## Agent roles

1. **UI Agent** – Owns `apps/desktop/src/app/*` and `packages/ui`. Keeps `App.tsx` as the router, wires Stage/Surface/Mapping pages, and maintains shared controls so other agents can reuse them.
2. **Core Agent** – Focuses on `packages/core`, `apps/desktop/electron/*`, and MIDI/persistence contracts. Keeps the scheduler/persistence code outside React and surfaces APIs for the renderer.
3. **Docs/QA Agent** – Watches `docs/`, `scripts/`, and smoke/lint/test commands. Updates playbooks (`docs/engineering.md`, etc.) and reruns `corepack pnpm -C apps/desktop test` (as needed) once UI/Core changes land.

## Interactions

- Each change ends with a short, humanable note (can go in the doc above or a PR comment) describing the domain touched and whether downstream agents must re-run tests or docs.
- Agents communicate via shared docs (`docs/engineering.md`, `docs/agent-flow.md`). If UI changes affect shared controls, mention `packages/ui` so Core knows to rerun contracts.
- Guardrails: work within your folder (App shell stays untouched), keep the working tree clean (`git status` zero) before handing off, and leave a “status bullet” in the docs (e.g., “Stage refactor done”) instead of sprawling text.

## Trigger checklist

- Do you need lint/test after your change? Run `corepack pnpm -C apps/desktop lint`/`test` and note the result.
- Did you touch shared controls? Update `packages/ui` and let the Docs agent know.
- Is Stage/Surface/Mapping touched? Keep the new components inside their feature folder and avoid growing `App.tsx`.

## Recent QA Passes

- 2025-12-21: Confirmed App.tsx refactor (reduced to ~900 lines), removed empty `packages/core/src/engine` dir, verified tests pass.
- 2025-12-21: Phase 7 (OXI Integration) complete. All lint and tests passing (10/10). V4 schema migration verified.
