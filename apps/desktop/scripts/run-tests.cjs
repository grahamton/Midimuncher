const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function collectTestFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTestFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      out.push(fullPath);
    }
  }
}

const testFiles = [];
collectTestFiles(path.join(process.cwd(), "tests"), testFiles);
testFiles.sort();

if (testFiles.length === 0) {
  console.error("No test files found under ./tests");
  process.exit(1);
}

const useShell = process.platform === "win32";
const result = spawnSync(
  "tsx",
  ["--tsconfig", "tsconfig.test.json", "--test", ...testFiles],
  { stdio: "inherit", shell: useShell }
);

if (result.error) {
  console.error(result.error);
}

process.exit(typeof result.status === "number" ? result.status : 1);
