export const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"] as const;

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export type Question = {
  key: QuestionKey;
  prompt: string;
  help: string;
  chips: string[];
  kind: "choice" | "text";
  choices?: { value: string; label: string }[];
};

export const QUESTIONS: Question[] = [
  {
    key: "q1",
    prompt: "Who are we helping today?",
    help: "Choose one. You can skip if you would rather not say.",
    kind: "choice",
    chips: [],
    choices: [
      { value: "Me", label: "Me" },
      { value: "Someone I care for", label: "Someone I care for" },
    ],
  },
  {
    key: "q2",
    prompt: "Tell us about the Parkinson's diagnosis. Do you know what stage it is? It's okay if you don't.",
    help: "A rough answer is fine. Stage names differ, and many people are never given one.",
    kind: "text",
    chips: ["I don't know the stage", "Early or mild", "Middle", "Later or advanced"],
  },
  {
    key: "q3",
    prompt: "What changes in movement or daily life have you noticed? For example tremor, balance, stiffness, or walking.",
    help: "Use your own words, tap a chip, or both.",
    kind: "text",
    chips: [
      "Tremor",
      "Balance problems",
      "Stiffness",
      "Trouble walking",
      "Falls",
      "Daily tasks are harder",
    ],
  },
  {
    key: "q4",
    prompt: "How often do these happen?",
    help: "A general sense is enough.",
    kind: "text",
    chips: ["Rarely", "Sometimes", "Every day", "Many times a day", "I'm not sure"],
  },
  {
    key: "q5",
    prompt: "Tell us about falls or near-falls, if any.",
    help: "We ask this because balance or walking came up. Include where they happen if you want.",
    kind: "text",
    chips: ["No falls", "A near-fall", "One fall", "More than one fall", "I use a cane or walker"],
  },
  {
    key: "q6",
    prompt: "Where do you live, and who is at home with you?",
    help: "For example: alone, with family, or in a care community. Do not include a street address.",
    kind: "text",
    chips: ["I live alone", "With family", "In a care community", "House", "Apartment"],
  },
  {
    key: "q7",
    prompt: "What kind of help do you need day to day, and how often?",
    help: "Think about meals, dressing, bathing, or company.",
    kind: "text",
    chips: ["A little help sometimes", "Help most days", "Help many times a day", "I'm not sure"],
  },
  {
    key: "q8",
    prompt: "What city or ZIP code are you in?",
    help: "A city or a ZIP code is enough. We use it to look for resources near you.",
    kind: "text",
    chips: ["I'd rather not say"],
  },
  {
    key: "q9",
    prompt: "How are you thinking about costs? A rough idea is fine.",
    help: "This can change which lower-cost public options we put first. It is not a bill.",
    kind: "text",
    chips: ["Keeping costs low", "A middle range", "More flexibility", "I'm not sure"],
  },
  {
    key: "q10",
    prompt: "Anything else that matters? For example caregiver gender, language, or schedule.",
    help: "Skip this if there is nothing to add.",
    kind: "text",
    chips: ["Woman caregiver", "Man caregiver", "Spanish", "Morning visits", "Evening visits"],
  },
];

export function isQuestionKey(value: string): value is QuestionKey {
  return (QUESTION_KEYS as readonly string[]).includes(value);
}

export function questionByKey(key: QuestionKey): Question {
  const question = QUESTIONS.find((item) => item.key === key);
  if (!question) throw new Error(`Unknown question ${key}`);
  return question;
}

export function fallsQuestionRelevant(answers: Record<string, string>): boolean {
  const blob = `${answers.q3 ?? ""}\n${answers.q4 ?? ""}`;
  return /fall|balance|unsteady|walk|stumble|near-fall|near fall/i.test(blob);
}

export function visibleQuestions(answers: Record<string, string>): Question[] {
  return QUESTIONS.filter((question) => question.key !== "q5" || fallsQuestionRelevant(answers));
}

export function combineAnswer(text: string, chips: string[], chipOptions: string[]): string {
  const clean = text.trim();
  const selected = chips.map((chip) => chip.trim()).filter((chip) => chipOptions.includes(chip));
  const chipLine = selected.length ? `Selected: ${selected.join(", ")}` : "";
  return [clean, chipLine].filter(Boolean).join("\n");
}

export function splitStoredAnswer(
  stored: string,
  chipOptions: string[],
): { text: string; chips: string[] } {
  const lines = stored.split("\n");
  const index = lines.findIndex((line) => line.startsWith("Selected: "));
  if (index === -1) return { text: stored.trim(), chips: [] };
  const chips = lines[index]
    .replace(/^Selected:\s*/, "")
    .split(",")
    .map((chip) => chip.trim())
    .filter((chip) => chipOptions.includes(chip));
  const text = lines.filter((_, lineIndex) => lineIndex !== index).join("\n").trim();
  return { text, chips };
}

export function neighborKey(
  current: QuestionKey,
  answers: Record<string, string>,
  direction: "next" | "back",
): QuestionKey | "review" | "stay" {
  const visible = visibleQuestions(answers);
  const index = visible.findIndex((question) => question.key === current);
  if (index === -1) return visible[0]?.key ?? "q1";
  if (direction === "back") {
    if (index === 0) return "stay";
    return visible[index - 1].key;
  }
  if (index >= visible.length - 1) return "review";
  return visible[index + 1].key;
}

export function resumeKey(answers: Record<string, string>, answered: Set<string>): QuestionKey | "review" {
  const visible = visibleQuestions(answers);
  const missing = visible.find((question) => !answered.has(question.key));
  if (!missing && answered.size > 0) return "review";
  return missing?.key ?? "q1";
}
