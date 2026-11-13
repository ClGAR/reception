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
    <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} role="status" className="toast-anim flex max-w-[360px] items-start gap-2.5 rounded-lg border border-line bg-bg px-4 py-3 text-[14px] shadow-[0_12px_32px_-12px_rgba(33,40,38,0.3)]">
          {t.tone === "ok" ? <CheckCircle2 size={18} className="mt-px shrink-0 text-accent" /> : <AlertCircle size={18} className="mt-px shrink-0 text-danger-ink" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
