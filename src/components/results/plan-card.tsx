import { Card } from "@/components/ui/card";
import type { CarePlan } from "@/lib/schemas";

const PLAN_AGENT_LABEL = {
  medical: "Medical agent",
  equipment: "Equipment agent",
  caregiver: "Caregiver agent",
} as const;

export function PlanCard({ plan }: { plan: CarePlan }) {
  return (
    <Card className="grid gap-4">
      <h2 className="text-2xl font-bold">Coordinated care plan</h2>
      <ol className="grid gap-4">
        {plan.steps.map((step) => (
          <li key={step.priority} className="grid gap-2 rounded-2xl border-2 border-line p-4">
            <p className="text-xl font-bold">
              {step.priority}. {step.title}
            </p>
            <p className="ai-note">
              <strong>{plan.generatedBy === "llm" ? "AI-generated explanation. " : "Generated explanation. "}</strong>
              {step.why}
            </p>
            <p>From: {step.agents.map((agent) => PLAN_AGENT_LABEL[agent]).join(", ")}.</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
