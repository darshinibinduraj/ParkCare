import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "ai" | "neutral";
  className?: string;
}) {
  const toneClass = {
    success: "border-success text-success",
    warning: "border-warning text-warning",
    ai: "border-ai text-ai",
    neutral: "border-line text-ink",
  }[tone];
  return (
    <span className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border-2 px-3 py-1 font-bold", toneClass, className)}>
      {children}
    </span>
  );
}
