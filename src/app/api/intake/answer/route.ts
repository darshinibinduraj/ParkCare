import { NextResponse } from "next/server";
import { fail, jsonError, relativeRedirect, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { answerBodySchema } from "@/lib/schemas";
import { readSessionCookie } from "@/lib/session";
import { createSession, getAnswerMap, getSession, syncProfile, upsertAnswer } from "@/lib/db/store";
import { combineAnswer, intakeDestination, isQuestionKey, questionByKey, type QuestionKey } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function currentSession(): Promise<string> {
  const cookie = await readSessionCookie();
  if (cookie) {
    const row = await getSession(cookie);
    if (row) return row.id;
  }
  return createSession();
}

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "answer"), 60)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const contentType = request.headers.get("content-type") ?? "";
    let questionKey = "";
    let answerText = "";
    let skipped = false;
    let intent: "next" | "back" | "skip" | null = null;

    if (contentType.includes("application/json")) {
      const body = answerBodySchema.parse(await request.json());
      questionKey = body.questionKey;
      answerText = body.answerText;
      skipped = body.skipped;
      intent = body.intent ?? null;
      if (intent === "skip") {
        skipped = true;
        answerText = "";
      }
    } else {
      const form = await request.formData();
      questionKey = String(form.get("questionKey") ?? "");
      const rawIntent = String(form.get("intent") ?? "next");
      intent = rawIntent === "back" || rawIntent === "skip" ? rawIntent : "next";
      const typed = String(form.get("answerText") ?? "");
      const chips = form.getAll("chips").map(String);
      skipped = intent === "skip";
      if (!isQuestionKey(questionKey)) return jsonError("That question is not part of the intake.", 400);
      const question = questionByKey(questionKey);
      if (skipped) answerText = "";
      else if (question.kind === "choice") {
        answerText = question.choices?.some((choice) => choice.value === typed) ? typed : "";
      } else {
        answerText = combineAnswer(typed, chips, question.chips);
      }
    }

    if (!isQuestionKey(questionKey)) return jsonError("That question is not part of the intake.", 400);
    answerBodySchema.parse({ questionKey, answerText, skipped });
    const sessionId = await currentSession();
    await upsertAnswer(sessionId, questionKey, skipped ? "" : answerText, skipped);

    if (!intent) {
      return withSession(NextResponse.json({ ok: true }), sessionId, request);
    }

    const answers = await getAnswerMap(sessionId);
    const href = intakeDestination(questionKey as QuestionKey, answers, intent);
    if (href === "/intake/review") await syncProfile(sessionId);

    if (contentType.includes("application/json")) {
      return withSession(NextResponse.json({ ok: true, href }), sessionId, request);
    }

    return withSession(relativeRedirect(href), sessionId, request);
  } catch (error) {
    return fail(error);
  }
}
