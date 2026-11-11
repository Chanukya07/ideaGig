"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button, buttonClasses } from "@/components/Button";
import { IdeaCard } from "@/components/IdeaCard";
import { useMotionPresets } from "@/components/motion";
import { ResultsSkeleton } from "@/components/Skeleton";
import { deleteSaved, errorMessage, listSaved, saveIdea } from "@/lib/api";
import type { SavedIdea } from "@/lib/types";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function savedOn(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Saved" : `Saved ${dateFormat.format(date)}`;
}

export default function SavedPage() {
  const m = useMotionPresets();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [saved, setSaved] = useState<SavedIdea[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: number; message: string } | null>(null);
  const [lastDeleted, setLastDeleted] = useState<SavedIdea | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listSaved().then(
      (records) => {
        if (!cancelled) setSaved(records);
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  function retry() {
    setLoadError(null);
    setAttempt((count) => count + 1);
  }

  async function handleDelete(record: SavedIdea) {
    if (deletingId !== null) return;
    setDeletingId(record.id);
    setDeleteError(null);
    try {
      await deleteSaved(record.id);
      setSaved((current) => current?.filter((item) => item.id !== record.id) ?? null);
      setLastDeleted(record);
      setUndoError(null);
      headingRef.current?.focus(); // The focused button is about to disappear.
    } catch (error) {
      setDeleteError({ id: record.id, message: errorMessage(error) });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUndo() {
    if (!lastDeleted) return;
    try {
      const restored = await saveIdea(lastDeleted.idea);
      setSaved((current) => [restored, ...(current ?? [])]);
      setLastDeleted(null);
      setUndoError(null);
      headingRef.current?.focus();
    } catch (error) {
      setUndoError(errorMessage(error));
    }
  }

  return (
    <div>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-extrabold tracking-tight text-ink outline-none sm:text-4xl"
      >
        Saved ideas
      </h1>
      <div role="status">
        {lastDeleted && (
          <div className="mt-5 flex max-w-xl items-center justify-between gap-3 rounded-control border border-line bg-surface py-1.5 pl-4 pr-1.5 shadow-card">
            <p className="min-w-0 text-sm text-ink">Deleted “{lastDeleted.idea.title}”.</p>
            <Button variant="quiet" onClick={() => void handleUndo()} className="shrink-0 px-3 text-ink">
              Undo
            </Button>
          </div>
        )}
      </div>
      {undoError && (
        <p role="alert" className="mt-3 max-w-xl text-sm font-medium text-danger">
          {undoError}
        </p>
      )}

      {loadError ? (
        <div className="mt-6 max-w-xl">
          <p role="alert" className="rounded-control bg-danger-soft px-3.5 py-2.5 font-medium text-danger">
            {loadError}
          </p>
          <Button className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : saved === null ? (
        <div className="mt-8">
          <ResultsSkeleton label="Loading saved ideas…" />
        </div>
      ) : saved.length === 0 ? (
        <div className="mt-3 max-w-xl">
          <p className="text-lg text-ink-soft">
            Nothing saved yet. Generate some ideas and press Save on the ones worth building.
          </p>
          <Link href="/" className={buttonClasses("primary", "mt-6 min-h-12 px-6 text-base")}>
            Generate ideas
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-lg text-ink-soft">
            {saved.length === 1 ? "1 saved idea" : `${saved.length} saved ideas`}, kept for this
            browser only. Clearing your browser data removes the list.
          </p>
          <ul className="mt-8 space-y-6">
            <AnimatePresence initial={false}>
              {saved.map((record) => (
                <motion.li
                  key={record.id}
                  layout="position"
                  variants={m.fadeUp}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <IdeaCard
                    idea={record.idea}
                    eyebrow={savedOn(record.created_at)}
                    error={deleteError?.id === record.id ? deleteError.message : null}
                    actions={
                      <Button
                        inactive={deletingId !== null}
                        onClick={() => void handleDelete(record)}
                        aria-label={`Delete ${record.idea.title}`}
                      >
                        {deletingId === record.id ? "Deleting…" : "Delete"}
                      </Button>
                    }
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  );
}
