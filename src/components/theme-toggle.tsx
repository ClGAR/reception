"use client";

import { Moon, Sun } from "lucide-react";
import { cx } from "@/components/ui";

/** Follows the system until the reader chooses; the choice survives reloads. */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const next = (root.dataset.theme ?? system) === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("reception-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className={cx(
        "press grid size-9 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink",
        className,
      )}
    >
      <Moon size={18} strokeWidth={1.75} className="theme-icon-light" aria-hidden />
      <Sun size={18} strokeWidth={1.75} className="theme-icon-dark" aria-hidden />
    </button>
  );
}
