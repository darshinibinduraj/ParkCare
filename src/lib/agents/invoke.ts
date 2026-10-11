import { readFileSync } from "node:fs";
import { refineCaregiver, runCaregiverAgent } from "@/lib/agents/caregiver";
import { refineEquipment, runEquipmentAgent } from "@/lib/agents/equipment";
import { refineMedical, runMedicalAgent } from "@/lib/agents/medical";
import { createPlan } from "@/lib/agents/orchestrator";
import { synthesize } from "@/lib/agents/synthesizer";
import type { Dataset } from "@/lib/resources";
import type { CarePlan, Findings, PatientProfile } from "@/lib/schemas";
import { carePlanSchema, findingsSchema, patientProfileSchema } from "@/lib/schemas";

type AgentName = "medical" | "equipment" | "caregiver";

type InvokeInput = {
  mode: "plan" | "agent" | "synthesize";
  profile: PatientProfile;
  dataset: Dataset;
  previous?: CarePlan | null;
  agent?: AgentName;
  round?: 1 | 2;
  others?: Findings[];
  findings?: {
    medical: Findings;
    equipment: Findings;
    caregiver: Findings;
  };
};

function runOne(input: InvokeInput): Findings {
  const agent = input.agent;
  if (!agent) throw new Error("missing_agent");
  if (input.round === 2) {
    const others = (input.others ?? []).map((item) => findingsSchema.parse(item));
    if (agent === "medical") return refineMedical(runMedicalAgent(input.profile, input.dataset.medical), others, input.profile, input.dataset.medical);
    if (agent === "equipment") {
      return refineEquipment(runEquipmentAgent(input.profile, input.dataset.equipment), others, input.profile, input.dataset.equipment);
    }
    return refineCaregiver(runCaregiverAgent(input.profile, input.dataset.caregivers), others, input.profile);
  }
  if (agent === "medical") return runMedicalAgent(input.profile, input.dataset.medical);
  if (agent === "equipment") return runEquipmentAgent(input.profile, input.dataset.equipment);
  return runCaregiverAgent(input.profile, input.dataset.caregivers);
}

function main() {
  const input = JSON.parse(readFileSync(0, "utf8")) as InvokeInput;
  input.profile = patientProfileSchema.parse(input.profile);
  if (input.previous) input.previous = carePlanSchema.parse(input.previous);
  if (input.mode === "plan") {
    process.stdout.write(JSON.stringify(createPlan(input.profile, input.dataset, input.previous ?? null)));
    return;
  }
  if (input.mode === "synthesize") {
    const findings = input.findings;
    if (!findings) throw new Error("missing_findings");
    const plan = synthesize(
      input.profile,
      findingsSchema.parse(findings.medical),
      findingsSchema.parse(findings.equipment),
      findingsSchema.parse(findings.caregiver),
      input.previous ?? null,
    );
    process.stdout.write(JSON.stringify(plan));
    return;
  }
  process.stdout.write(JSON.stringify(runOne(input)));
}

main();
