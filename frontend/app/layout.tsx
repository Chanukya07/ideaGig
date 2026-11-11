import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import type { ReactNode } from "react";

import { MotionProvider } from "@/components/motion";
import { SiteNav } from "@/components/SiteNav";

import "./globals.css";

// Headings only; body text uses the system font stack.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ideaGig — pick a portfolio project you can finish", template: "%s · ideaGig" },
  description:
    "Tell ideaGig your skills, time, and interests. Get three scoped portfolio project ideas with a stack and step-by-step milestones.",
};

export const viewport: Viewport = { themeColor: "#faf6f0" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <header className="border-b border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-8">
            <Link
              href="/"
              className="rounded-control font-display text-xl font-extrabold tracking-tight text-ink"
            >
              idea<span className="text-accent">Gig</span>
            </Link>
            <SiteNav />
          </div>
        </header>
        <MotionProvider>
          <main id="main" className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
            {children}
          </main>
        </MotionProvider>
      </body>
    </html>
  );
}
