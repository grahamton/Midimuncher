---
description: Workflow for UI development tasks focusing on React components and shared controls
---

# UI Development Workflow

This workflow guides the UI Agent in developing frontend features within `apps/desktop` and `packages/ui`.

## Scope

- **Ownership**: `apps/desktop/src/app/*` and `packages/ui`
- **Responsibilities**:
  - `App.tsx` management (Router only)
  - Wiring Stage/Surface/Mapping pages
  - Maintaining shared controls

## Steps

1. **Context Check**

   - Verify you are working within `apps/desktop/src` or `packages/ui`.
   - Ensure `App.tsx` remains lightweight (router definitions only).

2. **Implementation**

   - If creating new features (Stage/Surface/Mapping), keep components inside their respective feature folders.
   - If creating reusable controls, place them in `packages/ui` and export them properly.

3. **Communication**

   - If shared controls were modified, tag `packages/ui` in the status update so Core knows to rerun contracts if needed.
   - Inform the Docs/QA agent if new props or components require documentation updates.

4. **Verification**

   - Run linting for the desktop app:
     ```bash
     corepack pnpm -C apps/desktop lint
     ```
   - Run tests if logic was added:
     ```bash
     corepack pnpm -C apps/desktop test
     ```

5. **Handoff**
   - Leave a status bullet in `docs/agent-flow.md` or the active task tracker describing the domain touched (e.g., "Stage refactor done").
   - Ensure `git status` is clean before switching context.
