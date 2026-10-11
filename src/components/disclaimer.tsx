import { DISCLAIMER } from "@/lib/copy";
import { cn } from "@/lib/utils";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <aside aria-label="Important" className={cn("rounded-2xl border-2 border-line bg-card p-4", className)}>
      <p className="font-bold">Important</p>
      <p className="max-w-measure">{DISCLAIMER}</p>
    </aside>
  );
}
