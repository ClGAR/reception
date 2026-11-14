"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type T = { id: number; text: string; tone: "ok" | "error" };
let push: (t: Omit<T, "id">) => void = () => {};

export const toast = {
  ok: (text: string) => push({ text, tone: "ok" }),
  error: (text: string) => push({ text, tone: "error" }),
};

export function Toaster() {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    push = (t) => {
      const id = Date.now() + Math.random();
      setItems((xs) => [...xs, { ...t, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4200);
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-[calc(128px+env(safe-area-inset-bottom))] z-50 flex flex-col gap-2 lg:bottom-[84px]">
      {items.map((t) => (
        <div key={t.id} role="status" className="toast-anim material-strong flex max-w-[360px] items-start gap-2.5 rounded-2xl border border-line px-4 py-3 text-[13.5px] shadow-[var(--shadow-pop)]">
          {t.tone === "ok" ? <CheckCircle2 size={17} className="mt-px shrink-0 text-accent" /> : <AlertCircle size={17} className="mt-px shrink-0 text-danger-ink" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
