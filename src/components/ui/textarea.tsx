import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full rounded-2xl border-2 border-line bg-card px-4 py-3 text-ink",
        className,
      )}
      {...props}
    />
  );
}
