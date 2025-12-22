# Midimuncher session notes

Date: (fill with your next session)

What works

- Electron + Vite + React dev flow (`corepack pnpm -C apps/desktop dev`) starts and opens the app window.
- Preload exposes `window.midi`; renderer no longer crashes if opened in a browser by mistake.
- MIDI bridge (`apps/desktop/electron/midiBridge.ts`) lists ports, opens in/out, sends messages, and supports one passthrough route with forced channel.
- UI (`apps/desktop/src/app/App.tsx`) now uses `useAppController` for state; shows device pickers, route toggle/channel, activity log, and test note/CC send.
- Smoke test script (`corepack pnpm -C apps/desktop smoke:midi`) lists ports and listens briefly on input 0.

How to run next time

1. From repo root: `corepack pnpm install` (only if deps changed).
2. Dev: `corepack pnpm -C apps/desktop dev` and use the Electron window (not the browser tab).
3. Optional quick check: `corepack pnpm -C apps/desktop smoke:midi`.
4. See `docs/how-to.md` for the current user-facing walkthrough (setup, mapping, snapshots, chains, clock, monitor).
5. See `docs/engineering.md` for the current eng playbook (commands, stability checklist).

Known gaps / next steps

- Snapshot morphing and per-parameter slew.
- Stage mode: rig-aware instrument strips + transition progress fader.
- Improve Content-Security-Policy for production build.
- OXI transport consumption (CC 105/106/107) is now supported; next step is aligning cycle boundaries to transport state consistently across clock sources.

Notes

- If `pnpm` isn’t on PATH, always use `corepack pnpm ...`.
- OXI-specific flow: select OXI input/output, enable passthrough, send test note/CC to confirm downstream chain.
