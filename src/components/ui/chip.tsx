import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChipProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  children: ReactNode;
};

export function Chip({ children, className, ...props }: ChipProps) {
  return (
    <label
      className={cn(
        "inline-flex min-h-14 items-center gap-3 rounded-full border-2 border-line bg-chip px-4 text-ink has-[:checked]:border-primary has-[:checked]:bg-card",
        className,
      )}
    >
      <input type="checkbox" className="size-7 shrink-0 accent-[var(--primary)]" {...props} />
      <span>{children}</span>
    </label>
  );
}
