"use client";

import { useEffect } from "react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("page_error");
  }, []);
  return (
    <main id="main" tabIndex={-1} className="mx-auto grid max-w-3xl gap-4 px-4 py-8">
      <h1 className="text-4xl font-bold">Something went wrong</h1>
      <p>Please try again. Your answers may still be saved.</p>
      <button className="min-h-14 rounded-2xl border-2 border-primary bg-primary px-4 font-bold text-on-primary" type="button" onClick={() => reset()}>
        Try again
      </button>
    </main>
  );
}
