"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "motion-color inline-flex items-center justify-center gap-2 rounded-2xl border-2 px-4 text-center font-bold leading-tight min-h-[56px] min-w-[56px] disabled:cursor-not-allowed disabled:opacity-70",
  {
    variants: {
      variant: {
        primary: "border-primary bg-primary text-on-primary",
        secondary: "border-line bg-card text-ink",
        quiet: "border-transparent bg-transparent text-ink underline",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant }), className)}
      {...(asChild ? {} : { type: type ?? "button" })}
      {...props}
    />
  );
}
