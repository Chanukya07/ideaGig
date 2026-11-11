"use client";

import { useEffect } from "react";

import { Button } from "@/components/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="max-w-xl">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Something broke on this page
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Your saved ideas are safe. Try again, and if it keeps happening, reload the page.
      </p>
      <Button variant="primary" onClick={reset} className="mt-6 min-h-12 px-6 text-base">
        Try again
      </Button>
    </section>
  );
}
