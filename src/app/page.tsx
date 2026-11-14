import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Hand, Inbox, MessageSquare, ShieldCheck, Sparkle, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/motion/reveal";
import { AssistantDemo } from "@/components/landing/assistant-demo";
import { BookingStory } from "@/components/landing/booking-story";
import { ProductReveal } from "@/components/landing/product-reveal";
import { FeatureBento } from "@/components/landing/feature-bento";

export const metadata = {
  title: "Reception · Every inquiry, handled.",
  description: "AI reception and appointment booking for clinics, salons and service businesses in the Philippines.",
};

const DEMO = "/b/glow-studio";

const btnPrimary =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-6 text-[16px] font-medium text-primary-ink shadow-[var(--shadow-sm)] hover:bg-primary-hover";
const btnSecondary =
  "press inline-flex h-12 items-center justify-center gap-2 rounded-[10px] border border-line-strong bg-bg px-6 text-[16px] font-medium text-ink shadow-[var(--shadow-sm)] hover:border-field-line hover:bg-surface";

const CHANNELS = [
  { icon: MessageSquare, title: "Website chat", body: "Answers on your site, day and night." },
  { icon: CalendarDays, title: "Booking page", body: "Real openings from your calendar." },
  { icon: Inbox, title: "Staff inbox", body: "Every customer in one thread." },
  { icon: Users, title: "Customer list", body: "History and notes, kept together." },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[10px] focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-ink">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="grid-backdrop pointer-events-none absolute inset-x-0 top-0 h-[640px]" />
          <div className="relative mx-auto grid max-w-[1120px] gap-10 px-5 py-14 text-center md:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center lg:gap-12 lg:py-20 lg:text-left">
            <div className="min-w-0">
              <p className="hero-in mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3.5 py-1.5 text-[14px] text-ink-2 shadow-[var(--shadow-sm)] lg:mx-0">
                <span className="size-2 rounded-full bg-primary" aria-hidden />
                For clinics, salons and service businesses in the Philippines
              </p>

              <h1
                className="hero-in mx-auto mt-7 max-w-[14ch] text-[clamp(44px,6vw,72px)] leading-[0.98] font-semibold tracking-[-0.045em] lg:mx-0"
                style={{ "--d": "60ms", "--rise": "18px" } as CSSProperties}
              >
                Every inquiry, handled.
              </h1>

              <p
                className="hero-in mx-auto mt-6 max-w-[46ch] text-[18px] leading-relaxed text-ink-2 md:text-[20px] lg:mx-0"
                style={{ "--d": "140ms" } as CSSProperties}
              >
                An AI receptionist that answers your customers, finds a free time and sends you the booking to approve.
              </p>

              <div className="hero-in mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start" style={{ "--d": "200ms", "--rise": "8px" } as CSSProperties}>
                <Link href={DEMO} className={`${btnPrimary} w-full sm:w-auto`}>
                  Try the live demo <ArrowRight size={18} aria-hidden />
                </Link>
                <Link href="/register" className={`${btnSecondary} w-full sm:w-auto`}>
                  Create your account
                </Link>
              </div>
              <p className="hero-in mt-4 text-[14px] text-ink-3" style={{ "--d": "240ms" } as CSSProperties}>
                No card needed. The demo is a fictional salon.
              </p>
            </div>

            <div className="hero-in min-w-0" style={{ "--d": "300ms", "--rise": "24px" } as CSSProperties}>
              <AssistantDemo />
            </div>
          </div>
        </section>

        {/* What it connects */}
        <section aria-label="What Reception connects" className="border-y border-line bg-surface">
          <ul className="mx-auto grid max-w-[1120px] grid-cols-1 gap-x-8 gap-y-6 px-5 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
            {CHANNELS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex items-start gap-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-[10px] border border-line bg-bg text-primary" aria-hidden>
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold">{title}</p>
                  <p className="mt-0.5 text-[15px] leading-snug text-ink-3">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <ProductReveal />
        <BookingStory />
        <FeatureBento />

        {/* Controlled AI */}
        <section id="trust" className="scroll-mt-16 border-t border-line bg-surface">
          <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
            <Reveal>
              <h2 className="font-display max-w-[18ch] text-[clamp(30px,4.2vw,48px)] leading-[1.04] font-semibold tracking-[-0.035em]">
                The AI only says what you approved.
              </h2>
              <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
                Prices, hours and policies come from you. Anything else goes to a person, with the whole conversation attached.
              </p>
            </Reveal>

            <div className="mt-8">
              <Reveal>
                <article className="grid overflow-hidden rounded-[20px] border border-line bg-bg md:grid-cols-[1fr_1.1fr]">
                  <div className="p-6 md:p-9">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] leading-none font-medium text-primary">
                      <ShieldCheck size={14} strokeWidth={2} aria-hidden /> Grounded in your rules
                    </span>
                    <h3 className="mt-5 text-[24px] leading-snug font-semibold tracking-[-0.02em]">It answers the routine. It hands over the rest.</h3>
                    <p className="mt-3 max-w-[42ch] text-[16px] leading-relaxed text-ink-2">
                      If a question isn&apos;t covered by your answers, the AI says so and passes it to your team. It never makes up a price or a promise.
                    </p>
                  </div>
                  <div className="space-y-3 border-t border-line bg-surface/60 p-5 text-[15px] md:border-t-0 md:border-l md:p-8">
                    <p className="ml-auto w-fit max-w-[88%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-primary-ink">
                      Do you do whitening? How much?
                    </p>
                    <div className="flex max-w-[92%] gap-2.5 rounded-[18px] rounded-bl-[6px] border border-line bg-bg px-4 py-2.5">
                      <Sparkle size={15} className="mt-1 shrink-0 text-primary" aria-hidden />
                      <p>Whitening is ₱2,500 for a 60 minute session. I can request a time for you.</p>
                    </div>
                    <p className="ml-auto w-fit max-w-[88%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-primary-ink">
                      I&apos;m pregnant, is it safe?
                    </p>
                    <div className="flex max-w-[92%] gap-2.5 rounded-[18px] rounded-bl-[6px] border border-dashed border-field-line bg-bg px-4 py-2.5">
                      <Hand size={15} className="mt-1 shrink-0 text-warn-ink" aria-hidden />
                      <p>
                        I can&apos;t answer that, so I&apos;m passing you to the team. <span className="text-ink-3">· Sent to Maria</span>
                      </p>
                    </div>
                  </div>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Businesses */}
        <section id="solutions" className="mx-auto max-w-[1120px] scroll-mt-16 px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <h2 className="font-display text-[clamp(28px,3.8vw,42px)] leading-tight font-semibold tracking-[-0.035em]">Made for appointment businesses</h2>
          </Reveal>
          <ul className="mt-8 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2">
            {[
              ["Dental clinics", "Cleanings and check-ups by request. Health questions always go to your staff."],
              ["Salons & barbershops", "Each stylist has their own schedule. Customers only see times someone is free."],
              ["Aesthetic clinics", "Consultations by approval, clear prices, and no promises about results."],
              ["Car detailing", "Longer services with buffer time between cars, so bays never overlap."],
            ].map(([title, body]) => (
              <li key={title} className="bg-bg p-6 md:p-8">
                <p className="text-[18px] font-semibold tracking-[-0.01em]">{title}</p>
                <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-16 border-t border-line bg-surface">
          <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
            <Reveal className="text-center">
              <h2 className="font-display text-[clamp(28px,3.8vw,42px)] leading-tight font-semibold tracking-[-0.035em]">One simple plan</h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-[17px] leading-relaxed text-ink-2">
                We set it up with you and confirm the final price after a short call.
              </p>
            </Reveal>
            <Reveal delay={80}>
              <div className="mx-auto mt-8 max-w-[560px] rounded-[22px] border border-line bg-bg p-7 shadow-[var(--shadow-pop)] md:p-10">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[18px] font-semibold">Pro</p>
                  <p className="text-[14px] text-ink-3">plus one-time setup</p>
                </div>
                <p className="mt-4 text-[48px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                  ₱4,999<span className="text-[17px] font-normal tracking-normal text-ink-3"> / month</span>
                </p>
                <ul className="mt-8 space-y-3 text-[16px]">
                  {[
                    "Website chat and booking page",
                    "AI replies from your approved answers",
                    "Up to 2,000 AI messages a month",
                    "Unlimited staff and services",
                    "We help set up your services and FAQs",
                    "Follows the Philippine Data Privacy Act",
                  ].map((x) => (
                    <li key={x} className="flex gap-3">
                      <Check size={19} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {x}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`${btnPrimary} mt-9 w-full`}>
                  Get started
                </Link>
                <p className="mt-3 text-center text-[14px] leading-relaxed text-ink-3">You see the final quote before you pay anything.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-[820px] scroll-mt-16 px-5 py-16 md:px-8 md:py-20">
          <Reveal>
            <h2 className="font-display text-[clamp(28px,3.8vw,42px)] leading-tight font-semibold tracking-[-0.035em]">Questions</h2>
          </Reveal>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {[
              ["Will the AI book appointments by itself?", "It sends a request only after the customer agrees. Your staff approve it, unless you choose to auto-confirm free slots."],
              ["What if a customer asks something the AI doesn't know?", "It says it doesn't have that information and passes the conversation to your team."],
              ["Which channels does it work on?", "Your website chat and your booking page. Messenger, Instagram and WhatsApp are planned and will only be offered once they work."],
              ["How is customer data handled?", "Each business's data is kept separate, customers agree before booking, and we follow the Philippine Data Privacy Act."],
              ["Can I try it first?", "Yes. Open the live demo, book a time as a customer, then see how it reaches the staff inbox."],
            ].map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-medium">
                  {q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-[18px] leading-none text-ink-2 transition-transform duration-300 group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-5 text-[16px] leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-line">
          <div className="relative mx-auto max-w-[1120px] overflow-hidden px-5 py-16 text-center md:px-8 md:py-20">
            <Reveal>
              <h2 className="font-display mx-auto max-w-[18ch] text-[clamp(32px,5vw,56px)] leading-[1.02] font-semibold tracking-[-0.04em]">
                See it handle a real booking.
              </h2>
              <p className="mx-auto mt-4 max-w-[40ch] text-[17px] text-ink-2">Book a time as a customer, then watch it arrive in the staff inbox.</p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={DEMO} className={`${btnPrimary} w-full sm:w-auto`}>
                  Try the live demo <ArrowRight size={18} aria-hidden />
                </Link>
                <Link href="/login" className={`${btnSecondary} w-full sm:w-auto`}>
                  Log in
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6 px-5 py-10 text-[15px] text-ink-3 md:flex-row md:items-center md:px-8">
          <div>
            <Logo />
            <p className="mt-2">AI reception for service businesses in the Philippines.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 md:ml-auto">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/login" className="hover:text-ink">Log in</Link>
            <ThemeToggle />
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="material sticky top-0 z-30 border-b border-line">
      <nav className="mx-auto flex h-16 max-w-[1120px] items-center gap-6 px-5 md:px-8" aria-label="Main">
        <Link href="/" aria-label="Reception home" className="press">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-1 lg:flex">
          {[
            ["How it works", "#how"],
            ["Product", "#product"],
            ["Pricing", "#pricing"],
            ["Questions", "#faq"],
          ].map(([label, href]) => (
            <li key={label}>
              <a href={href} className="press rounded-[8px] px-3 py-2 text-[15px] text-ink-2 hover:bg-surface hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/login" className="press flex h-10 items-center rounded-[10px] px-3 text-[15px] font-medium text-ink-2 hover:bg-surface hover:text-ink sm:px-4">
            Log in
          </Link>
          <Link href="/register" className="press flex h-10 items-center rounded-[10px] bg-primary px-4 text-[15px] font-medium text-primary-ink hover:bg-primary-hover">
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
