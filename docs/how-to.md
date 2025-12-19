# Midimuncher How-To (current build)

This is a quick-start guide for the desktop app as it exists today. It assumes you have installed deps with `corepack pnpm install` from the repo root.

## Run the app
- Dev mode: `corepack pnpm -C apps/desktop dev` (launches renderer + Electron). Use the Electron window, not the browser tab.
- If you only need a production bundle: `corepack pnpm -C apps/desktop build`.

## 1) Hardware setup (Setup tab)
- Pick backend/input/output in the top selectors.
- Click **Plug & Go** to auto-select a channel/output from your devices list.
- **Routes for Devices** will create basic routes for detected devices (passthrough-style).
- **Run Diagnostics** sends a short test pattern to the selected output.
- Quick send block:
  - **Send Note (C4)**: sanity-check audio.
  - **Send CC / Send PC**: verify control/program changes; you can set CC number/value.

## 2) Mapping (Mapping tab)
- Select a control from the list to edit its slots.
- **Learn** captures the next incoming CC/Note for that slot; **Cancel** stops listening.
- You can still type channel/CC/value ranges manually if you prefer.
- Use the quick buttons on the right to send test Note/CC with the current values.

## 3) Snapshots (Snapshots tab)
- Tiles: click to trigger; the active tile is labeled; pending shows a badge when quantized.
- Quantize: Immediate, 1 bar, or 4 bars (uses either manual BPM or external clock if “Follow MIDI Clock” is on).
- Mode: **Jump** (switch immediately at quantize point) or **Commit** (stage then commit).
- Fade: set milliseconds for level transitions when switching snapshots.
- **Send Snapshot** (from transport/status) will fire the selected snapshot immediately.

## 4) Chains (Chains tab)
- Add steps with **Add Step** or **+ Step**; each step has a snapshot name and bar length.
- Reorder with the chevrons; remove with the trash icon; edit bar count inline.
- **Play/Stop** starts/stops the chain; the current step highlights while playing.
- Chain execution respects the snapshot quantize setting and the active tempo/clock source.

## 5) Transport & clock
- Tempo is editable in the top bar. If **Follow MIDI Clock** is enabled, incoming clock sets tempo.
- **Follow Clock Start/Stop** lets external transport start/stop drive the chain runner.
- Play/Stop buttons and Cycle controls mirror the transport state shown in the header.

## 6) Monitor (Monitor tab)
- Shows recent MIDI traffic with timestamps and port labels.
- **Clear Log** removes the current buffer. A “Log capped” pill appears if the buffer limit is hit.

## 7) Settings
- Pick theme (currently dark), and adjust UI zoom (local only).
- Export/reset placeholders exist for future persistence flows.

## 8) Panic & safety
- Bottom-left **MIDI PANIC** sends all-notes-off (per selected output) to stop hung notes.
- Safe Mode toggle is visual; future behavior can mute risky actions when enabled.

## Tips
- Prefer `corepack pnpm ...` to ensure the correct pnpm version.
- If fonts are blocked by CSP in a browser tab, ignore it—use the Electron window.
- Keep an eye on the Status strip (top bar) for backend/input/output and clock source state.
