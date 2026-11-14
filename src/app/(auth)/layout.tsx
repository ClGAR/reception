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
        <footer className="px-5 pb-6 text-[11.5px] text-muted md:px-8">
          <Link href="/privacy" className="press hover:text-ink">Privacy</Link>
          <span className="mx-2 text-line-strong">·</span>
          <Link href="/" className="press hover:text-ink">Back to site</Link>
        </footer>
      </div>

      <aside className="relative hidden flex-1 overflow-hidden border-l border-line bg-surface lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_0%,var(--surface-2),transparent_60%)]" />
        <div className="relative max-w-[420px]">
          <p className="text-[11px] font-semibold tracking-[0.09em] text-muted uppercase">Reception</p>
          <h2 className="mt-4 text-[clamp(30px,3.4vw,44px)] leading-[1.02] font-semibold tracking-[-0.045em]">
            The inbox your customers think you have.
          </h2>
          <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-muted">
            One thread for every inquiry, with the booking attached and a person ready to step in.
          </p>

          <div className="mt-8 rounded-[22px] border border-line bg-bg p-4 shadow-[var(--shadow-pop)]">
            <div className="flex items-center gap-2 border-b border-line pb-2.5">
              <span className="grid size-7 place-items-center rounded-full bg-avatar text-[11px] font-semibold" aria-hidden>MS</span>
              <div>
                <p className="text-[12px] font-semibold leading-tight">Maria Santos</p>
                <p className="text-[10.5px] text-muted">Website chat</p>
              </div>
              <span className="ml-auto flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                <Sparkle size={10} aria-hidden /> AI on
              </span>
            </div>
            <div className="space-y-2 py-3 text-[12px]">
              <p className="w-fit rounded-[14px] rounded-bl-[4px] bg-surface px-3 py-1.5">Is 2 PM available tomorrow?</p>
              <div className="ml-auto flex max-w-[92%] gap-2 rounded-[14px] rounded-br-[4px] border border-line px-3 py-1.5">
                <Sparkle size={12} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                <p>Yes. Cleaning at 2:00 PM is free. Want me to request it?</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <CalendarDays size={14} className="text-muted" aria-hidden />
              <span className="text-[11px] font-medium">Request · Tomorrow, 2:00 PM</span>
              <span className="ml-auto rounded-full bg-warn-soft px-2 py-0.5 text-[9.5px] text-warn-ink">Pending</span>
            </div>
          </div>

          <p className="mt-5 flex items-center gap-2 text-[11.5px] text-muted">
            <MessageSquare size={13} aria-hidden /> Website chat · Booking page · Staff inbox
          </p>
        </div>
      </aside>
    </div>
  );
}
