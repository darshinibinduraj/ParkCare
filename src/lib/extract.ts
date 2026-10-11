import { createHash } from "node:crypto";
import type { PatientProfile, Symptom } from "@/lib/schemas";
import { patientProfileSchema } from "@/lib/schemas";
import { QUESTION_KEYS } from "@/lib/questions";
import { completeJson } from "@/lib/llm";

function text(answers: Record<string, string>, key: string): string {
  return (answers[key] ?? "").trim();
}

function reportsFalls(value: string): boolean {
  const cleaned = value
    .replace(/\bno (recent )?falls?\b/gi, " ")
    .replace(/\b(haven't|have not|hasn't|has not|didn't|did not) fall(en)?\b/gi, " ");
  return /\bfalls?\b|\bfell\b|\bfallen\b|near-fall|near fall/i.test(cleaned);
}

function uniqueSymptoms(items: Symptom[]): Symptom[] {
  return [...new Set(items)];
}

export function hashAnswers(answers: Record<string, string>): string {
  const stable = Object.keys(answers)
    .sort()
    .map((key) => `${key}=${answers[key]}`)
    .join("\n");
  return createHash("sha256").update(stable).digest("hex");
}

export function extractProfileHeuristic(answers: Record<string, string>): PatientProfile {
  const q1 = text(answers, "q1");
  const q2 = text(answers, "q2");
  const q3 = text(answers, "q3");
  const q4 = text(answers, "q4");
  const q5 = text(answers, "q5");
  const q6 = text(answers, "q6");
  const q7 = text(answers, "q7");
  const q8 = text(answers, "q8");
  const q9 = text(answers, "q9");
  const q10 = text(answers, "q10");
  const movement = `${q3}\n${q5}`;
  const home = `${q5}\n${q6}`;

  let respondentType: PatientProfile["respondentType"] = "unknown";
  if (/someone|care for|person i care|mother|father|spouse|husband|wife|partner|parent|my dad|my mom/i.test(q1)) {
    respondentType = "caregiver";
  } else if (/\bme\b|myself/i.test(q1)) {
    respondentType = "patient";
  }

  let stage = "unknown";
  if (q2 && !/not sure|don't know|do not know|unknown|rather not/i.test(q2)) {
    if (/later|advanced|severe|stage\s*(4|5|iv|v)\b/i.test(q2)) stage = "Later / advanced";
    else if (/middle|moderate|stage\s*(2|3|ii|iii)\b/i.test(q2)) stage = "Middle";
    else if (/early|mild|newly|stage\s*(1|i)\b/i.test(q2)) stage = "Early / mild";
    else stage = q2.slice(0, 200);
  }

  const symptoms: Symptom[] = [];
  if (/\btremor|\bshak/i.test(movement)) symptoms.push("tremor");
  if (/balance|unsteady/i.test(movement)) symptoms.push("balance");
  if (/\bwalk|gait|shuffle|freezing/i.test(movement)) symptoms.push("walking");
  if (/stiff|rigid/i.test(movement)) symptoms.push("stiffness");
  if (/daily task|daily activit|handwriting|button|dress|cook|hygiene/i.test(movement)) {
    symptoms.push("daily_activities");
  }
  const fallsReported = reportsFalls(`${q3}\n${q5}`);
  if (fallsReported) symptoms.push("falls");

  let symptomFrequency: PatientProfile["symptomFrequency"] = "unknown";
  if (q4 && !/not sure|don't know|do not know|unknown|rather not/i.test(q4)) {
    if (/many times|multiple times|several times a day/i.test(q4)) symptomFrequency = "multiple_per_day";
    else if (/every day|each day|daily|most days/i.test(q4)) symptomFrequency = "daily";
    else if (/sometimes|weekly/i.test(q4)) symptomFrequency = "sometimes";
    else if (/rarely|seldom/i.test(q4)) symptomFrequency = "rarely";
  }

  const fallBits = q5.replace(/^Selected:.*$/m, "").trim();
  const homeBits: string[] = [];
  if (/stair/i.test(home)) homeBits.push("stairs at home");
  if (/rug/i.test(home)) homeBits.push("rugs");
  if (/apartment/i.test(home)) homeBits.push("apartment");
  if (/\bhouse\b/i.test(home)) homeBits.push("house");
  if (/bathroom|shower|tub/i.test(home)) homeBits.push("bathroom mentioned");

  let currentMobilitySupport: string | null = null;
  if (/wheelchair/i.test(home)) currentMobilitySupport = "wheelchair";
  else if (/walker|rollator/i.test(home)) currentMobilitySupport = "walker";
  else if (/cane/i.test(home)) currentMobilitySupport = "cane";

  let livingSituation: PatientProfile["livingSituation"] = "unknown";
  if (/care facility|nursing|assisted living|memory care|residential care|care community/i.test(q6)) {
    livingSituation = "care_facility";
  } else if (/\balone\b|by myself|on my own/i.test(q6)) {
    livingSituation = "alone";
  } else if (/with (my )?(family|spouse|husband|wife|partner|daughter|son|kids|children|roommate)|with family/i.test(q6)) {
    livingSituation = "with_family";
  }

  let supportNeeds: PatientProfile["supportNeeds"] = "unknown";
  if (q7 && !/not sure|don't know|rather not/i.test(q7)) {
    if (/many times a day|around the clock|all day|constant|frequent/i.test(q7)) supportNeeds = "frequent";
    else if (/every day|each day|daily|most days/i.test(q7)) supportNeeds = "daily";
    else if (/sometimes|occasional|once a week|a little help/i.test(q7)) supportNeeds = "occasional";
  }

  const declinedPlace = /rather not|prefer not|not sure|don't know|do not know/i.test(q8);
  const cityOrZip = q8 && !declinedPlace ? q8.replace(/^Selected:.*$/m, "").trim().slice(0, 120) || null : null;

  let budget: PatientProfile["budget"] = "unknown";
  if (q9 && !/not sure|don't know|rather not/i.test(q9)) {
    if (/flexib|money is not|cost is not|no limit|whatever it costs/i.test(q9)) budget = "flexible";
    else if (/middle|moderate|some room|mid-range|medium/i.test(q9)) budget = "moderate";
    else if (/limited|tight|low cost|costs low|can't afford|cannot afford|fixed income/i.test(q9)) {
      budget = "limited";
    }
  }

  const languages: string[] = [];
  if (/spanish/i.test(q10)) languages.push("Spanish");
  if (/english/i.test(q10)) languages.push("English");
  if (/mandarin|chinese/i.test(q10)) languages.push("Chinese");
  if (/vietnamese/i.test(q10)) languages.push("Vietnamese");
  if (/tagalog/i.test(q10)) languages.push("Tagalog");
  if (/\basl\b|american sign language/i.test(q10)) languages.push("ASL");

  let caregiverGender: string | null = null;
  if (/woman|female/i.test(q10)) caregiverGender = "Woman";
  else if (/man caregiver|\ba man\b|male caregiver/i.test(q10)) caregiverGender = "Man";

  const scheduleBits: string[] = [];
  if (/morning/i.test(q10)) scheduleBits.push("Morning");
  if (/evening/i.test(q10)) scheduleBits.push("Evening");
  if (/weekend/i.test(q10)) scheduleBits.push("Weekend");
  if (/weekday/i.test(q10)) scheduleBits.push("Weekday");

  const rawAnswers: Record<string, string> = {};
  for (const key of QUESTION_KEYS) {
    if (answers[key]) rawAnswers[key] = answers[key];
  }

  return patientProfileSchema.parse({
    respondentType,
    stage,
    symptoms: uniqueSymptoms(symptoms),
    symptomFrequency,
    falls: {
      reported: fallsReported,
      frequency: fallsReported ? fallBits.slice(0, 300) || "Reported, details not provided" : null,
    },
    homeEnvironment: homeBits.length ? homeBits.join(", ") : null,
    currentMobilitySupport,
    livingSituation,
    supportNeeds,
    location: { cityOrZip: cityOrZip || null },
    budget,
    preferences: {
      caregiverGender,
      language: languages.length ? languages.join(", ") : null,
      schedule: scheduleBits.length ? scheduleBits.join(", ") : null,
      other: q10 ? q10.slice(0, 500) : null,
    },
    rawAnswers,
    extractionMethod: "builtin",
  });
}

function guardProfile(heuristic: PatientProfile, candidate: PatientProfile, answers: Record<string, string>): PatientProfile {
  const blob = Object.values(answers).join("\n").toLowerCase();
  const location = candidate.location.cityOrZip;
  const safeLocation =
    !location || blob.includes(location.toLowerCase()) ? location : heuristic.location.cityOrZip;
  return patientProfileSchema.parse({
    ...candidate,
    location: { cityOrZip: safeLocation },
    rawAnswers: heuristic.rawAnswers,
    sourceHash: heuristic.sourceHash,
    extractionMethod: "llm",
  });
}

export async function extractProfile(
  answers: Record<string, string>,
): Promise<PatientProfile> {
  const heuristic = extractProfileHeuristic(answers);
  const llm = await completeJson({
    system: [
      "You turn Parkinson's care intake answers into JSON.",
      "Use unknown or null when the answer does not say. Never guess a stage, diagnosis, city, or budget.",
      "respondentType is patient, caregiver, or unknown.",
      "symptoms may include only: tremor, balance, falls, walking, stiffness, daily_activities.",
      "symptomFrequency is rarely, sometimes, daily, multiple_per_day, or unknown.",
      "livingSituation is alone, with_family, care_facility, or unknown.",
      "supportNeeds is occasional, daily, frequent, or unknown.",
      "budget is limited, moderate, flexible, or unknown.",
      "Keep stage as a short plain phrase or unknown.",
      "Copy city or ZIP only if it appears in the answers.",
      "Return JSON only.",
    ].join(" "),
    user: JSON.stringify(answers),
    schema: patientProfileSchema,
  });
  if (!llm) return heuristic;
  return guardProfile(heuristic, llm, answers);
}
