import assert from "node:assert/strict";
import test from "node:test";
import { sectionSpeech } from "./section-speech";

test("section speech keeps one result and drops blank lines", () => {
  const spoken = sectionSpeech([
    "Verified data",
    "Clear floors and walkways",
    "",
    "Keep walkways open.",
    "   ",
    "Source: Parkinson's Foundation Home Safety page, paraphrased.",
  ]);
  assert.equal(
    spoken,
    "Verified data. Clear floors and walkways. Keep walkways open. Source: Parkinson's Foundation Home Safety page, paraphrased.",
  );
  assert.equal(spoken.includes("Rolling walker"), false);
});

test("section speech collapses a doubled period in one line", () => {
  const spoken = sectionSpeech(["Source: Parkinson's Foundation Home Safety page, paraphrased.. Last verified: September 1, 2026."]);
  assert.equal(spoken, "Source: Parkinson's Foundation Home Safety page, paraphrased. Last verified: September 1, 2026.");
});
