"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "New ideas" },
  { href: "/saved", label: "Saved" },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="-mr-3 flex items-center">
      {LINKS.map(({ href, label }) => {
        const current = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold underline-offset-[10px] hover:text-ink ${
              current ? "text-ink underline decoration-accent decoration-2" : "text-ink-soft"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
