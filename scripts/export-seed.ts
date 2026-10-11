import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { caregiverServices, equipmentItems, medicalResources } from "@/data/seed/catalog";

const dir = join(process.cwd(), "src/data/seed");
writeFileSync(join(dir, "medical.json"), `${JSON.stringify(medicalResources, null, 2)}\n`);
writeFileSync(join(dir, "equipment.json"), `${JSON.stringify(equipmentItems, null, 2)}\n`);
writeFileSync(join(dir, "caregivers.json"), `${JSON.stringify(caregiverServices, null, 2)}\n`);
console.log("Wrote seed JSON files.");
