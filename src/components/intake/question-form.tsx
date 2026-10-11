"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Chip } from "@/components/ui/chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TextArea } from "@/components/ui/textarea";
import { Autosave } from "@/components/intake/autosave";
import { FocusHeading } from "@/components/intake/focus-heading";
import { VoiceInput } from "@/components/intake/voice-input";
import { combineAnswer, type Question } from "@/lib/questions";

type Intent = "next" | "back" | "skip";

function intentFrom(event: FormEvent<HTMLFormElement>): Intent {
  const submitter = (event.nativeEvent as SubmitEvent).submitter;
  const value = submitter instanceof HTMLButtonElement ? submitter.value : "next";
  if (value === "back" || value === "skip") return value;
  return "next";
}

function answerFrom(form: HTMLFormElement, question: Question, intent: Intent) {
  if (intent === "skip") return { answerText: "", skipped: true };
  const data = new FormData(form);
  const typed = String(data.get("answerText") ?? "");
  if (question.kind === "choice") {
    const answerText = question.choices?.some((choice) => choice.value === typed) ? typed : "";
    return { answerText, skipped: false };
  }
  const chips = data.getAll("chips").map(String);
  return { answerText: combineAnswer(typed, chips, question.chips), skipped: false };
}

export function QuestionForm({
  question,
  index,
  total,
  text,
  chips,
  saved,
  showReviewLink,
}: {
  question: Question;
  index: number;
  total: number;
  text: string;
  chips: string[];
  saved: boolean;
  showReviewLink: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(saved ? "Saved" : "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const intent = intentFrom(event);
    const { answerText, skipped } = answerFrom(form, question, intent);
    setPending(true);
    setStatus("Saving");
    try {
      const response = await fetch("/api/intake/answer", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ questionKey: question.key, answerText, skipped, intent }),
        redirect: "manual",
      });
      if (!response.ok) {
        setStatus("Not saved yet. Stay on this question and try again.");
        setPending(false);
        return;
      }
      const payload = (await response.json()) as { href?: string };
      if (!payload.href || !payload.href.startsWith("/")) {
        setStatus("Not saved yet. Stay on this question and try again.");
        setPending(false);
        return;
      }
      const from = `${window.location.pathname}${window.location.search}`;
      router.push(payload.href);
      window.setTimeout(() => {
        const now = `${window.location.pathname}${window.location.search}`;
        if (now === from) window.location.assign(payload.href);
      }, 1500);
    } catch {
      setStatus("Not saved yet. Stay on this question and try again.");
      setPending(false);
    }
  }

  return (
    <form id="intake-form" action="/api/intake/answer" method="post" className="grid gap-6 pb-40" autoComplete="off" onSubmit={onSubmit} aria-busy={pending}>
      <FocusHeading id="question-title" />
      <Autosave questionKey={question.key} chips={question.chips} />
      <ProgressBar current={index + 1} total={total} />
      <div className="grid max-w-measure gap-3">
        <h1 id="question-title" tabIndex={-1} className="text-3xl font-bold outline-none">
          {question.prompt}
        </h1>
        <p id="question-help">{question.help}</p>
      </div>
      <input type="hidden" name="questionKey" value={question.key} />
      {question.kind === "choice" ? (
        <fieldset className="grid gap-4" aria-labelledby="question-title">
          <legend className="sr-only">{question.prompt}</legend>
          {question.choices?.map((choice) => (
            <label
              key={choice.value}
              className="flex min-h-[56px] items-center gap-4 rounded-2xl border-2 border-line bg-card px-4 has-[:checked]:border-primary"
            >
              <input
                className="size-7 shrink-0"
                type="radio"
                name="answerText"
                value={choice.value}
                defaultChecked={text === choice.value}
              />
              <span className="font-bold">{choice.label}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="grid gap-4">
          <TextArea
            id="answer-text"
            name="answerText"
            defaultValue={text}
            aria-labelledby="question-title"
            aria-describedby="question-help"
            maxLength={4000}
            autoComplete="off"
          />
          <VoiceInput />
          {question.chips.length > 0 ? (
            <fieldset className="grid gap-3">
              <legend className="font-bold">Or tap a short answer</legend>
              <div className="flex flex-wrap gap-4">
                {question.chips.map((chip) => (
                  <Chip key={chip} name="chips" value={chip} defaultChecked={chips.includes(chip)}>
                    {chip}
                  </Chip>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>
      )}
      <p id="save-status" role="status" aria-live="polite">
        {status}
      </p>
      {showReviewLink ? (
        <p>
          <a className="inline-flex min-h-14 items-center underline" href="/intake/review">
            Check what we understood
          </a>
        </p>
      ) : null}
      <div className="no-print fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-canvas">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 px-4 py-4">
          <button
            className="min-h-[56px] min-w-[56px] rounded-2xl border-2 border-line bg-card px-2 font-bold leading-tight disabled:opacity-70"
            type="submit"
            name="intent"
            value="back"
            disabled={pending || index === 0}
          >
            Back
          </button>
          <button
            className="min-h-[56px] min-w-[56px] rounded-2xl border-2 border-line bg-card px-2 font-bold leading-tight disabled:opacity-70"
            type="submit"
            name="intent"
            value="skip"
            disabled={pending}
          >
            Skip for now
          </button>
          <button
            className="min-h-[56px] min-w-[56px] rounded-2xl border-2 border-primary bg-primary px-2 font-bold leading-tight text-on-primary disabled:opacity-70"
            type="submit"
            name="intent"
            value="next"
            disabled={pending}
          >
            Next
          </button>
        </div>
      </div>
    </form>
  );
}
