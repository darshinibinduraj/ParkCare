import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  textSize: text("text_size"),
  theme: text("theme"),
});

export const intakeAnswers = pgTable(
  "intake_answers",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    questionKey: text("question_key").notNull(),
    answerText: text("answer_text").notNull().default(""),
    skipped: boolean("skipped").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("intake_answers_session_question_idx").on(table.sessionId, table.questionKey)],
);

export const patientProfiles = pgTable("patient_profiles", {
  id: uuid("id").primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => sessions.id, { onDelete: "cascade" }),
  profile: jsonb("profile").notNull(),
  confirmed: boolean("confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const medicalResources = pgTable(
  "medical_resources",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    specialty: text("specialty").notNull(),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zip: text("zip").notNull().default(""),
    phone: text("phone"),
    website: text("website"),
    bookingUrl: text("booking_url"),
    insuranceNotes: text("insurance_notes"),
    source: text("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    lastVerified: date("last_verified"),
    simulated: boolean("simulated").notNull().default(false),
  },
  (table) => [
    index("medical_resources_zip_idx").on(table.zip),
    index("medical_resources_city_idx").on(table.city),
    index("medical_resources_specialty_idx").on(table.specialty),
  ],
);

export const equipmentItems = pgTable(
  "equipment_items",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull(),
    intendedUse: text("intended_use").notNull(),
    estimatedPriceUsd: numeric("estimated_price_usd", { precision: 8, scale: 2 }),
    productUrl: text("product_url"),
    safetyNotes: text("safety_notes"),
    source: text("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    lastVerified: date("last_verified"),
    simulated: boolean("simulated").notNull().default(false),
  },
  (table) => [index("equipment_items_category_idx").on(table.category)],
);

export const caregiverServices = pgTable(
  "caregiver_services",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address").notNull().default(""),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    zip: text("zip").notNull().default(""),
    serviceArea: text("service_area").array().notNull(),
    assistanceTypes: text("assistance_types").array().notNull(),
    hours: text("hours"),
    publishedRate: text("published_rate"),
    phone: text("phone"),
    website: text("website"),
    languages: text("languages").array().notNull(),
    qualifications: text("qualifications"),
    source: text("source").notNull(),
    verified: boolean("verified").notNull().default(false),
    lastVerified: date("last_verified"),
    simulated: boolean("simulated").notNull().default(false),
  },
  (table) => [
    index("caregiver_services_city_idx").on(table.city),
    index("caregiver_services_zip_idx").on(table.zip),
    index("caregiver_assistance_gin").using("gin", table.assistanceTypes),
    index("caregiver_service_area_gin").using("gin", table.serviceArea),
  ],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("agent_runs_session_idx").on(table.sessionId)],
);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    sender: text("sender").notNull(),
    recipients: text("recipients").array().notNull(),
    round: integer("round").notNull(),
    content: text("content").notNull(),
    structured: jsonb("structured"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("agent_messages_run_idx").on(table.runId)],
);

export const carePlans = pgTable(
  "care_plans",
  {
    id: uuid("id").primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    plan: jsonb("plan").notNull(),
    caveats: jsonb("caveats").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("care_plans_run_idx").on(table.runId)],
);
