"use client";

import { Moon, Sun } from "lucide-react";
import { cx } from "@/components/ui";

/** Light by default; the reader's choice survives reloads. */
export function ThemeToggle({ className }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
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
      aria-label="Switch between light and dark"
      className={cx(
        "press grid size-9 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink",
        className,
      )}
    >
      <Moon size={18} strokeWidth={1.75} className="theme-icon-light" aria-hidden />
      <Sun size={18} strokeWidth={1.75} className="theme-icon-dark" aria-hidden />
    </button>
  );
}
