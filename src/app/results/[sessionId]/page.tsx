import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { MainColumn } from "@/components/main-column";
import { AgentMessageLog } from "@/components/results/agent-message-log";
import { PlanCard } from "@/components/results/plan-card";
import { ResourceCard } from "@/components/results/resource-card";
import { ResultsActions } from "@/components/results/results-actions";
import { Card } from "@/components/ui/card";
import { BUDGET_LABEL, summaryLines, SUPPORT_LABEL } from "@/lib/copy";
import { getPlanView, getSession } from "@/lib/db/store";
import { planPlainText } from "@/lib/plan-text";
import type { Recommendation } from "@/lib/schemas";
import { budgetSchema, supportSchema } from "@/lib/schemas";
import type { PlanView } from "@/lib/db/store";
import { readSessionCookie } from "@/lib/session";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your care plan" };

function ResourceList({
  title,
  items,
  resources,
  generatedBy,
}: {
  title: string;
  items: Recommendation[];
  resources: PlanView["resources"];
  generatedBy: "llm" | "builtin";
}) {
  return (
    <section className="grid gap-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {items.length === 0 ? <p>Nothing from this helper matched the answers.</p> : null}
      {items.map((item) => {
        if (!item.resourceId) return null;
        const resource = resources[item.resourceId];
        if (!resource) return null;
        return <ResourceCard key={item.resourceId} resource={resource} why={item.why} generatedBy={generatedBy} />;
      })}
    </section>
  );
}

export default async function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const view = await getPlanView(sessionId);
  if (!view) {
    return (
      <MainColumn className="grid gap-4">
        <h1 className="text-4xl font-bold">No plan yet</h1>
        <p>This session does not have a care plan. Start the intake or pick a demo story.</p>
        <Link className="inline-flex min-h-14 items-center underline" href="/intake">
          Start
        </Link>
      </MainColumn>
    );
  }
  const cookie = await readSessionCookie();
  const ownerSession = cookie ? await getSession(cookie) : null;
  const isOwner = ownerSession?.id === sessionId;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  const url = `${proto}://${host}/results/${sessionId}`;
  const budgets = budgetSchema.options.filter((item) => item !== "unknown");
  const supports = supportSchema.options.filter((item) => item !== "unknown");

  return (
    <MainColumn className="grid max-w-4xl gap-8">
      <p className="print-only hidden font-bold print:block">{view.plan.patientSummary}</p>
      <div className="grid max-w-measure gap-3">
        <h1 className="text-4xl font-bold">Your care plan</h1>
        <p>{view.plan.patientSummary}</p>
      </div>
      {view.plan.urgent.active ? (
        <aside role="alert" className="rounded-2xl border-2 border-danger p-4">
          <p className="font-bold">This may be urgent</p>
          <p>{view.plan.urgent.message}</p>
        </aside>
      ) : null}
      <Disclaimer />
      <PlanCard plan={view.plan} />
      <Card>
        <h2 className="text-2xl font-bold">Patient summary</h2>
        <ul className="mt-3 grid gap-2">
          {summaryLines(view.profile).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
      <ResourceList title="Medical recommendations" items={view.plan.medical} resources={view.resources} generatedBy={view.plan.generatedBy} />
      <ResourceList title="Equipment recommendations" items={view.plan.equipment} resources={view.resources} generatedBy={view.plan.generatedBy} />
      <ResourceList title="Caregiver recommendations" items={view.plan.caregiver} resources={view.resources} generatedBy={view.plan.generatedBy} />
      <AgentMessageLog messages={view.messages} />
      <Card className="grid gap-3">
        <h2 className="text-2xl font-bold">Caveats and missing information</h2>
        <ul className="grid list-disc gap-2 pl-6">
          {view.plan.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        {view.plan.missingInformation.length > 0 ? (
          <>
            <h3 className="text-xl font-bold">Still missing</h3>
            <ul className="grid list-disc gap-2 pl-6">
              {view.plan.missingInformation.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
      {view.plan.comparisonNote ? (
        <Card>
          <h2 className="text-2xl font-bold">What changed</h2>
          <p>{view.plan.comparisonNote}</p>
        </Card>
      ) : null}
      <ResultsActions summary={planPlainText(view)} url={url} />
      {isOwner ? (
        <Card className="no-print grid gap-4">
          <h2 className="text-2xl font-bold">Change an answer and rerun</h2>
          <p>Try a different budget or a different amount of help. The new plan shows what was added or removed.</p>
          <form action="/api/care-plan/run" method="post" className="grid gap-4">
            <input type="hidden" name="sessionId" value={sessionId} />
            <fieldset className="grid gap-3">
              <legend className="font-bold">Budget</legend>
              {budgets.map((budget) => (
                <label key={budget} className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line px-4">
                  <input className="size-7" type="radio" name="budget" value={budget} defaultChecked={view.plan.inputs.budget === budget} />
                  {BUDGET_LABEL[budget]}
                </label>
              ))}
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="font-bold">Help needed</legend>
              {supports.map((support) => (
                <label key={support} className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line px-4">
                  <input
                    className="size-7"
                    type="radio"
                    name="supportNeeds"
                    value={support}
                    defaultChecked={view.plan.inputs.supportNeeds === support}
                  />
                  {SUPPORT_LABEL[support]}
                </label>
              ))}
            </fieldset>
            <button className="min-h-14 rounded-2xl border-2 border-primary bg-primary px-4 font-bold text-on-primary" type="submit">
              Update my plan
            </button>
          </form>
          <p>
            <Link className="inline-flex min-h-14 items-center underline" href="/intake/review">
              Edit the full summary
            </Link>
          </p>
          <form action="/api/session/delete" method="post" className="grid gap-3">
            <label className="flex min-h-14 items-center gap-4">
              <input className="size-7" type="checkbox" name="confirm" value="yes" required />
              Yes, delete my answers and plan.
            </label>
            <button className="min-h-14 rounded-2xl border-2 border-danger px-4 font-bold text-danger" type="submit">
              Delete my data
            </button>
          </form>
        </Card>
      ) : (
        <p className="no-print">This is a shared view. Budget changes stay on the device that created the plan.</p>
      )}
    </MainColumn>
  );
}
