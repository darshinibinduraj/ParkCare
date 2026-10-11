"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResultsActions({ summary, url }: { summary: string; url: string }) {
  const [status, setStatus] = useState("");

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(label);
    } catch {
      setStatus("Select the text below and copy it.");
    }
  }

  return (
    <div className="no-print grid gap-4">
      <div className="flex flex-wrap gap-4">
        <Button type="button" onClick={() => window.print()}>
          Print or save as PDF
        </Button>
        <Button type="button" variant="secondary" onClick={() => copy(url, "Link copied")}>
          Copy link
        </Button>
        <Button type="button" variant="secondary" onClick={() => copy(summary, "Summary copied")}>
          Copy summary
        </Button>
      </div>
      <p role="status" aria-live="polite">
        {status}
      </p>
      <label className="grid gap-2 font-bold">
        Share this plan
        <input className="min-h-14 rounded-2xl border-2 border-line bg-card px-4 font-normal" readOnly value={url} />
      </label>
    </div>
  );
}
