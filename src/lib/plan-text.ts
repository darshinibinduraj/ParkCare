import { AGENT_LABEL, DISCLAIMER } from "@/lib/copy";
import type { AgentMessage } from "@/lib/schemas";
import type { PlanView } from "@/lib/db/store";

export function messageHeading(message: Pick<AgentMessage, "sender" | "recipients">): string {
  const to = message.recipients.map((recipient) => AGENT_LABEL[recipient as keyof typeof AGENT_LABEL] ?? recipient);
  return `${AGENT_LABEL[message.sender]} → ${to.join(" + ")}`;
}

export function planPlainText(view: PlanView): string {
  const lines = [
    "ParkCare plan",
    DISCLAIMER,
    "",
    view.plan.patientSummary,
    "",
    "Next steps",
    ...view.plan.steps.map((step) => `${step.priority}. ${step.title} ${step.why}`),
    "",
    "Caveats",
    ...view.plan.caveats.map((caveat) => `- ${caveat}`),
  ];
  if (view.plan.missingInformation.length) {
    lines.push("", "Missing information", ...view.plan.missingInformation.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}
