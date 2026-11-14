"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Fades content in once, when it first enters the viewport.
 *
 * The animation is an enhancement, never a gate: content already near the
 * viewport is revealed by a short failsafe, and `<noscript>` in the root
 * layout removes the effect entirely when JavaScript is off.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      el.dataset.visible = "true";
      return;
    }

    const show = () => {
      el.dataset.visible = "true";
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          show();
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    io.observe(el);

    // Anything within the first screen and a bit is revealed even if the
    // observer never fires (print, background tab, screenshot tooling).
    const near = el.getBoundingClientRect().top < window.innerHeight * 1.25;
    const failsafe = near ? window.setTimeout(show, 1600) : undefined;

    return () => {
      io.disconnect();
      if (failsafe) window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}
