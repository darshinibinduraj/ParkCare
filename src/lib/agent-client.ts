import type { Dataset } from "@/lib/resources";
import type { AgentMessage, CarePlan, PatientProfile } from "@/lib/schemas";
import { agentMessageSchema, carePlanSchema } from "@/lib/schemas";
import { z } from "zod";

const responseSchema = z.object({
  transport: z.enum(["slim", "local-fallback"]),
  plan: carePlanSchema,
  messages: z.array(agentMessageSchema),
});

export type AgentRunResult = {
  transport: "slim" | "local-fallback";
  plan: CarePlan;
  messages: AgentMessage[];
};

export function agentsUrl(): string {
  return process.env.AGENTS_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";
}

export async function requestAgentPlan(
  profile: PatientProfile,
  dataset: Dataset,
  previous: CarePlan | null,
): Promise<AgentRunResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${agentsUrl()}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile, dataset, previous }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return responseSchema.parse(await response.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
