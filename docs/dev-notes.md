# Midimuncher session notes

Date: (fill with your next session)

What works
- Electron + Vite + React dev flow (`corepack pnpm -C apps/desktop dev`) starts and opens the app window.
- Preload exposes `window.midi`; renderer no longer crashes if opened in a browser by mistake.
- MIDI bridge (`apps/desktop/electron/midiBridge.ts`) lists ports, opens in/out, sends messages, and supports one passthrough route with forced channel.
- UI (`apps/desktop/src/app/App.tsx`) shows device pickers, route toggle/channel, activity log, and test note/CC send.
- Smoke test script (`corepack pnpm -C apps/desktop smoke:midi`) lists ports and listens briefly on input 0.

How to run next time
1) From repo root: `corepack pnpm install` (only if deps changed).
2) Dev: `corepack pnpm -C apps/desktop dev` and use the Electron window (not the browser tab).
3) Optional quick check: `corepack pnpm -C apps/desktop smoke:midi`.

Known gaps / next steps
- Add basic lint/test scripts for desktop package.
- Improve Content-Security-Policy for production build.
- Consider persisting last-selected MIDI ports.
- Add routing graph UI (beyond single passthrough) per brief.

Notes
- If `pnpm` isn’t on PATH, always use `corepack pnpm ...`.
- OXI-specific flow: select OXI input/output, enable passthrough, send test note/CC to confirm downstream chain. 
