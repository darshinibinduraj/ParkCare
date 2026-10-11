export type MedicalResource = {
  id: string;
  name: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  website: string | null;
  bookingUrl: string | null;
  insuranceNotes: string | null;
  source: string;
  verified: boolean;
  lastVerified: string | null;
  simulated: boolean;
};

export type EquipmentItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  intendedUse: string;
  estimatedPriceUsd: number | null;
  productUrl: string | null;
  safetyNotes: string | null;
  source: string;
  verified: boolean;
  lastVerified: string | null;
  simulated: boolean;
};

export type CaregiverService = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  serviceArea: string[];
  assistanceTypes: string[];
  hours: string | null;
  publishedRate: string | null;
  phone: string | null;
  website: string | null;
  languages: string[];
  qualifications: string | null;
  source: string;
  verified: boolean;
  lastVerified: string | null;
  simulated: boolean;
};

export type Dataset = {
  medical: MedicalResource[];
  equipment: EquipmentItem[];
  caregivers: CaregiverService[];
};

export function locationMatches(
  cityOrZip: string | null,
  parts: { city: string; state: string; zip: string; serviceArea?: string[] },
): boolean {
  if (!cityOrZip) return false;
  const query = cityOrZip.toLowerCase();
  const zip = query.match(/\b\d{5}\b/)?.[0];
  if (zip && (parts.zip === zip || parts.serviceArea?.includes(zip))) return true;
  const city = parts.city.toLowerCase();
  if (city && city !== "national" && query.includes(city)) return true;
  return (
    parts.serviceArea?.some((area) => {
      const value = area.toLowerCase();
      return value.length > 2 && value !== "united states" && query.includes(value);
    }) ?? false
  );
}

export function isNational(city: string): boolean {
  return city.trim().toLowerCase() === "national";
}
