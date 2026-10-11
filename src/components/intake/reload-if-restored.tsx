"use client";

import { useEffect } from "react";

const RELOAD_GUARD = "parkcare-restored-reload";

/** A restored page can still show the previous person's typed answers. Reload once so the server can start clean. */
export function ReloadIfRestored() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const last = Number(sessionStorage.getItem(RELOAD_GUARD) || 0);
      if (Date.now() - last < 4000) return;
      sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
      window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
