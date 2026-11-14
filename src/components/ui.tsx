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
        "press inline-flex items-center justify-center gap-2 rounded-[10px] font-medium whitespace-nowrap select-none disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3.5 text-[14px]",
        size === "md" && "h-11 px-4.5 text-[15px]",
        size === "lg" && "h-12 px-6 text-[16px]",
        variant === "primary" && "bg-primary text-primary-ink shadow-[var(--shadow-sm)] hover:bg-primary-hover",
        variant === "secondary" && "border border-line-strong bg-bg text-ink shadow-[var(--shadow-sm)] hover:border-field-line hover:bg-surface",
        variant === "ghost" && "text-ink-2 hover:bg-surface hover:text-ink",
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
      <label htmlFor={htmlFor} className="block text-[14px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-[13.5px] leading-relaxed text-ink-3">{hint}</p>}
      {error && (
        <p role="alert" className="text-[13.5px] leading-relaxed text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  "rounded-[10px] border border-field-line bg-bg px-3.5 text-[16px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] duration-200 outline-none hover:border-ink-2 focus:border-primary focus:ring-[3px] focus:ring-accent-line aria-[invalid=true]:border-danger-ink aria-[invalid=true]:ring-danger-soft";

const hasWidth = (c?: string) => /(^|\s)w-/.test(c ?? "");

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cx(inputCls, "h-11", !hasWidth(className) && "w-full", className)} {...p} />;
});
export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, "min-h-[88px] w-full py-2 leading-relaxed", className)} {...p} />;
}
export function Select({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputCls, "h-11 pr-8", !hasWidth(className) && "w-full", className)} {...p} />;
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
        "relative inline-flex h-[26px] w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50",
        checked ? "bg-primary" : "bg-track",
      )}
    >
      <span
        className={cx(
          "inline-block size-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-[340ms] ease-[var(--spring)]",
          checked ? "translate-x-[20px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "accent" | "success" | "warn" | "danger" | "outline"; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] leading-none font-medium whitespace-nowrap",
        tone === "neutral" && "bg-surface-2 text-ink-2",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "success" && "bg-success-soft text-success",
        tone === "warn" && "bg-warn-soft text-warn-ink",
        tone === "danger" && "bg-danger-soft text-danger-ink",
        tone === "outline" && "border border-line text-ink-3",
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
        "dialog-anim m-auto w-[calc(100%-32px)] rounded-[16px] border border-line bg-bg-elevated p-0 text-ink shadow-[var(--shadow-float)] backdrop:bg-[var(--scrim)]",
        wide ? "max-w-[640px]" : "max-w-[460px]",
      )}
    >
      {open && (
        <div>
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-[17px] font-semibold tracking-[-0.015em]">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="press grid size-10 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink">
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
      <span className="mb-4 grid size-12 place-items-center rounded-full border border-line bg-surface text-ink-3">{icon}</span>
      <p className="text-[15px] font-medium tracking-[-0.01em]">{title}</p>
      <p className="mt-1.5 max-w-[340px] text-[14.5px] leading-relaxed text-ink-3">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 pt-7 pb-5 md:px-8 md:pt-9">
      <div>
        <h1 className="text-[28px] leading-[1.1] font-semibold tracking-[-0.03em]">{title}</h1>
        {description && <p className="mt-1.5 text-[15px] text-ink-3">{description}</p>}
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
        "grid shrink-0 place-items-center rounded-full bg-avatar font-medium text-ink ring-1 ring-line/60 ring-inset",
        size === "sm" && "size-8 text-[13.5px]",
        size === "md" && "size-10 text-[15.5px]",
        size === "lg" && "size-[46px] text-[16px]",
      )}
    >
      {initials || "?"}
    </span>
  );
}
