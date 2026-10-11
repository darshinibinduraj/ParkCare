import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { LogoLockup } from "@/components/logo";
import { MainColumn } from "@/components/main-column";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const params = await searchParams;
  return (
    <MainColumn className="grid gap-8">
      {params.deleted === "1" ? (
        <p role="status" className="rounded-2xl border-2 border-line bg-card p-4 font-bold">
          Your saved answers and plan were deleted from this device.
        </p>
      ) : null}
      <LogoLockup />
      <div className="grid max-w-measure gap-4">
        <h1 className="text-4xl font-bold">Sort out next steps for Parkinson&apos;s care</h1>
        <p className="text-lead">
          Tell us what is going on, in your own words. Three helpers compare notes and give you one plan. It is
          information, not a diagnosis.
        </p>
      </div>
      <div className="flex flex-wrap gap-4">
        <Button asChild>
          <Link href="/intake">Start</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/demo">Try an example</Link>
        </Button>
      </div>
      <div className="grid gap-4">
        <Card>
          <h2 className="text-2xl font-bold">Medical helper</h2>
          <p>Looks at movement changes, falls, and place. Points to public directories and health center sites.</p>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold">Equipment helper</h2>
          <p>Shares home-safety and daily-living guidance from public sources. It does not prescribe a device or invent a price.</p>
        </Card>
        <Card>
          <h2 className="text-2xl font-bold">Caregiver helper</h2>
          <p>Matches support needs and home life to public helplines. It does not assign a caregiver.</p>
        </Card>
      </div>
      <section className="grid max-w-measure gap-3">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="grid list-decimal gap-3 pl-6">
          <li>Answer one question at a time. Speak, type, or tap. Skip anything.</li>
          <li>Check what we understood. Fix anything we got wrong.</li>
          <li>Read one plan with next steps, sources, and caveats.</li>
        </ol>
        <p>The helpers read the same story, then leave notes for each other before the plan is written.</p>
      </section>
      <section className="grid max-w-measure gap-3">
        <h2 className="text-2xl font-bold">Privacy in short</h2>
        <p>
          We do not ask for your name, email, street address, or insurance number. A city or ZIP code is enough. Answers
          stay for 7 days, then they are deleted. You can delete them sooner.
        </p>
        <p>
          <Link className="underline" href="/privacy">
            Read the privacy notice
          </Link>
        </p>
      </section>
      <Disclaimer />
    </MainColumn>
  );
}
