/** Turn the visible lines of one result into a single passage for speech. */
export function sectionSpeech(lines: string[]): string {
  const spoken = lines
    .map((line) => line.replace(/\s+/g, " ").trim().replace(/[.\s]+$/g, ""))
    .filter(Boolean)
    .join(". ")
    .replace(/\.{2,}/g, ".");
  return spoken ? `${spoken}.` : "";
}
