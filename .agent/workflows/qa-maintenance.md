---
description: Workflow for Documentation, QA, and maintenance
---

# QA & Documentation Workflow

This workflow guides the Docs/QA Agent in maintaining documentation, running scripts, and ensuring quality.

## Scope

- **Ownership**: `docs/`, `scripts/`
- **Responsibilities**:
  - Updating playbooks (e.g., `docs/engineering.md`)
  - Running smoke/lint/test commands
  - Managing housekeeping

## Steps

1. **Monitor**

   - Watch for changes in UI or Core that require documentation updates.
   - Check `docs/agent-flow.md` for status updates from other agents.

2. **Update Documentation**

   - Update `docs/engineering.md` or other playbooks if processes or architectures change.
   - Record significant decisions or changes.

3. **Verification Cycles**

   - Run the full test suite to ensure stability after UI/Core changes:
     ```bash
     corepack pnpm -C apps/desktop test
     ```
     // turbo
     ```bash
     corepack pnpm -C packages/core test
     ```

4. **Housekeeping**

   - Check for lint issues across the repo.
   - Ensure the working tree is clean.

5. **Handoff**
   - Leave a status bullet in `docs/agent-flow.md` indicating QA pass completion (e.g., "Regressions checked for v2").
