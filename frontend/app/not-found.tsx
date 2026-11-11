"use client";

import Link from "next/link";

import { buttonClasses } from "@/components/Button";

export default function NotFound() {
  return (
    <section className="max-w-xl">
      <p className="font-display text-sm font-bold text-accent-strong">404</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        That page doesn&rsquo;t exist
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        The link may be old or mistyped. You can start a new set of ideas or open your saved list.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/" className={buttonClasses("primary", "min-h-12 px-6 text-base")}>
          Generate ideas
        </Link>
        <Link href="/saved" className={buttonClasses("secondary", "min-h-12 px-6 text-base")}>
          Saved ideas
        </Link>
      </div>
    </section>
  );
}
