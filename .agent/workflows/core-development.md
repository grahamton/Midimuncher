---
description: Workflow for Core logic, MIDI, and Persistence development
---

# Core Development Workflow

This workflow guides the Core Agent in developing backend/logic features within `packages/core` and Electron main process.

## Scope

- **Ownership**: `packages/core`, `apps/desktop/electron/*`
- **Responsibilities**:
  - MIDI contracts
  - Persistence layer
  - Scheduler/Main process logic

## Steps

1. **Context Check**

   - Verify you are working within `packages/core` or `apps/desktop/electron`.
   - Ensure scheduler and persistence code remains outside of React components.
   - Surface APIs clearly for the renderer.

2. **Implementation**

   - Implement logic in `packages/core`.
   - Update Electron/IPC bridges if necessary.

3. **Communication**

   - If APIs change, document them for the UI Agent.
   - If schemas change, ensure persistence contracts are updated.

4. **Verification**

   - Run core tests:
     ```bash
     corepack pnpm -C packages/core test
     ```
   - Run desktop tests to ensure integration:
     ```bash
     corepack pnpm -C apps/desktop test
     ```

5. **Handoff**
   - Leave a status bullet in `docs/agent-flow.md` or the active task tracker describing the domain touched.
   - Ensure `git status` is clean.
