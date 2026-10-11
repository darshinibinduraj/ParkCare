import { Disclaimer } from "@/components/disclaimer";
import { MainColumn } from "@/components/main-column";
import { SourceTabs } from "@/components/ui/tabs";

export const metadata = { title: "How it works" };

export default function AboutPage() {
  return (
    <MainColumn className="grid gap-6">
      <div className="grid max-w-measure gap-3">
        <h1 className="text-4xl font-bold">How ParkCare works</h1>
        <p>
          ParkCare is one intake and three helpers. They share the same story, trade short notes, and produce one
          prioritized plan.
        </p>
      </div>
      <ol className="grid max-w-measure list-decimal gap-3 pl-6">
        <li>You answer open questions. A reader turns them into a structured summary. You can edit it.</li>
        <li>The medical, equipment, and caregiver helpers each look only at their own dataset.</li>
        <li>They read the other helpers&apos; findings and may adjust their notes.</li>
        <li>A final step puts the notes into one plan, with caveats and missing information.</li>
      </ol>
      <section className="grid gap-4">
        <h2 className="text-2xl font-bold">Data sources</h2>
        <SourceTabs />
      </section>
      <section className="grid max-w-measure gap-3">
        <h2 className="text-2xl font-bold">Limits</h2>
        <ul className="grid list-disc gap-2 pl-6">
          <li>ParkCare does not diagnose, prescribe, or say what treatment to start or stop.</li>
          <li>It cannot see real appointment openings, credentials, or store prices.</li>
          <li>Simulated cards are fiction for the demo. Verified cards link to a public source.</li>
          <li>If an answer sounds urgent, the plan says to contact emergency services. ParkCare cannot assess that.</li>
          <li>There is no account, no saved history across devices, and no custom model training.</li>
        </ul>
      </section>
      <Disclaimer />
    </MainColumn>
  );
}
