# Beta Release Packaging

Use this flow to produce a shareable Windows archive that bundles the renderer output, main process build, and runtime dependencies so testers can run the beta without re-building locally.

1. From the repo root, install deps (if needed) and run the new helper:
   ```sh
   corepack pnpm install    # ensures `node_modules` is populated
   corepack pnpm package-beta
   ```
   - `package-beta` runs `corepack pnpm -C apps/desktop build` followed by `corepack pnpm -C apps/desktop package:beta`.
   - The packaging script copies `dist`, `dist-electron`, `package.json`, and `node_modules` into `releases/windows-beta`, then calls PowerShell's `Compress-Archive` to produce `releases/windows-beta.zip`.
   - This script is Windows-targeted (it invokes `powershell Compress-Archive`), so run it on a Windows host that has PowerShell available.

2. After the command completes, the ready-to-share zip lives at `releases/windows-beta.zip`. Keep the unpacked `releases/windows-beta` folder if you want to inspect the files pre-archive.

3. Distribute `releases/windows-beta.zip` to beta testers. Once they extract the archive, they can launch the app via the packaged Electron binary:
   ```sh
   ./node_modules/.bin/electron .
   ```
   or run the `electron.exe` located under `node_modules/.pnpm/electron@*/node_modules/electron/dist`.

4. When sharing the artifact, note the Git tag/SHA the beta was built from, and mention that the archive contains all bundled dependencies plus the latest renderer/main builds so no additional build steps are required.

Keep this doc up to date if the packaging script is extended (e.g., to call an installer builder) or if the shared artifact location changes.
