"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonClasses } from "@/components/Button";
import { IdeaCard } from "@/components/IdeaCard";
import { useMotionPresets } from "@/components/motion";
import { ResultsSkeleton } from "@/components/Skeleton";
import { errorMessage, regenerateIdea, saveIdea } from "@/lib/api";
import { setIdeas, useIdeas } from "@/lib/session";
import type { Idea, RegenerateMode } from "@/lib/types";

const REGENERATE_ACTIONS: { mode: RegenerateMode; label: string; busyLabel: string }[] = [
  { mode: "harder", label: "Make harder", busyLabel: "Making it harder…" },
  { mode: "easier", label: "Make easier", busyLabel: "Making it easier…" },
  { mode: "swap_stack", label: "Swap stack", busyLabel: "Swapping stack…" },
];

type Pending = RegenerateMode | "save" | null;

function ResultCard({
  idea,
  position,
  onReplace,
}: {
  idea: Idea;
  position: number;
  onReplace: (next: Idea) => void;
}) {
  const [pending, setPending] = useState<Pending>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const saved = savedId === idea.id;

  async function run(action: Exclude<Pending, null>) {
    if (pending) return;
    setPending(action);
    setError(null);
    setAnnouncement("");
    try {
      if (action === "save") {
        await saveIdea(idea);
        setSavedId(idea.id);
        setAnnouncement(`Saved “${idea.title}”.`);
      } else {
        const next = await regenerateIdea(idea, action);
        onReplace(next);
        setAnnouncement(`Idea ${position} updated: ${next.title}.`);
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setPending(null);
    }
  }

  return (
    <IdeaCard
      idea={idea}
      eyebrow={`Idea ${position}`}
      error={error}
      busy={pending !== null && pending !== "save"}
      actions={
        <>
          {REGENERATE_ACTIONS.map(({ mode, label, busyLabel }) => (
            <Button
              key={mode}
              inactive={pending !== null}
              onClick={() => run(mode)}
              className="px-2 sm:px-4"
            >
              {pending === mode ? busyLabel : label}
            </Button>
          ))}
          <Button
            variant="primary"
            inactive={pending !== null || saved}
            onClick={() => run("save")}
            className={`col-span-3 sm:ml-auto ${saved ? "aria-disabled:cursor-default aria-disabled:opacity-100" : ""}`}
          >
            {saved && (
              <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
                <path
                  d="M3 8.5l3.2 3L13 4.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {saved ? "Saved" : pending === "save" ? "Saving…" : "Save"}
          </Button>
          <p role="status" className="sr-only col-span-3">
            {announcement}
          </p>
        </>
      }
    />
  );
}

export default function ResultsPage() {
  const ideas = useIdeas();
  const m = useMotionPresets();

  if (ideas === undefined) {
    return <ResultsSkeleton label="Loading your ideas…" />;
  }

  if (ideas === null) {
    return (
      <section className="max-w-xl">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          No ideas here yet
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Ideas live in this browser tab only. Fill in the form to get three new ones.
        </p>
        <Link href="/" className={buttonClasses("primary", "mt-6 min-h-12 px-6 text-base")}>
          Start with your skills
        </Link>
      </section>
    );
  }

  function replaceIdea(previousId: string, next: Idea) {
    if (!ideas) return;
    setIdeas(ideas.map((idea) => (idea.id === previousId ? next : idea)));
  }

  return (
    <motion.div variants={m.stagger} initial="hidden" animate="show">
      <motion.div
        variants={m.fadeUp}
        className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4"
      >
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Three ideas, sized to fit
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Adjust any idea, then save the ones worth building. Ideas you don&rsquo;t save are gone
            when you close this tab.
          </p>
        </div>
        <Link href="/" className={buttonClasses("secondary")}>
          Start over
        </Link>
      </motion.div>

      <ol className="mt-9 space-y-6">
        {ideas.map((idea, index) => (
          // Keyed by slot, so a regenerated idea keeps its place and its card state.
          <motion.li key={index} variants={m.fadeUp}>
            <ResultCard
              idea={idea}
              position={index + 1}
              onReplace={(next) => replaceIdea(idea.id, next)}
            />
          </motion.li>
        ))}
      </ol>
    </motion.div>
  );
}
