import fs from "fs";
import path from "path";
import { app } from "electron";
import { type InstrumentDef } from "@midi-playground/core";

// Define locations
export function getUserInstrumentDir() {
  return path.join(app.getPath("home"), ".midimuncher", "instruments");
}

export function getAssetsInstrumentDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "assets", "instruments");
  }
  // In dev, we are in apps/desktop/dist-electron usually, or running from root
  // We need to find apps/desktop/assets/instruments
  // process.cwd() in dev is usually apps/desktop
  return path.resolve(process.cwd(), "assets", "instruments");
}

function loadJsonSafe(filePath: string): InstrumentDef | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(content);
    // TODO: Zod validation here
    // For now simple duck typing check
    if (json && json.meta && json.parameters) {
      return json as InstrumentDef;
    }
    console.warn("Invalid instrument file format:", filePath);
    return null;
  } catch (err) {
    console.warn("Failed to load instrument:", filePath, err);
    return null;
  }
}

export function loadInstrumentLibrary(): InstrumentDef[] {
  const library: InstrumentDef[] = [];
  const dirs = [getAssetsInstrumentDir(), getUserInstrumentDir()];

  // Ensure user dir exists
  const userDir = getUserInstrumentDir();
  if (!fs.existsSync(userDir)) {
    try {
      fs.mkdirSync(userDir, { recursive: true });
    } catch (err) {
      console.error("Failed to create user instrument dir", err);
    }
  }

  const seenIds = new Set<string>();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const def = loadJsonSafe(path.join(dir, file));
      if (def) {
        // Simple dedup by ID? Or Vendor+Model?
        // Unique key: Vendor + Model
        const key = `${def.meta.vendor}:${def.meta.model}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          library.push(def);
        }
      }
    }
  }

  return library;
}
