import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { createElement, forwardRef, type ReactNode } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// Replace Framer Motion with plain elements so tests never wait on animation:
// motion.div renders a <div>, AnimatePresence removes children immediately.
vi.mock("framer-motion", () => {
  const MOTION_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "transition",
    "layout",
    "layoutId",
    "whileHover",
    "whileTap",
    "whileFocus",
    "whileInView",
  ]);

  const cache = new Map<string, unknown>();
  const motion = new Proxy(
    {},
    {
      get(_target, tag: string) {
        if (!cache.has(tag)) {
          const Component = forwardRef<unknown, Record<string, unknown>>((props, ref) => {
            const domProps = Object.fromEntries(
              Object.entries(props).filter(([name]) => !MOTION_PROPS.has(name)),
            );
            return createElement(tag, { ...domProps, ref });
          });
          Component.displayName = `motion.${tag}`;
          cache.set(tag, Component);
        }
        return cache.get(tag);
      },
    },
  );

  const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

  return {
    motion,
    AnimatePresence: Passthrough,
    MotionConfig: Passthrough,
    LayoutGroup: Passthrough,
    useReducedMotion: () => true,
  };
});
