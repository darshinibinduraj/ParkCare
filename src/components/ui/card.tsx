import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <article
      className={cn("card rounded-2xl border-2 border-line bg-card p-5 text-ink", className)}
      {...props}
    />
  );
}
