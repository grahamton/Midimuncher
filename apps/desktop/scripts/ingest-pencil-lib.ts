import fs from "fs";
import path from "path";
import {
  type InstrumentDef,
  type InstrumentParam,
} from "@midi-playground/core";

// Usage: npx tsx scripts/ingest-pencil-lib.ts <path-to-pencil-repo>
const repoPath = process.argv[2];

if (!repoPath) {
  console.error(
    "Usage: npx tsx scripts/ingest-pencil-lib.ts <path-to-pencil-repo>"
  );
  process.exit(1);
}

const outDir = path.resolve(__dirname, "../assets/instruments");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function parseCsvLine(line: string): string[] {
  // Simple CSV parser that handles quotes
  const parts: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "," && !inQuote) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

function heuristics(label: string): string[] {
  const tags: string[] = [];
  const l = label.toLowerCase();

  if (l.includes("cutoff") || l.includes("frequency") || l.includes("freq"))
    tags.push("cutoff");
  if (l.includes("resonance") || l.includes("reso") || l.includes("peak"))
    tags.push("resonance");
  if (l.includes("attack")) tags.push("attack");
  if (l.includes("decay")) tags.push("decay");
  if (l.includes("sustain")) tags.push("sustain");
  if (l.includes("release")) tags.push("release");
  if (l.includes("volume") || l.includes("level")) tags.push("level");
  if (l.includes("pan")) tags.push("pan");
  if (l.includes("mix")) tags.push("mix");

  return tags;
}

function processFile(vendor: string, model: string, filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

  // Try to simplify model name (remove vendor prefix if present)
  // e.g. "Elektron Analog Four" -> "Analog Four" if vendor is "Elektron"
  let cleanModel = model;
  if (cleanModel.toLowerCase().startsWith(vendor.toLowerCase() + " ")) {
    cleanModel = cleanModel.substring(vendor.length + 1);
  }
  // Remove .csv
  if (cleanModel.endsWith(".csv")) cleanModel = cleanModel.slice(0, -4);

  const def: InstrumentDef = {
    meta: {
      vendor,
      model: cleanModel,
      version: "1.0",
      tags: [],
    },
    connection: {
      defaultChannel: 1,
    },
    parameters: [],
  };

  // We assume header row might exist.
  // We need to detect columns.
  // Common format in pencilresearch: "CC,Parameter,Description,Min,Max" or similar?
  // Actually, checking their docs: "Orientation column", "Usage column".
  // Let's assume standard order or try to detect header.

  const header = parseCsvLine(lines[0]);
  const colMap = {
    param: -1,
    cc: -1,
    mrpn: -1, // maybe NRPN?
    min: -1, // range
    max: -1,
  };

  // Naive column detection
  header.forEach((h, i) => {
    const lower = h.toLowerCase();
    if (
      lower.includes("opt") ||
      lower.includes("parameter") ||
      lower.includes("function")
    )
      colMap.param = i;
    if (lower === "cc" || lower === "control change") colMap.cc = i;
    // ... add more if known
  });

  // Since we don't have exact column spec, making this generic is hard.
  // Custom logic for pencilresearch structure:
  // Usually: CC, Parameter Name, [Range/description]

  /*
   * Strategy:
   * Iterate lines, look for a numeric in column 0 or 1 that looks like a CC.
   */

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    // Try to find CC and Name
    let ccStr = cols[0];
    let name = cols[1];

    // If strict CSV structure (Vendor/Device.csv)
    // We'll trust the user might need to tweak this script for exact column mapping
    // But let's try to grab integers.

    const ccVal = parseInt(ccStr);
    if (!isNaN(ccVal) && ccVal >= 0 && ccVal <= 127) {
      const tags = heuristics(name);

      def.parameters.push({
        id: name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, ""),
        label: name,
        tags,
        msg: {
          type: "cc",
          index: ccVal,
        },
        range: { min: 0, max: 127 },
      });
    }
  }

  if (def.parameters.length > 0) {
    const outName = `${vendor.toLowerCase().replace(/\s+/g, "-")}_${cleanModel
      .toLowerCase()
      .replace(/\s+/g, "-")}.json`;
    const outPath = path.join(outDir, outName);
    fs.writeFileSync(outPath, JSON.stringify(def, null, 2));
    console.log(`Generated ${outName} with ${def.parameters.length} params`);
  }
}

function scanDir(dir: string, vendor?: string) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.isDirectory()) {
      if (item.name.startsWith(".")) continue;
      scanDir(path.join(dir, item.name), item.name);
    } else if (item.isFile() && item.name.endsWith(".csv")) {
      if (!vendor) {
        console.warn("Found CSV in root, skipping:", item.name);
        continue;
      }
      processFile(vendor, item.name, path.join(dir, item.name));
    }
  }
}

console.log("Scanning", repoPath);
scanDir(repoPath);
