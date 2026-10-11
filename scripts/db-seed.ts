import { getDb } from "@/lib/db/client";
import { replaceSeed } from "@/lib/db/seed";

const db = await getDb();
await replaceSeed(db);
console.log("Seeded ParkCare resource tables.");
