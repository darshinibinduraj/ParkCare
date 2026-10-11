import { Disclaimer } from "@/components/disclaimer";
import { MainColumn } from "@/components/main-column";
import { Card } from "@/components/ui/card";
import { DEMO_SCENARIOS } from "@/lib/demo-scenarios";

export const metadata = { title: "Example stories" };

export default function DemoPage() {
  return (
    <MainColumn className="grid gap-6">
      <div className="grid max-w-measure gap-3">
        <h1 className="text-4xl font-bold">Example stories</h1>
        <p>
          Pick a situation to fill the intake and open a plan. On the plan page you can change the budget or the
          amount of help and run it again.
        </p>
      </div>
      {DEMO_SCENARIOS.map((scenario) => (
        <Card key={scenario.id} className="grid gap-4">
          <h2 className="text-2xl font-bold">{scenario.title}</h2>
          <p>{scenario.summary}</p>
          <form action="/api/demo/start" method="post">
            <input type="hidden" name="scenarioId" value={scenario.id} />
            <button className="min-h-14 rounded-2xl border-2 border-primary bg-primary px-5 font-bold text-on-primary" type="submit">
              Use this story
            </button>
          </form>
        </Card>
      ))}
      <Disclaimer />
    </MainColumn>
  );
}
