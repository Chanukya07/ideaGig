"use client";

// Shared Framer Motion setup. Every animated component takes its variants from
// useMotionPresets(), so reduced-motion handling lives in one place.

import { MotionConfig, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

export interface MotionPresets {
  /** Parent that reveals its children one after another. */
  stagger: Variants;
  /** Child of `stagger`: fades in and rises. */
  fadeUp: Variants;
  /** Skill chips: scale and fade on add and remove. */
  chip: Variants;
  /** Plain cross-fade between two views. */
  fade: Variants;
  /** Expanding panel: animates height between 0 and auto. */
  collapse: Variants;
  /** Button feedback, for whileHover and whileTap. */
  hover: { y: number } | undefined;
  tap: { scale: number } | undefined;
}

const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const fullMotion: MotionPresets = {
  stagger: { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } },
  fadeUp: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  },
  chip: {
    hidden: { opacity: 0, scale: 0.8 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.18, ease: EASE } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.12 } },
  },
  fade,
  collapse: {
    closed: { height: 0, opacity: 0, transition: { duration: 0.25, ease: EASE } },
    open: { height: "auto", opacity: 1, transition: { duration: 0.3, ease: EASE } },
  },
  hover: { y: -2 },
  tap: { scale: 0.97 },
};

// prefers-reduced-motion: no transforms or size changes, opacity only.
const reducedMotion: MotionPresets = {
  stagger: { hidden: {}, show: {} },
  fadeUp: fade,
  chip: fade,
  fade,
  collapse: {
    closed: { opacity: 0, transition: { duration: 0.15 } },
    open: { opacity: 1, transition: { duration: 0.2 } },
  },
  hover: undefined,
  tap: undefined,
};

export function useMotionPresets(): MotionPresets {
  return useReducedMotion() ? reducedMotion : fullMotion;
}

/** Also tells Framer Motion to drop transform and layout animations for reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
