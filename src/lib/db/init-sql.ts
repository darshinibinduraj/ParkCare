export const INIT_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  text_size text,
  theme text
);

CREATE TABLE IF NOT EXISTS intake_answers (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_text text NOT NULL DEFAULT '',
  skipped boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS intake_answers_session_question_idx
  ON intake_answers (session_id, question_key);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  profile jsonb NOT NULL,
  confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medical_resources (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  specialty text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  phone text,
  website text,
  booking_url text,
  insurance_notes text,
  source text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  last_verified date,
  simulated boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS medical_resources_zip_idx ON medical_resources (zip);
CREATE INDEX IF NOT EXISTS medical_resources_city_idx ON medical_resources (city);
CREATE INDEX IF NOT EXISTS medical_resources_specialty_idx ON medical_resources (specialty);

CREATE TABLE IF NOT EXISTS equipment_items (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  intended_use text NOT NULL,
  estimated_price_usd numeric(8, 2),
  product_url text,
  safety_notes text,
  source text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  last_verified date,
  simulated boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS equipment_items_category_idx ON equipment_items (category);

CREATE TABLE IF NOT EXISTS caregiver_services (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  service_area text[] NOT NULL DEFAULT '{}',
  assistance_types text[] NOT NULL DEFAULT '{}',
  hours text,
  published_rate text,
  phone text,
  website text,
  languages text[] NOT NULL DEFAULT '{}',
  qualifications text,
  source text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  last_verified date,
  simulated boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS caregiver_services_city_idx ON caregiver_services (city);
CREATE INDEX IF NOT EXISTS caregiver_services_zip_idx ON caregiver_services (zip);
CREATE INDEX IF NOT EXISTS caregiver_assistance_gin ON caregiver_services USING GIN (assistance_types);
CREATE INDEX IF NOT EXISTS caregiver_service_area_gin ON caregiver_services USING GIN (service_area);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  status text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS agent_runs_session_idx ON agent_runs (session_id);

CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  sender text NOT NULL,
  recipients text[] NOT NULL DEFAULT '{}',
  round integer NOT NULL,
  content text NOT NULL,
  structured jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_messages_run_idx ON agent_messages (run_id);

CREATE TABLE IF NOT EXISTS care_plans (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  plan jsonb NOT NULL,
  caveats jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_plans_run_idx ON care_plans (run_id);
`;
