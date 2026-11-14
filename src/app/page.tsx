import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock,
  Hand,
  MessageSquare,
  Scissors,
  ShieldCheck,
  Sparkle,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { SignalGraphic } from "@/components/signal-graphic";
import { AssistantDemo } from "@/components/landing/assistant-demo";

export const metadata = {
  title: "Reception · Every inquiry, handled.",
  description: "AI reception and appointment booking for clinics, salons and service businesses in the Philippines.",
};

const DEMO = "/b/glow-studio";

const CHANNELS = [
  { icon: MessageSquare, title: "Website chat", body: "The widget that already sits on your site." },
  { icon: CalendarDays, title: "Booking page", body: "Your services, staff and real openings." },
  { icon: Users, title: "Staff inbox", body: "One thread per customer, with history." },
  { icon: Scissors, title: "Calendar", body: "Confirmed appointments, no double bookings." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <SiteHeader />

      <main>
        {/* Hero: centred, type first, the sample conversation underneath. */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(70%_60%_at_50%_0%,var(--surface),transparent_70%)]"
          />
          <div className="relative mx-auto max-w-[1120px] px-5 pt-14 pb-14 text-center md:px-8 md:pt-20 md:pb-20">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elevated/70 px-3 py-1 text-[12px] font-medium text-ink-2 backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              AI reception for appointment businesses
            </p>

            <h1 className="mx-auto mt-6 max-w-[15ch] text-[clamp(42px,7.2vw,76px)] leading-[0.94] font-semibold tracking-[-0.05em]">
              Every inquiry, handled.
            </h1>

            <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-relaxed text-muted md:text-[18px]">
              Website chat, booking page and staff inbox in one calm place. The AI answers only from the rules you approve.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href={DEMO}
                className="press inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14.5px] font-medium text-primary-ink shadow-[var(--shadow-sm)] hover:bg-primary-hover"
              >
                Open the live demo <ArrowRight size={16} aria-hidden />
              </Link>
              <a
                href="#how"
                className="press inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-[14.5px] font-medium text-ink hover:bg-surface"
              >
                See how it works
              </a>
            </div>

            <Reveal delay={80} className="mt-12 md:mt-16">
              <AssistantDemo />
            </Reveal>
          </div>
        </section>

        {/* Capability strip */}
        <section aria-label="What Reception connects" className="border-y border-line bg-surface/60">
          <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-x-6 gap-y-5 px-5 py-6 md:grid-cols-4 md:px-8">
            {CHANNELS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-2.5">
                <Icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The signal: one queue for every channel */}
        <section id="channels" className="relative overflow-hidden">
          <div className="mx-auto grid max-w-[1120px] items-center gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-[1.02fr_0.98fr]">
            <Reveal>
              <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">One signal</p>
              <h2 className="mt-3 max-w-[18ch] text-[clamp(30px,4vw,46px)] leading-[1.02] font-semibold tracking-[-0.045em]">
                Every channel, one quiet view.
              </h2>
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-muted">
                Customers arrive from your site, your booking link, or a link you shared. They all land in the same thread, with the booking attached and the whole history behind it.
              </p>

              <ul className="mt-8 space-y-0.5">
                {[
                  ["Website chat", "Answered in seconds, day or night."],
                  ["Booking page", "Live availability from your calendar."],
                  ["Staff inbox", "Escalations land with full context."],
                  ["Calendar", "Approved work, in one place."],
                ].map(([title, body], i) => (
                  <li key={title} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
                    <span className="mt-1.5 flex h-3 w-5 shrink-0 items-center">
                      <span className={i < 3 ? "size-1.5 rounded-full bg-accent" : "size-1.5 rounded-full bg-line-strong"} aria-hidden />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[13.5px] font-medium">{title}</span>
                      <span className="mt-0.5 block text-[12.5px] text-muted">{body}</span>
                    </span>
                    <span className="mt-1 font-mono text-[10.5px] text-muted tabular-nums">0{i + 1}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={100} className="relative flex justify-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,var(--accent-soft),transparent_70%)] opacity-70"
              />
              <SignalGraphic className="relative w-full max-w-[470px]" />
            </Reveal>
          </div>
        </section>

        {/* Product preview */}
        <section id="product" className="scroll-mt-20 border-t border-line bg-surface/40">
          <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-28">
            <Reveal className="text-center">
              <h2 className="mx-auto max-w-[22ch] text-[clamp(28px,4vw,44px)] leading-[1.03] font-semibold tracking-[-0.045em]">
                The whole day arrives in one screen.
              </h2>
              <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-muted">
                Unread replies, booking requests and the customer&apos;s history sit together, so nobody re-asks a question they already answered.
              </p>
            </Reveal>
            <Reveal delay={80} className="mt-12">
              <div className="mx-auto max-w-[780px]">
                <HeroPreview />
              </div>
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-[1120px] scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="max-w-[22ch] text-[clamp(28px,4vw,44px)] leading-[1.03] font-semibold tracking-[-0.045em]">
              From first message to booked chair.
            </h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
              The AI checks real availability, the customer agrees, and your staff make the call.
            </p>
          </Reveal>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Customer asks", "“Is 2 PM available tomorrow for a cleaning?”"],
              ["AI checks", "Real slots from your hours, staff and existing bookings. No guessing."],
              ["Request created", "The customer agrees and a request lands in your inbox with their details."],
              ["You confirm", "One tap. It reaches the calendar and the customer is told."],
            ].map(([title, body], i) => (
              <li key={title} className="bg-bg px-5 py-6 transition-colors hover:bg-surface">
                <span className="font-mono text-[11px] text-muted tabular-nums">0{i + 1}</span>
                <p className="mt-2 text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Controlled AI */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-28">
            <Reveal>
              <h2 className="max-w-[26ch] text-[clamp(28px,4vw,44px)] leading-[1.03] font-semibold tracking-[-0.045em]">
                The AI only says what you approved.
              </h2>
              <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-muted">
                Prices, hours and policies are yours. Anything outside them goes to a person, with the whole thread attached.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <Reveal className="md:col-span-2">
                <article className="lift overflow-hidden rounded-[22px] border border-line bg-surface">
                  <div className="grid gap-0 md:grid-cols-[1fr_1.1fr]">
                    <div className="p-6 md:p-8">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[11.5px] font-medium text-accent">
                        <ShieldCheck size={13} strokeWidth={2} aria-hidden /> Grounded in your rules
                      </span>
                      <h3 className="mt-4 text-[20px] leading-snug font-semibold tracking-[-0.02em]">
                        It answers the routine. It hands over the rest.
                      </h3>
                      <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-muted">
                        When a question falls outside your approved answers, the AI says so and marks the thread for staff. Nothing is invented and nothing is promised.
                      </p>
                    </div>
                    <div className="border-t border-line bg-bg p-5 md:border-t-0 md:border-l md:p-6">
                      <div className="space-y-2.5 text-[12.5px]">
                        <p className="w-fit rounded-[14px] rounded-bl-[4px] bg-surface px-3 py-2">Do you do whitening? How much?</p>
                        <div className="ml-auto flex max-w-[92%] gap-2 rounded-[14px] rounded-br-[4px] border border-line px-3 py-2">
                          <Sparkle size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                          <p>Whitening is ₱2,500 for a 60 minute session. I can request a slot for you.</p>
                        </div>
                        <p className="w-fit rounded-[14px] rounded-bl-[4px] bg-surface px-3 py-2">I&apos;m pregnant, is it safe?</p>
                        <div className="ml-auto flex max-w-[92%] gap-2 rounded-[14px] rounded-br-[4px] border border-dashed border-line-strong px-3 py-2">
                          <Hand size={13} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                          <p>
                            I don&apos;t have that information. I&apos;m passing you to the team. <span className="text-muted">· Handed to Maria</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </Reveal>

              <Reveal delay={60}>
                <article className="lift h-full rounded-[22px] border border-line bg-bg p-6">
                  <span className="grid size-9 place-items-center rounded-full bg-surface text-ink" aria-hidden>
                    <CalendarDays size={17} strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">Booking that can&apos;t double up</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                    Slots come from the schedule, and the database blocks overlapping confirmed appointments for the same staff member.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[12.5px]">
                    {[
                      ["2:00 PM", "Maria · Confirmed", false],
                      ["2:30 PM", "Free · 60 min", true],
                      ["3:30 PM", "Joel · Pending", false],
                    ].map(([time, label, free]) => (
                      <li key={time as string} className="flex items-center gap-2.5 rounded-xl border border-line px-2.5 py-1.5">
                        <span className="w-[52px] shrink-0 font-mono text-[11px] text-muted tabular-nums">{time as string}</span>
                        <span className={free ? "text-accent" : "text-ink-2"}>{label as string}</span>
                        {free && <Check size={13} className="ml-auto text-accent" aria-hidden />}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>

              <Reveal delay={120}>
                <article className="lift h-full rounded-[22px] border border-line bg-accent-soft/50 p-6">
                  <span className="grid size-9 place-items-center rounded-full bg-bg text-accent" aria-hidden>
                    <Hand size={17} strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">Staff stay in control</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                    Take over any conversation, approve or decline requests, and read exactly what the AI said.
                  </p>
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-bg px-3 py-2.5">
                    <span className="grid size-7 place-items-center rounded-full bg-surface-2" aria-hidden>
                      <Zap size={13} strokeWidth={2} />
                    </span>
                    <span className="flex-1 text-[12.5px] font-medium">AI replies</span>
                    <span className="flex h-5 w-9 items-center rounded-full bg-primary px-0.5" aria-hidden>
                      <span className="ml-auto size-4 rounded-full bg-primary-ink" />
                    </span>
                  </div>
                  <p className="mt-2 pl-1 text-[11.5px] text-muted">One tap pauses the AI and puts you in the thread.</p>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Businesses */}
        <section id="solutions" className="scroll-mt-20 border-t border-line bg-surface/40">
          <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-24">
            <Reveal>
              <h2 className="text-[clamp(26px,3.6vw,38px)] leading-tight font-semibold tracking-[-0.04em]">Built for appointment businesses</h2>
            </Reveal>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {[
                ["Dental clinics", "Cleanings and check-ups booked by request. Health questions always go to your staff, never answered by AI."],
                ["Salons & barbershops", "Each stylist has their own schedule. Customers see only the times someone is free."],
                ["Aesthetic clinics", "Consultations by approval, clear prices, and no promises about results."],
                ["Car detailing", "Longer services with buffer time between cars, so bays don't overlap."],
              ].map(([title, body], i) => (
                <li key={title}>
                  <Reveal delay={i * 40}>
                    <div className="group flex flex-col gap-1.5 py-5 transition-colors hover:bg-bg sm:flex-row sm:items-baseline sm:gap-8">
                      <p className="w-[190px] shrink-0 text-[15px] font-semibold tracking-[-0.01em]">{title}</p>
                      <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>
                      <ArrowUpRight size={16} className="ml-auto hidden shrink-0 text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block" aria-hidden />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-[1120px] scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
          <Reveal>
            <h2 className="text-[clamp(26px,3.6vw,38px)] leading-tight font-semibold tracking-[-0.04em]">Simple pricing</h2>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted">
              One plan while we work closely with our first businesses. We set it up with you and quote the final price after a short call.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 grid overflow-hidden rounded-[22px] border border-line md:grid-cols-[1.15fr_1fr]">
              <div className="p-6 md:p-8">
                <p className="text-[12px] font-semibold tracking-[0.06em] text-muted uppercase">Pro</p>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
                  Everything a single-location business needs to answer and book, with a human in the loop.
                </p>
                <ul className="mt-6 grid gap-2.5 text-[13.5px] sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                  {[
                    "Website chat and booking page",
                    "AI replies from approved answers",
                    "Up to 2,000 AI messages a month",
                    "Unlimited staff and services",
                    "Setup help for services and FAQs",
                    "Philippine Data Privacy Act aligned",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-between gap-6 border-t border-line bg-surface p-6 md:border-t-0 md:border-l md:p-8">
                <div>
                  <p className="text-[40px] leading-none font-semibold tracking-[-0.05em] font-mono tabular-nums">
                    ₱4,999<span className="text-[14px] font-normal tracking-normal text-muted"> /month</span>
                  </p>
                  <p className="mt-2 text-[12.5px] text-muted">plus a one-time setup fee</p>
                </div>
                <div>
                  <Link
                    href="/register"
                    className="press flex h-11 items-center justify-center rounded-full bg-primary px-5 text-[14.5px] font-medium text-primary-ink hover:bg-primary-hover"
                  >
                    Get started
                  </Link>
                  <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                    Indicative price. Usage terms and the final quotation are confirmed before you pay anything.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-line">
          <div className="mx-auto grid max-w-[1120px] gap-8 px-5 py-20 md:grid-cols-[0.7fr_1.3fr] md:px-8 md:py-24">
            <Reveal>
              <h2 className="text-[clamp(26px,3.6vw,38px)] leading-tight font-semibold tracking-[-0.04em]">Questions</h2>
              <p className="mt-3 max-w-[32ch] text-[13.5px] leading-relaxed text-muted">
                Still unsure? Open the demo and book a slot as a customer.
              </p>
            </Reveal>
            <Reveal delay={60}>
              <div className="divide-y divide-line border-y border-line">
                {[
                  ["Will the AI book appointments by itself?", "It creates a request only after the customer agrees. Your staff approve it, unless you choose to auto-confirm free slots."],
                  ["What if a customer asks something the AI doesn't know?", "It says it doesn't have that information and passes the conversation to your team."],
                  ["Which channels does it work on?", "Your website chat widget and your booking page. Messenger, Instagram and WhatsApp are planned and will only be offered once they work."],
                  ["How is customer data handled?", "Each business's data is kept separate, customers give consent before booking, and we follow the Philippine Data Privacy Act."],
                  ["Can I try it first?", "Yes. Open the live demo, book a slot as a customer, then see how it reaches the staff inbox."],
                ].map(([q, a]) => (
                  <details key={q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14.5px] font-medium">
                      {q}
                      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line text-[15px] leading-none text-muted transition-transform duration-300 group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-muted">{a}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-[1120px] px-5 pb-20 md:px-8 md:pb-28">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-[26px] border border-line bg-surface px-6 py-10 md:flex-row md:items-center md:px-10">
              <div>
                <h2 className="max-w-[24ch] text-[clamp(24px,3.2vw,34px)] leading-tight font-semibold tracking-[-0.04em]">
                  See it handle a real booking.
                </h2>
                <p className="mt-2 text-[13.5px] text-muted">The demo is a fictional salon. No signup, no card.</p>
              </div>
              <Link
                href={DEMO}
                className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[14.5px] font-medium text-primary-ink hover:bg-primary-hover"
              >
                Open the live demo <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-8 gap-y-4 px-5 py-8 text-[12.5px] text-muted md:px-8">
          <Logo />
          <span>AI reception for service businesses in the Philippines.</span>
          <span className="ml-auto flex items-center gap-5">
            <Link href="/privacy" className="press hover:text-ink">Privacy</Link>
            <Link href="/login" className="press hover:text-ink">Log in</Link>
            <ThemeToggle />
          </span>
        </div>
      </footer>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="material sticky top-0 z-30 border-b border-line">
      <nav className="mx-auto flex h-16 max-w-[1120px] items-center gap-7 px-5 md:px-8" aria-label="Main">
        <Link href="/" aria-label="Reception home" className="press">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {[
            ["Product", "#product"],
            ["Channels", "#channels"],
            ["Solutions", "#solutions"],
            ["Pricing", "#pricing"],
            ["FAQ", "#faq"],
          ].map(([label, href]) => (
            <li key={label}>
              <a href={href} className="press rounded-full px-3 py-1.5 text-[13.5px] text-ink-2 hover:bg-surface hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:grid" />
          <Link href="/login" className="press hidden h-9 items-center rounded-full px-3.5 text-[13.5px] font-medium text-ink-2 hover:bg-surface hover:text-ink sm:flex">
            Log in
          </Link>
          <Link href="/register" className="press flex h-9 items-center rounded-full bg-primary px-4 text-[13.5px] font-medium text-primary-ink hover:bg-primary-hover">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}

/** A real, scaled-down inbox (not a screenshot) so it stays sharp in both themes. */
function HeroPreview() {
  return (
    <figure className="relative">
      <div className="overflow-hidden rounded-[22px] border border-line bg-bg shadow-[var(--shadow-float)]">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <span className="grid size-5 place-items-center rounded-[5px] bg-primary text-primary-ink" aria-hidden>
            <MessageSquare size={10} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="text-[11.5px] font-medium">Glow Studio</span>
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[9.5px] text-muted">Demo</span>
          <span className="ml-auto flex items-center gap-1 text-[9.5px] text-muted">
            <span className="size-1 rounded-full bg-accent" aria-hidden /> AI on
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr]">
          <div className="hidden border-r border-line p-2 sm:block" aria-hidden>
            <div className="mb-2 flex items-center justify-between px-1.5">
              <span className="text-[9.5px] font-semibold tracking-[0.08em] text-muted uppercase">Inbox</span>
              <span className="rounded-full bg-primary px-1.5 text-[8.5px] font-semibold text-primary-ink">2</span>
            </div>
            {[
              ["Maria Santos", "Is 2 PM available?", true, true],
              ["John Reyes", "How much is cleaning?", false, true],
              ["Ana Cruz", "Hair color this weekend?", false, false],
            ].map(([name, preview, active, unread]) => (
              <div key={name as string} className={`flex gap-1.5 rounded-lg px-1.5 py-1.5 ${active ? "bg-surface-2" : ""}`}>
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-avatar text-[8px] font-semibold">
                  {(name as string)
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-[9.5px] font-semibold">
                    {unread && <span className="size-1 rounded-full bg-accent" />}
                    <span className="truncate">{name as string}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[9px] text-muted">{preview as string}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="grid size-6 place-items-center rounded-full bg-avatar text-[9px] font-semibold" aria-hidden>MS</span>
              <div className="min-w-0">
                <p className="truncate text-[10.5px] leading-tight font-semibold">Maria Santos</p>
                <p className="text-[8.5px] text-muted">Usually replies in minutes</p>
              </div>
              <span className="ml-auto rounded-full bg-accent-soft px-1.5 py-0.5 text-[8.5px] font-medium text-accent">Booking</span>
            </div>
            <div className="space-y-2 px-3 py-3 text-[10.5px]">
              <p className="bubble-anim w-fit rounded-[12px] rounded-bl-[4px] bg-surface px-2.5 py-1.5" style={{ animationDelay: "120ms" }}>
                Hi! Is 2 PM available tomorrow for a cleaning?
              </p>
              <div className="bubble-anim ml-auto flex max-w-[94%] gap-1.5 rounded-[12px] rounded-br-[4px] border border-line px-2.5 py-1.5" style={{ animationDelay: "260ms" }}>
                <Sparkle size={11} className="mt-px shrink-0 text-accent" aria-hidden />
                <p>Yes, 2:00 PM is free for a Cleaning (60 mins, ₱800). Want me to request it?</p>
              </div>
              <p className="bubble-anim w-fit rounded-[12px] rounded-bl-[4px] bg-surface px-2.5 py-1.5" style={{ animationDelay: "400ms" }}>
                Yes, please!
              </p>
              <div className="flex items-center gap-1 pl-1" aria-hidden>
                <span className="typing-dot size-1 rounded-full bg-muted" />
                <span className="typing-dot size-1 rounded-full bg-muted" style={{ animationDelay: "160ms" }} />
                <span className="typing-dot size-1 rounded-full bg-muted" style={{ animationDelay: "320ms" }} />
              </div>
            </div>
            <div className="mx-3 mb-3 overflow-hidden rounded-xl border border-line">
              <div className="flex items-center gap-1.5 border-b border-line bg-surface px-2 py-1.5 text-[9.5px] font-semibold">
                <CalendarDays size={10} aria-hidden /> Appointment request
                <span className="ml-auto rounded-full bg-warn-soft px-1.5 py-0.5 text-[8px] font-medium text-warn-ink">Pending</span>
              </div>
              <div className="space-y-1 px-2 py-1.5 text-[9px] text-ink-2">
                <p className="flex items-center gap-1.5"><Scissors size={9} aria-hidden /> Cleaning · Maria</p>
                <p className="flex items-center gap-1.5"><Clock size={9} aria-hidden /> Tomorrow, 2:00 – 3:00 PM</p>
                <p className="flex items-center gap-1.5"><Tag size={9} aria-hidden /> ₱800</p>
              </div>
              <div className="flex gap-1 border-t border-line px-2 py-1.5">
                <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[8.5px] font-medium text-primary-ink">
                  <Check size={8} strokeWidth={3} /> Approve
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-[8.5px]">Decline</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-2xl border border-line bg-bg px-3 py-2 shadow-[var(--shadow-pop)] md:flex">
        <span className="grid size-6 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
          <Check size={13} strokeWidth={2.5} />
        </span>
        <span className="text-[10.5px] leading-tight">
          <span className="block font-medium">Request approved</span>
          <span className="text-muted">Tomorrow · 2:00 PM</span>
        </span>
      </figcaption>
    </figure>
  );
}
