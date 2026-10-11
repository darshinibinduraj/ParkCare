import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MedicalResource } from "@/lib/resources";

const FILE_NAME = "Health_Center_Service_Delivery_and_LookAlike_Sites.csv";
const SOURCE = "HRSA Health Center Service Delivery and Look-Alike Sites, data.hrsa.gov";
const VERIFIED_ON = "2026-10-10";
const NAMESPACE = "a1000000-0000-4000-8000-000000000000";

const SKIPPED_SETTINGS = new Set([
  "Domestic Violence",
  "Correctional Facility",
  "Transitional Care in Carceral Setting",
]);

let cached: MedicalResource[] | null = null;

/** Stable id so the same HRSA row keeps the same resource id across restarts. */
function uuid5(name: string): string {
  const namespace = Buffer.from(NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1").update(namespace).update(name).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.length > 0));
}

function websiteFor(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) return `https://${value.slice("http://".length)}`;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(value)) return `https://${value}`;
  return null;
}

function specialtyFor(setting: string, locationType: string, name: string): string {
  if (setting === "School" || /school/i.test(name)) return "School-based health center";
  if (locationType === "Mobile Van") return "Mobile health center";
  if (locationType === "Seasonal") return "Seasonal health center";
  return "Community health center";
}

function column(header: string[], name: string): number {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`HRSA file is missing column "${name}"`);
  return index;
}

export function loadHrsaSites(): MedicalResource[] {
  if (cached) return cached;
  const text = readFileSync(join(process.cwd(), "src/data", FILE_NAME), "utf8").replace(/^\uFEFF/, "");
  const table = parseCsv(text);
  const header = table[0];
  if (!header) throw new Error("HRSA file has no header");
  const siteName = column(header, "Site Name");
  const address = column(header, "Site Address");
  const city = column(header, "Site City");
  const state = column(header, "Site State Abbreviation");
  const postal = column(header, "Site Postal Code");
  const phone = column(header, "Site Telephone Number");
  const web = column(header, "Site Web Address");
  const setting = column(header, "Health Center Service Delivery Site Location Setting Description");
  const siteType = column(header, "Health Center Type Description");
  const locationType = column(header, "Health Center Location Type Description");
  const centerNumber = column(header, "Health Center Number");
  const seen = new Set<string>();
  const sites: MedicalResource[] = [];
  for (const record of table.slice(1)) {
    if (record[siteType] === "Administrative") continue;
    if (SKIPPED_SETTINGS.has(record[setting] ?? "")) continue;
    const name = (record[siteName] ?? "").trim();
    const cityName = (record[city] ?? "").trim();
    if (!name || !cityName) continue;
    const key = [
      record[centerNumber] ?? "",
      name,
      record[address] ?? "",
      record[postal] ?? "",
      record[phone] ?? "",
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    const zip = (record[postal] ?? "").trim();
    sites.push({
      id: uuid5(key),
      name,
      specialty: specialtyFor(record[setting] ?? "", record[locationType] ?? "", name),
      address: (record[address] ?? "").trim(),
      city: cityName,
      state: (record[state] ?? "").trim(),
      zip,
      phone: (record[phone] ?? "").trim() || null,
      website: websiteFor(record[web] ?? ""),
      bookingUrl: null,
      insuranceNotes:
        "Listed in the HRSA Health Center Service Delivery and Look-Alike Sites file. Insurance acceptance and open appointments were not checked. This is not a referral.",
      source: SOURCE,
      verified: true,
      lastVerified: VERIFIED_ON,
      simulated: false,
    });
  }
  cached = sites;
  return sites;
}
