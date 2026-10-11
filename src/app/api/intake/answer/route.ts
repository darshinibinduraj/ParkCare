import { NextResponse } from "next/server";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { answerBodySchema } from "@/lib/schemas";
import { readSessionCookie } from "@/lib/session";
import { createSession, getAnswerMap, getSession, syncProfile, upsertAnswer } from "@/lib/db/store";
import { combineAnswer, isQuestionKey, neighborKey, questionByKey } from "@/lib/questions";

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
    let intent = "next";

    if (contentType.includes("application/json")) {
      const body = answerBodySchema.parse(await request.json());
      questionKey = body.questionKey;
      answerText = body.answerText;
      skipped = body.skipped;
    } else {
      const form = await request.formData();
      questionKey = String(form.get("questionKey") ?? "");
      intent = String(form.get("intent") ?? "next");
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

    if (contentType.includes("application/json")) {
      return withSession(NextResponse.json({ ok: true }), sessionId, request);
    }

    const answers = await getAnswerMap(sessionId);
    if (intent === "back") {
      const previous = neighborKey(questionKey, answers, "back");
      const target = previous === "stay" ? questionKey : previous;
      const url = new URL("/intake", request.url);
      url.searchParams.set("q", target === "review" ? questionKey : target);
      url.searchParams.set("saved", "1");
      return withSession(NextResponse.redirect(url, 303), sessionId, request);
    }

    const next = neighborKey(questionKey, answers, "next");
    if (next === "review") {
      await syncProfile(sessionId);
      return withSession(NextResponse.redirect(new URL("/intake/review", request.url), 303), sessionId, request);
    }
    const url = new URL("/intake", request.url);
    url.searchParams.set("q", next);
    url.searchParams.set("saved", "1");
    return withSession(NextResponse.redirect(url, 303), sessionId, request);
  } catch (error) {
    return fail(error);
  }
}
