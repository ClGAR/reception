"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { LogoBurst } from "@/components/ui/logo-burst";

/**
 * The story section's picture: every inquiry radiating from one inbox.
 * Brand-blue filaments (lighter in dark mode) around the Reception mark; click to replay.
 */
export function BrandBurst({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.dataset.theme === "dark");
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  return (
    <div className={className}>
      <div className="relative size-full">
        <LogoBurst color={dark ? "#8197ff" : "#4d6bfe"} tentacleCount={220} radius={0.47} duration={1.5} particleRatio={0.55} breathe={false} label="Every inquiry, into one inbox">
          <span className="grid size-16 place-items-center rounded-[18px] bg-brand text-white shadow-[0_10px_30px_-8px_rgba(53,85,240,0.55)] ring-4 ring-bg">
            <MessageSquare size={28} strokeWidth={2.2} aria-hidden />
          </span>
        </LogoBurst>
        <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[13px] text-ink-3">Tap to replay</p>
      </div>
    </div>
  );
}
