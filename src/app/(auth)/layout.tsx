import Link from "next/link";
import { CalendarDays, MessageSquare, Sparkle } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <div className="flex min-h-dvh w-full flex-col lg:w-[54%]">
        <header className="flex h-16 shrink-0 items-center px-5 md:px-8">
          <Link href="/" aria-label="Reception home" className="press">
            <Logo />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex flex-1 items-center justify-center px-5 py-8 md:px-8">
          <div className="w-full max-w-[380px]">{children}</div>
        </main>
        <footer className="px-5 pb-6 text-[13.5px] text-ink-3 md:px-8">
          <Link href="/privacy" className="press hover:text-ink">Privacy</Link>
          <span className="mx-2 text-line-strong">·</span>
          <Link href="/" className="press hover:text-ink">Back to site</Link>
        </footer>
      </div>

      <aside className="relative hidden flex-1 overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div aria-hidden className="grid-backdrop pointer-events-none absolute inset-0 opacity-70" />
        <div className="relative max-w-[420px]">
          <h2 className="font-display text-[clamp(30px,3.4vw,44px)] leading-[1.04] font-semibold tracking-[-0.035em]">
            The inbox your customers think you have.
          </h2>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-ink-3">
            One thread for every inquiry, with the booking attached and a person ready to step in.
          </p>

          <div className="mt-8 rounded-[16px] border border-line bg-bg p-4 shadow-[var(--shadow-float)]">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-avatar text-[12px] font-semibold" aria-hidden>MS</span>
              <div>
                <p className="text-[14px] font-semibold leading-tight">Maria Santos</p>
                <p className="text-[12px] text-ink-3">Website chat</p>
              </div>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">
                <Sparkle size={10} aria-hidden /> AI on
              </span>
            </div>
            <div className="space-y-2 py-3 text-[14px]">
              <p className="w-fit rounded-[14px] rounded-bl-[4px] bg-surface px-3 py-1.5">Is 2 PM available tomorrow?</p>
              <div className="ml-auto flex max-w-[92%] gap-2 rounded-[14px] rounded-br-[4px] bg-primary px-3 py-1.5 text-primary-ink">
                <Sparkle size={12} className="mt-1 shrink-0" aria-hidden />
                <p>Yes. Cleaning at 2:00 PM is free. Want me to request it?</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <CalendarDays size={14} className="text-ink-3" aria-hidden />
              <span className="text-[13px] font-medium">Request · Tomorrow, 2:00 PM</span>
              <span className="ml-auto rounded-full bg-warn-soft px-2 py-0.5 text-[12px] font-medium text-warn-ink">Pending</span>
            </div>
          </div>

          <p className="mt-5 flex items-center gap-2 text-[12.5px] text-ink-3">
            <MessageSquare size={13} aria-hidden /> Website chat · Booking page · Staff inbox
          </p>
        </div>
      </aside>
    </div>
  );
}
