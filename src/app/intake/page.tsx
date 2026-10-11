import { redirect } from "next/navigation";
import { QuestionForm } from "@/components/intake/question-form";
import { MainColumn } from "@/components/main-column";
import { getAnswerRows, getSession } from "@/lib/db/store";
import { isQuestionKey, questionByKey, resumeKey, splitStoredAnswer, visibleQuestions, type QuestionKey } from "@/lib/questions";
import { readSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Intake" };

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const cookie = await readSessionCookie();
  const session = cookie ? await getSession(cookie) : null;
  const rows = session ? await getAnswerRows(session.id) : [];
  const answers: Record<string, string> = {};
  for (const row of rows) answers[row.questionKey] = row.skipped ? "" : row.answerText;
  const answered = new Set(rows.map((row) => row.questionKey));
  const visible = visibleQuestions(answers);

  let key: QuestionKey = visible[0]?.key ?? "q1";
  if (!params.q) {
    const resume = resumeKey(answers, answered);
    if (resume === "review") redirect("/intake/review");
    key = resume;
  } else if (isQuestionKey(params.q) && visible.some((question) => question.key === params.q)) {
    key = params.q;
  }
  const question = questionByKey(key);
  const index = Math.max(0, visible.findIndex((item) => item.key === key));
  const stored = splitStoredAnswer(answers[key] ?? "", question.chips);

  return (
    <MainColumn className="py-4">
      <QuestionForm
        question={question}
        index={index}
        total={visible.length}
        text={stored.text}
        chips={stored.chips}
        saved={params.saved === "1"}
        showReviewLink={Boolean(session) && answered.size > 0}
      />
    </MainColumn>
  );
}
