"use client";

import { forwardRef, useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Loader2, X } from "lucide-react";
import { cx, statusLabel, statusTone } from "@/lib/cx";

export { cx, statusLabel, statusTone };


type Variant = "primary" | "secondary" | "ghost" | "danger";
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }
>(function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        size === "sm" && "h-8 px-3 text-[13.5px]",
        size === "md" && "h-10 px-4 text-[14.5px]",
        size === "lg" && "h-11 px-5 text-[15.5px]",
        variant === "primary" && "bg-accent-strong text-white hover:bg-accent-hover",
        variant === "secondary" && "border border-line bg-bg text-ink hover:bg-surface",
        variant === "ghost" && "text-ink hover:bg-surface",
        variant === "danger" && "border border-danger-line bg-bg text-danger-ink hover:bg-danger-soft",
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13.5px] font-medium">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[12.5px] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="text-[12.5px] text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "rounded-md border border-line bg-bg px-3 text-[14.5px] placeholder:text-muted/80 outline-none transition-colors focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/40 aria-[invalid=true]:border-danger-line";

const hasWidth = (c?: string) => /(^|\s)w-/.test(c ?? "");

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, "h-10", !hasWidth(className) && "w-full", className)} {...p} />;
});
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "min-h-[88px] w-full py-2 leading-relaxed", className)} {...p} />;
}
export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputCls, "h-10 pr-8", !hasWidth(className) && "w-full", className)} {...p} />;
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent-strong" : "bg-track",
      )}
    >
      <span className={cx("inline-block size-[18px] rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[19px]" : "translate-x-[3px]")} />
    </button>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "warn" | "danger" | "outline"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12.5px] font-medium whitespace-nowrap",
        tone === "neutral" && "bg-surface text-ink/80",
        tone === "accent" && "bg-accent-soft text-accent-strong",
        tone === "warn" && "bg-warn-soft text-warn-ink",
        tone === "danger" && "bg-danger-soft text-danger-ink",
        tone === "outline" && "border border-line text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}


/** Native <dialog>: focus trap, Esc and backdrop handled by the browser. */
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "dialog-anim m-auto w-[calc(100%-32px)] rounded-xl border border-line bg-bg p-0 text-ink shadow-[0_20px_60px_-20px_rgba(33,40,38,0.35)] backdrop:bg-black/40",
        wide ? "max-w-[640px]" : "max-w-[460px]",
      )}
    >
      {open && (
        <div>
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[16px] font-semibold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-md hover:bg-surface">
              <X size={17} />
            </button>
          </header>
          <div className="max-h-[75dvh] overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-surface text-muted">{icon}</span>
      <p className="text-[15px] font-medium">{title}</p>
      <p className="mt-1 max-w-[340px] text-[13.5px] text-muted">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 pt-6 pb-5 md:px-8 md:pt-7">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-avatar font-medium text-ink/85",
        size === "sm" && "size-8 text-[12.5px]",
        size === "md" && "size-10 text-[15px]",
        size === "lg" && "size-[46px] text-[17px]",
      )}
    >
      {initials || "?"}
    </span>
  );
}
