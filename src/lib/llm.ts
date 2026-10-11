import type { ZodType } from "zod";

function apiKey(): string | null {
  const key = process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

export function llmConfigured(): boolean {
  return apiKey() !== null;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

export async function completeJson<T>(options: {
  system: string;
  user: string;
  schema: ZodType<T>;
}): Promise<T | null> {
  const key = apiKey();
  if (!key) return null;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || "claude-sonnet-4-5",
        max_tokens: 2500,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      console.error(`llm_http_${response.status}`);
      return null;
    }
    const data = (await response.json()) as { content?: { text?: string }[] };
    const text = (data.content ?? []).map((block) => block.text ?? "").join("");
    const parsed: unknown = JSON.parse(extractJson(text));
    return options.schema.parse(parsed);
  } catch {
    console.error("llm_unavailable");
    return null;
  }
}
