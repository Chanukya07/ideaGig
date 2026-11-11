"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, type ReactNode } from "react";

import type { Difficulty, Idea } from "@/lib/types";

import { MilestoneList } from "./MilestoneList";
import { useMotionPresets } from "./motion";

const DIFFICULTY: Record<Difficulty, { label: string; level: number }> = {
  easy: { label: "Easy", level: 1 },
  medium: { label: "Medium", level: 2 },
  hard: { label: "Hard", level: 3 },
};

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const { label, level } = DIFFICULTY[difficulty];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-ink">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            style={{ height: `${4 + step * 3}px` }}
            className={`w-1 rounded-sm ${step <= level ? "bg-accent" : "bg-line"}`}
          />
        ))}
      </span>
      {label}
    </span>
  );
}

function ScopeList({ title, items, marker }: { title: string; items: string[]; marker: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">{title}</h3>
      <ul className="mt-2 space-y-1.5 text-[0.95rem] text-ink">
        {items.map((item, index) => (
          <li key={`${index}-${item}`} className="flex gap-2.5">
            <span aria-hidden="true" className="w-3 shrink-0 font-bold text-accent">
              {marker}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface IdeaCardProps {
  idea: Idea;
  /** Small line above the title, e.g. "Idea 1" or "Saved 12 Nov 2026". */
  eyebrow: string;
  /** Action buttons; the pages decide which ones a card gets. */
  actions: ReactNode;
  /** Inline error for this card's actions. */
  error?: string | null;
  busy?: boolean;
}

export function IdeaCard({ idea, eyebrow, actions, error = null, busy = false }: IdeaCardProps) {
  const titleId = useId();
  const m = useMotionPresets();

  return (
    <article
      aria-labelledby={titleId}
      aria-busy={busy}
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      {/* Keyed by idea id so a regenerated idea cross-fades in place. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={idea.id}
          variants={m.fade}
          initial="hidden"
          animate="show"
          exit="exit"
          className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}
        >
          <div className="grid gap-x-10 gap-y-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div>
              <p className="font-display text-sm font-bold text-accent-strong">{eyebrow}</p>
              <h2
                id={titleId}
                className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink"
              >
                {idea.title}
              </h2>
              <p className="mt-2 text-lg leading-snug text-ink-soft">{idea.pitch}</p>
            </div>

            <div className="flex flex-col gap-5 self-start rounded-control bg-sunken p-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:p-5">
              <dl className="flex flex-wrap gap-x-8 gap-y-4 lg:flex-col">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Difficulty
                  </dt>
                  <dd className="mt-1.5">
                    <DifficultyBadge difficulty={idea.difficulty} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Estimated time
                  </dt>
                  <dd className="mt-1 font-display text-xl font-extrabold text-ink">
                    {idea.estimated_hours}{" "}
                    <span className="font-sans text-sm font-normal text-ink-soft">
                      {idea.estimated_hours === 1 ? "hour" : "hours"}
                    </span>
                  </dd>
                </div>
              </dl>
              <dl>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">Stack</dt>
                <dd className="mt-2">
                  <ul className="flex flex-wrap gap-1.5">
                    {idea.stack.map((tech, index) => (
                      <li
                        key={`${index}-${tech}`}
                        className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-sm text-ink"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </div>

            <div>
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Problem it solves
                  </dt>
                  <dd className="mt-1.5 text-[0.95rem] text-ink">{idea.problem_solved}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Who it&rsquo;s for
                  </dt>
                  <dd className="mt-1.5 text-[0.95rem] text-ink">{idea.target_users}</dd>
                </div>
              </dl>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <ScopeList title="Build" items={idea.scope_in} marker="+" />
                <ScopeList title="Skip for now" items={idea.scope_out} marker="–" />
              </div>
            </div>
          </div>

          <MilestoneList milestones={idea.milestones} />

          <div className="border-t border-line px-5 py-4 sm:px-7">
            <p className="text-[0.95rem] text-ink">
              <span className="font-semibold">Portfolio tip. </span>
              <span className="text-ink-soft">{idea.portfolio_tip}</span>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="border-t border-line bg-canvas/60 px-5 py-4 sm:px-7">
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-control bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">{actions}</div>
      </div>
    </article>
  );
}
