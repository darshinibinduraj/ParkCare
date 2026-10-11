import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MainColumn({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main" tabIndex={-1} className={cn("mx-auto w-full max-w-3xl px-4 py-8 outline-none", className)}>
      {children}
    </main>
  );
}
