"use client";

import { useEffect } from "react";

/** A restored page can still show the previous person's typed answers. Reload so the server can start clean. */
export function ReloadIfRestored() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
