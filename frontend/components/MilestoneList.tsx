"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState } from "react";

import type { Milestone } from "@/lib/types";

import { useMotionPresets } from "./motion";

export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const m = useMotionPresets();

  return (
    <motion.div layout="position" className="border-t border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-none px-5 text-left hover:bg-sunken/60 sm:px-7"
      >
        <span className="font-display text-base font-bold text-ink">
          Milestones
          <span className="ml-2 font-sans text-sm font-normal text-ink-soft">
            {milestones.length} steps
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-5 shrink-0 text-ink-soft transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            variants={m.collapse}
            initial="closed"
            animate="open"
            exit="closed"
            className="overflow-hidden"
          >
            <ol className="space-y-4 px-5 pb-6 pt-1 sm:px-7">
              {milestones.map((milestone, index) => (
                <li key={`${index}-${milestone.title}`} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-xs font-bold text-accent-strong"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{milestone.title}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">{milestone.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
