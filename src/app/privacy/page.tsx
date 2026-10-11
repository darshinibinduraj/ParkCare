import { Disclaimer } from "@/components/disclaimer";
import { MainColumn } from "@/components/main-column";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <MainColumn className="grid max-w-measure gap-6">
      <h1 className="text-4xl font-bold">Privacy notice</h1>
      <section className="grid gap-3">
        <h2 className="text-2xl font-bold">What we collect</h2>
        <p>
          Your answers about Parkinson&apos;s changes, falls, who is at home, the help you need, a city or ZIP code, budget,
          and preferences such as language or schedule. We also store the plan and the helpers&apos; notes.
        </p>
        <p>We do not ask for your name, email, street address, date of birth, or insurance number.</p>
      </section>
      <section className="grid gap-3">
        <h2 className="text-2xl font-bold">Who sees it</h2>
        <p>
          Answers stay on the ParkCare server for this anonymous session. If the server has an AI key, answer text may
          be sent to Anthropic to fill the summary and rewrite explanations. Resource choices still come only from
          ParkCare&apos;s dataset. If no key is set, nothing is sent to an outside AI service.
        </p>
        <p>You do not need to use your name. A city or ZIP code is enough to look for nearby resources.</p>
      </section>
      <section className="grid gap-3">
        <h2 className="text-2xl font-bold">How long we keep it</h2>
        <p>
          The session cookie lasts 7 days. After that, the answers and plan are deleted. Anyone with the plan link can
          view that plan until then. Deleting from this device works only in the browser that created the session.
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="text-2xl font-bold">Delete my data</h2>
        {params.error === "confirm" ? (
          <p role="alert">Check the box to confirm, then delete.</p>
        ) : null}
        <form action="/api/session/delete" method="post" className="grid gap-4">
          <label className="flex min-h-14 items-center gap-4 rounded-2xl border-2 border-line px-4">
            <input className="size-7" type="checkbox" name="confirm" value="yes" />
            Yes, delete my answers and plan on this device.
          </label>
          <button className="min-h-14 rounded-2xl border-2 border-danger px-4 font-bold text-danger" type="submit">
            Delete my data
          </button>
        </form>
      </section>
      <Disclaimer />
    </MainColumn>
  );
}
