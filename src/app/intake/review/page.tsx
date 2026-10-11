import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { ReviewForm } from "@/components/intake/review-form";
import { MainColumn } from "@/components/main-column";
import { ReloadIfRestored } from "@/components/intake/reload-if-restored";
import { getSession, sessionHasPlan, syncProfile } from "@/lib/db/store";
import { summaryLines } from "@/lib/copy";
import { readSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review" };

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const cookie = await readSessionCookie();
  const session = cookie ? await getSession(cookie) : null;
  if (!session) redirect("/intake");
  if (params.edit !== "1" && (await sessionHasPlan(session.id))) redirect("/api/session/restart");
  const profile = await syncProfile(session.id);
  const lines = summaryLines(profile);

  return (
    <MainColumn className="grid gap-6">
      <ReloadIfRestored />
      <div className="grid max-w-measure gap-3">
        <h1 className="text-4xl font-bold">Here is what we understood</h1>
        <p>Please correct anything that is wrong before the helpers run. Unknown items show as not provided.</p>
        {profile.extractionMethod === "llm" ? (
          <p>
            An AI service read your words to fill this in. Check every line. We do not ask for your name, so a name was
            not sent.
          </p>
        ) : (
          <p>
            A simple reader on this server filled this in from your words. No outside AI service saw the answers,
            because an AI key is not set.
          </p>
        )}
      </div>
      <ul className="grid max-w-measure gap-2 rounded-2xl border-2 border-line bg-card p-4">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <details className="max-w-measure">
        <summary className="min-h-14 cursor-pointer font-bold">Your words</summary>
        <ul className="mt-3 grid gap-2">
          {Object.entries(profile.rawAnswers).map(([key, value]) => (
            <li key={key}>
              <span className="font-bold">{key}. </span>
              {value || "Skipped"}
            </li>
          ))}
        </ul>
      </details>
      <p>
        <Link className="inline-flex min-h-14 items-center underline" href="/intake?q=q1">
          Back to questions
        </Link>
      </p>
      <ReviewForm initial={profile} />
      <noscript>
        <form action="/api/care-plan/run" method="post" className="mt-4">
          <button className="min-h-14 rounded-2xl border-2 border-primary bg-primary px-4 font-bold text-on-primary" type="submit">
            Make my care plan from this summary
          </button>
        </form>
      </noscript>
      <Disclaimer />
    </MainColumn>
  );
}
