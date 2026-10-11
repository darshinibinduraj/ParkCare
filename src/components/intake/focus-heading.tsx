"use client";

import { useEffect } from "react";

export function FocusHeading({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.focus();
  }, [id]);
  return null;
}
