"use client";

// Holds the latest generated ideas for this tab. The form writes the API
// response here and the results page reads it, so nothing travels in the URL.

import { useSyncExternalStore } from "react";

import type { Idea } from "./types";

const STORAGE_KEY = "ideagig:ideas";

// undefined = not read from storage yet, null = nothing generated.
let cache: Idea[] | null | undefined;
const listeners = new Set<() => void>();

function read(): Idea[] | null {
  if (cache === undefined) {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cache = Array.isArray(parsed) ? (parsed as Idea[]) : null;
    } catch {
      cache = null;
    }
  }
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setIdeas(ideas: Idea[] | null): void {
  cache = ideas;
  try {
    if (ideas) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); the in-memory copy still works.
  }
  listeners.forEach((listener) => listener());
}

/** Returns undefined while hydrating, null when there are no ideas. */
export function useIdeas(): Idea[] | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
