import assert from "node:assert/strict";
import test from "node:test";
import { fallsQuestionRelevant, neighborKey, visibleQuestions } from "./questions";

test("falls question appears only after balance, walking, or falls", () => {
  assert.equal(fallsQuestionRelevant({ q3: "Mild tremor in my hand." }), false);
  assert.equal(fallsQuestionRelevant({ q3: "I feel unsteady and I fall often." }), true);
  const hidden = visibleQuestions({ q3: "Mild tremor." });
  assert.equal(hidden.some((question) => question.key === "q5"), false);
  const shown = visibleQuestions({ q3: "Trouble walking." });
  assert.equal(shown.some((question) => question.key === "q5"), true);
});

test("next and back move through the visible questions", () => {
  const answers = { q3: "Balance problems" };
  assert.equal(neighborKey("q4", answers, "next"), "q5");
  assert.equal(neighborKey("q1", {}, "back"), "stay");
  assert.equal(neighborKey("q10", {}, "next"), "review");
});
