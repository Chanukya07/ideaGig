"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { useMotionPresets } from "./motion";

type Variant = "primary" | "secondary" | "quiet";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold " +
  "transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-55";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white shadow-card hover:bg-accent-strong",
  secondary: "border border-line bg-surface text-ink hover:border-ink-soft",
  quiet: "text-ink-soft underline-offset-4 hover:text-ink hover:underline",
};

export function buttonClasses(variant: Variant = "secondary", className = ""): string {
  return `${BASE} ${VARIANTS[variant]} ${className}`;
}

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "disabled"> {
  variant?: Variant;
  /**
   * Blocks clicks but keeps the button focusable (aria-disabled, not disabled),
   * so keyboard focus is not lost while a request runs.
   */
  inactive?: boolean;
}

export function Button({
  variant = "secondary",
  inactive = false,
  className = "",
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  const m = useMotionPresets();
  return (
    <motion.button
      type={type}
      aria-disabled={inactive || undefined}
      whileHover={inactive ? undefined : m.hover}
      whileTap={inactive ? undefined : m.tap}
      className={buttonClasses(variant, className)}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    />
  );
}
