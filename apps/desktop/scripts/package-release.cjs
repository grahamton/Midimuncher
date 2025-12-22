/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const desktopDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopDir, '..');
const releasesDir = path.join(repoRoot, 'releases');
const stagingDir = path.join(releasesDir, 'windows-beta');
const zipPath = path.join(releasesDir, 'windows-beta.zip');

const copy = (source, dest) => {
  if (!fs.existsSync(source)) {
    throw new Error(`Required path not found: ${source}`);
  }
  fs.cpSync(source, dest, { recursive: true, dereference: true });
};

const main = () => {
  console.log('Preparing release package...');

  fs.rmSync(releasesDir, { recursive: true, force: true });
  fs.mkdirSync(stagingDir, { recursive: true });

  const toCopy = [
    { src: path.join(desktopDir, 'dist'), dest: path.join(stagingDir, 'dist') },
    { src: path.join(desktopDir, 'dist-electron'), dest: path.join(stagingDir, 'dist-electron') },
    { src: path.join(desktopDir, 'package.json'), dest: path.join(stagingDir, 'package.json') },
    { src: path.join(desktopDir, 'node_modules'), dest: path.join(stagingDir, 'node_modules') }
  ];

  for (const { src, dest } of toCopy) {
    console.log(`Copying ${src} → ${dest}`);
    copy(src, dest);
  }

  console.log(`Creating archive ${zipPath}`);
  const commandArgs = [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path "${stagingDir}\\*" -DestinationPath "${zipPath}" -Force`
  ];
  const result = spawnSync('powershell', commandArgs, { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error('Compress-Archive failed');
  }

  console.log(`Release ready: ${zipPath}`);
  console.log('Keep the releases/windows-beta directory for manual verification if needed.');
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
