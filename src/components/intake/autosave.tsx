"use client";

import { useEffect } from "react";
import { combineAnswer, type QuestionKey } from "@/lib/questions";

export function Autosave({ questionKey, chips }: { questionKey: QuestionKey; chips: string[] }) {
  useEffect(() => {
    const form = document.getElementById("intake-form");
    if (!(form instanceof HTMLFormElement)) return;
    let timer = 0;
    const status = document.getElementById("save-status");

    const save = () => {
      const data = new FormData(form);
      const typed = String(data.get("answerText") ?? "");
      const selected = data.getAll("chips").map(String);
      const answerText = combineAnswer(typed, selected, chips);
      if (status) status.textContent = "Saving";
      void fetch("/api/intake/answer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questionKey, answerText, skipped: false }),
      })
        .then((response) => {
          if (status) status.textContent = response.ok ? "Saved" : "Not saved yet. Use Next to try again.";
        })
        .catch(() => {
          if (status) status.textContent = "Not saved yet. Use Next to try again.";
        });
    };

    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 700);
    };

    form.addEventListener("input", onChange);
    form.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(timer);
      form.removeEventListener("input", onChange);
      form.removeEventListener("change", onChange);
    };
  }, [chips, questionKey]);

  return null;
}
