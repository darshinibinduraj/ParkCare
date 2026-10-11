import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ResourceCard as ResourceCardData } from "@/lib/db/store";
import { formatWhen } from "@/lib/utils";
import { AlertTriangle, Check } from "lucide-react";

export function ResourceCard({
  resource,
  why,
  generatedBy,
}: {
  resource: ResourceCardData;
  why: string;
  generatedBy: "llm" | "builtin";
}) {
  const explanationLabel =
    generatedBy === "llm" ? "AI-generated explanation" : "Generated explanation";
  return (
    <Card className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        {resource.simulated ? (
          <Badge tone="warning">
            <AlertTriangle aria-hidden="true" /> Confirm details
          </Badge>
        ) : resource.verified ? (
          <Badge tone="success">
            <Check aria-hidden="true" /> Verified data
          </Badge>
        ) : (
          <Badge tone="warning">
            <AlertTriangle aria-hidden="true" /> Not verified
          </Badge>
        )}
      </div>
      <h3 className="text-2xl font-bold">{resource.name}</h3>
      <p>{resource.detail}</p>
      <p>{resource.description}</p>
      <p>{resource.where}</p>
      {resource.phone ? (
        <p>
          <a className="inline-flex min-h-14 items-center underline" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>
            {resource.phone}
          </a>
        </p>
      ) : null}
      {resource.website ? (
        <p>
          <a className="inline-flex min-h-14 items-center underline" href={resource.website}>
            Open source link
          </a>
        </p>
      ) : (
        <p>No link is listed. ParkCare does not invent links.</p>
      )}
      <p>{resource.priceLabel ?? "No price is listed. ParkCare does not invent prices."}</p>
      {resource.extra ? <p>{resource.extra}</p> : null}
      <p>
        Source: {resource.source}. Last verified: {formatWhen(resource.lastVerified)}.
      </p>
      <p className="ai-note">
        <strong>{explanationLabel}. </strong>
        {generatedBy === "builtin"
          ? "Written by ParkCare's built-in planner on this server. Not a verified fact. "
          : "Written by an AI model. Not a verified fact. "}
        {why}
      </p>
    </Card>
  );
}
