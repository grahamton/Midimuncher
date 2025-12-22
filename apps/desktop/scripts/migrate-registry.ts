import fs from "fs";
import path from "path";
import { INSTRUMENT_PROFILES } from "@midi-playground/core";
import type { InstrumentDef } from "@midi-playground/core";

const outDir = path.resolve(__dirname, "../assets/instruments");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log(`Migrating ${INSTRUMENT_PROFILES.length} profiles to ${outDir}`);

for (const profile of INSTRUMENT_PROFILES) {
  // Convert old Profile format to new InstrumentDef format
  // Old: { id, name, defaultChannel, notes, cc: [{id, label, cc}] }
  // New: { meta: { vendor, model... }, parameters: [...] }

  // Guess vendor from name
  let vendor = "Generic";
  let model = profile.name;

  if (profile.name.includes("Arturia")) {
    vendor = "Arturia";
    model = "MicroFreak";
  } // specific fix
  else if (profile.name.includes("Korg")) {
    vendor = "Korg";
    model = profile.name.replace("Korg ", "");
  } else if (profile.name.includes("Elektron")) {
    vendor = "Elektron";
    model = profile.name.replace("Elektron ", "");
  } else if (profile.name.includes("Behringer")) {
    vendor = "Behringer";
    model = profile.name.replace("Behringer ", "");
  } else if (profile.name.includes("Sonicware")) {
    vendor = "Sonicware";
    model = profile.name.replace("Sonicware ", "");
  } else if (profile.name === "OXI One (hub)") {
    vendor = "OXI Instruments";
    model = "One";
  }

  const def: InstrumentDef = {
    meta: {
      id: profile.id, // Preserve legacy ID
      vendor,
      model,
      version: "1.0",
      tags: ["legacy-migration"],
    },
    connection: {
      defaultChannel: profile.defaultChannel,
    },
    parameters: profile.cc.map((cc) => ({
      id: cc.id,
      label: cc.label,
      tags: [], // TODO: heuristics could go here
      msg: {
        type: "cc",
        index: cc.cc,
      },
      range: { min: 0, max: 127 },
    })),
  };

  const fileName = `${vendor.toLowerCase().replace(/\s+/g, "-")}_${model
    .toLowerCase()
    .replace(/\s+/g, "-")}.json`;
  fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(def, null, 2));
  console.log(`Wrote ${fileName}`);
}
