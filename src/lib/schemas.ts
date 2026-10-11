import { z } from "zod";

export const respondentTypeSchema = z.enum(["patient", "caregiver", "unknown"]);
export const symptomSchema = z.enum([
  "tremor",
  "balance",
  "falls",
  "walking",
  "stiffness",
  "daily_activities",
]);
export const frequencySchema = z.enum([
  "rarely",
  "sometimes",
  "daily",
  "multiple_per_day",
  "unknown",
]);
export const livingSchema = z.enum(["alone", "with_family", "care_facility", "unknown"]);
export const supportSchema = z.enum(["occasional", "daily", "frequent", "unknown"]);
export const budgetSchema = z.enum(["limited", "moderate", "flexible", "unknown"]);
export const agentNameSchema = z.enum(["medical", "equipment", "caregiver"]);

export const patientProfileSchema = z.object({
  respondentType: respondentTypeSchema,
  stage: z.string().min(1).max(200),
  symptoms: z.array(symptomSchema).max(6),
  symptomFrequency: frequencySchema,
  falls: z.object({
    reported: z.boolean(),
    frequency: z.string().max(300).nullable(),
  }),
  homeEnvironment: z.string().max(500).nullable(),
  currentMobilitySupport: z.string().max(300).nullable(),
  livingSituation: livingSchema,
  supportNeeds: supportSchema,
  location: z.object({
    cityOrZip: z.string().max(120).nullable(),
  }),
  budget: budgetSchema,
  preferences: z.object({
    caregiverGender: z.string().max(80).nullable(),
    language: z.string().max(80).nullable(),
    schedule: z.string().max(160).nullable(),
    other: z.string().max(500).nullable(),
  }),
  rawAnswers: z.record(z.string().max(8000)),
  sourceHash: z.string().max(128).optional(),
  extractionMethod: z.enum(["llm", "builtin"]).optional(),
});

export const profileEditSchema = patientProfileSchema.omit({
  rawAnswers: true,
  sourceHash: true,
  extractionMethod: true,
});

export type PatientProfile = z.infer<typeof patientProfileSchema>;
export type ProfileEdit = z.infer<typeof profileEditSchema>;
export type Symptom = z.infer<typeof symptomSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type SupportNeed = z.infer<typeof supportSchema>;

export const recommendationSchema = z.object({
  resourceId: z.string().uuid().nullable(),
  title: z.string().min(1).max(200),
  why: z.string().min(1).max(800),
  priority: z.number().int().min(1).max(5),
});

export const findingsSchema = z.object({
  agent: agentNameSchema,
  keyFindings: z.array(z.string().max(500)).max(12),
  recommendations: z.array(recommendationSchema).max(12),
  flagsForOtherAgents: z
    .array(
      z.object({
        to: z.enum(["medical", "equipment", "caregiver", "all"]),
        message: z.string().max(600),
      }),
    )
    .max(8),
  uncertainties: z.array(z.string().max(400)).max(12),
});

export type Findings = z.infer<typeof findingsSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;

export const carePlanSchema = z.object({
  patientSummary: z.string().max(2000),
  steps: z
    .array(
      z.object({
        priority: z.number().int().min(1).max(9),
        title: z.string().max(240),
        why: z.string().max(800),
        agents: z.array(agentNameSchema).min(1),
      }),
    )
    .max(8),
  medical: z.array(recommendationSchema).max(12),
  equipment: z.array(recommendationSchema).max(12),
  caregiver: z.array(recommendationSchema).max(12),
  caveats: z.array(z.string().max(400)).max(20),
  missingInformation: z.array(z.string().max(200)).max(12),
  urgent: z.object({
    active: z.boolean(),
    message: z.string().max(600),
  }),
  comparisonNote: z.string().max(2000).nullable(),
  generatedBy: z.enum(["llm", "builtin"]),
  inputs: z.object({
    budget: budgetSchema,
    supportNeeds: supportSchema,
    location: z.string().max(120).nullable(),
  }),
});

export type CarePlan = z.infer<typeof carePlanSchema>;

export const agentMessageSchema = z.object({
  sender: z.enum(["medical", "equipment", "caregiver", "synthesizer"]),
  recipients: z.array(z.string()).min(1),
  round: z.number().int().min(1).max(3),
  content: z.string().min(1).max(2000),
  structured: z
    .object({
      transport: z.enum(["slim", "local-fallback"]),
      added: z.array(z.string()).max(12).optional(),
      removed: z.array(z.string()).max(12).optional(),
    })
    .nullable()
    .optional(),
});

export type AgentMessage = z.infer<typeof agentMessageSchema>;

export const answerBodySchema = z.object({
  questionKey: z.enum(["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"]),
  answerText: z.string().max(4000),
  skipped: z.boolean(),
});

export const preferencesSchema = z.object({
  textSize: z.enum(["md", "lg", "xl"]).optional(),
  theme: z.enum(["light", "dark", "contrast"]).optional(),
});

export const budgetChangeSchema = z.object({
  sessionId: z.string().uuid(),
  budget: budgetSchema.optional(),
  supportNeeds: supportSchema.optional(),
});
