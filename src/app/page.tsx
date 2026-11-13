import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarDays, Check, Clock, Hand, Info, Scissors, Sparkle, Tag } from "lucide-react";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Reception · Every inquiry, handled.",
  description: "AI reception and appointment booking for clinics, salons and service businesses in the Philippines.",
};

const DEMO = "/b/glow-studio";

export default function Home() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-[62px] max-w-[1200px] items-center gap-8 px-4 md:px-8" aria-label="Main">
          <Link href="/" aria-label="Reception home"><Logo /></Link>
          <ul className="hidden items-center gap-6 text-[14.5px] text-ink/80 md:flex">
            <li><a href="#product" className="hover:text-ink">Product</a></li>
            <li><a href="#solutions" className="hover:text-ink">Solutions</a></li>
            <li><a href="#pricing" className="hover:text-ink">Pricing</a></li>
          </ul>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="hidden h-9 items-center rounded-md px-3 text-[14.5px] hover:bg-surface sm:flex">Log in</Link>
            <Link href="/register" className="flex h-9 items-center rounded-md bg-accent-strong px-4 text-[14.5px] font-medium text-white hover:bg-accent-hover">Get started</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] px-4 pt-16 md:px-8 md:pt-24">
          <div className="max-w-[640px]">
            <h1 className="text-[44px] leading-[1.05] font-semibold tracking-[-0.035em] md:text-[64px]">Every inquiry, handled.</h1>
            <p className="mt-5 text-[18px] text-ink/75 md:text-[20px]">A calmer way to manage conversations and appointments.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={DEMO} className="flex h-11 items-center gap-2 rounded-md bg-accent-strong px-5 text-[15.5px] font-medium text-white hover:bg-accent-hover">
                See a live demo <ArrowRight size={17} />
              </Link>
              <Link href="/register" className="flex h-11 items-center rounded-md border border-line px-5 text-[15.5px] hover:bg-surface">Get started</Link>
            </div>
            <p className="mt-4 text-[13px] text-muted">The demo is a fictional salon. Book a slot and it lands in the staff inbox.</p>
          </div>
          <ProductPreview />
        </section>

        <section id="product" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 md:px-8">
          <h2 className="max-w-[560px] text-[30px] leading-tight font-semibold tracking-[-0.02em]">From first message to booked chair</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-4">
            {[
              ["Customer asks", "“Is 2 PM available tomorrow for a cleaning?”"],
              ["AI checks", "Real availability from your hours, staff and existing bookings. No guessing."],
              ["Request created", "The customer agrees, and a request with their details appears in your inbox."],
              ["You confirm", "One tap to approve. It goes on the calendar and the customer is told."],
            ].map(([t, b], i) => (
              <li key={t} className="bg-bg px-5 py-6">
                <span className="text-[13px] text-muted tabular-nums">0{i + 1}</span>
                <p className="mt-2 text-[16px] font-medium">{t}</p>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink/75">{b}</p>
              </li>
            ))}
          </ol>

          <div className="mt-20 grid gap-12 md:grid-cols-3">
            {[
              [Sparkle, "Replies from your rules", "The AI answers only from the prices, hours and policies you approve. If it doesn't know, it says so and hands over to staff."],
              [CalendarCheck2, "Booking that can't double up", "Slots come from your schedule and the database blocks overlapping confirmed appointments for the same staff member."],
              [Hand, "Staff stay in control", "Take over any conversation, approve or decline requests, and see exactly what the AI said."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof Sparkle;
              return (
                <div key={t as string}>
                  <I size={20} strokeWidth={1.75} className="text-accent" aria-hidden />
                  <h3 className="mt-4 text-[17px] font-semibold">{t as string}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{b as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="solutions" className="scroll-mt-20 border-y border-line bg-surface/50">
          <div className="mx-auto max-w-[1200px] px-4 py-20 md:px-8">
            <h2 className="text-[30px] font-semibold tracking-[-0.02em]">Built for appointment businesses</h2>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Dental clinics", "Cleanings and check-ups booked by request. Health questions always go to your staff, never answered by AI."],
                ["Salons & barbershops", "Each stylist has their own schedule. Customers see only the times someone is free."],
                ["Aesthetic clinics", "Consultations by approval, clear prices, and no promises about results."],
                ["Car detailing", "Longer services with buffer time between cars, so bays don't overlap."],
              ].map(([t, b]) => (
                <li key={t}>
                  <p className="text-[16px] font-medium">{t}</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink/75">{b}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1200px] scroll-mt-20 px-4 py-24 md:px-8">
          <div className="grid gap-12 md:grid-cols-[1fr_420px] md:items-start">
            <div>
              <h2 className="text-[30px] font-semibold tracking-[-0.02em]">Simple pricing</h2>
              <p className="mt-3 max-w-[460px] text-[15.5px] leading-relaxed text-ink/75">One plan while we work closely with our first businesses. We set it up with you and quote the final price after a short call.</p>
            </div>
            <div className="rounded-lg border border-line px-6 py-6">
              <p className="text-[14px] font-medium text-muted">Pro</p>
              <p className="mt-2 text-[36px] font-semibold tracking-[-0.02em]">₱4,999<span className="text-[16px] font-normal text-muted">/month</span></p>
              <p className="text-[14px] text-muted">plus a one-time setup fee</p>
              <ul className="mt-6 space-y-2.5 text-[14.5px]">
                {["Website chat and booking page", "AI replies from your approved answers", "Up to 2,000 AI messages a month", "Unlimited staff and services", "Setup help for your services and FAQs"].map((x) => (
                  <li key={x} className="flex gap-2.5"><Check size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden /> {x}</li>
                ))}
              </ul>
              <Link href="/register" className="mt-7 flex h-11 items-center justify-center rounded-md bg-accent-strong text-[15.5px] font-medium text-white hover:bg-accent-hover">Get started</Link>
              <p className="mt-3 text-[12.5px] text-muted">Indicative price. Usage terms and the final quotation are confirmed before you pay anything.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-[800px] px-4 pb-24 md:px-8">
          <h2 className="text-[30px] font-semibold tracking-[-0.02em]">Questions</h2>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {[
              ["Will the AI book appointments by itself?", "It creates a request only after the customer agrees. Your staff approve it, unless you choose to auto-confirm free slots."],
              ["What if a customer asks something the AI doesn't know?", "It says it doesn't have that information and passes the conversation to your team."],
              ["Which channels does it work on?", "Your website chat widget and your booking page. Messenger, Instagram and WhatsApp are planned and will only be offered once they work."],
              ["How is customer data handled?", "Each business's data is kept separate, customers give consent before booking, and we follow the Philippine Data Privacy Act."],
              ["Can I try it first?", "Yes. Open the live demo, book a slot as a customer, then see how it reaches the staff inbox."],
            ].map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
                  {q}
                  <span className="text-[20px] leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-8 text-[13.5px] text-muted md:px-8">
          <Logo />
          <span>AI reception for service businesses in the Philippines.</span>
          <span className="ml-auto flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/login" className="hover:text-ink">Log in</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

/** Static HTML replica of the inbox (not a screenshot), so it stays sharp and accessible. */
function ProductPreview() {
  return (
    <div className="mt-14 overflow-hidden rounded-xl border border-line shadow-[0_30px_80px_-40px_rgba(33,40,38,0.35)] md:mt-20" role="img" aria-label="Preview of the Reception inbox showing an AI reply and an appointment request awaiting approval">
      <div className="grid md:grid-cols-[300px_1fr]" aria-hidden>
        <div className="hidden border-r border-line md:block">
          <p className="px-5 pt-5 pb-3 text-[18px] font-semibold">Inbox</p>
          {[
            ["Maria Santos", "Is 2 PM available?", "Booking", true],
            ["John Reyes", "How much is cleaning?", "AI replied", true],
            ["Ana Cruz", "Hair color this weekend?", "New", false],
          ].map(([n, m, t, u], i) => (
            <div key={n as string} className={`mx-2 flex items-start gap-3 rounded-lg px-4 py-3 ${i === 0 ? "bg-surface-2" : ""}`}>
              <span className="mt-0.5 grid size-8 place-items-center rounded-full bg-avatar text-[12px] font-medium">{(n as string).split(" ").map((w) => w[0]).join("")}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">{u ? <span className="size-1.5 rounded-full bg-live" /> : null}{n}</span>
                <span className="block truncate text-[13px] text-ink/75">{m}</span>
              </span>
              <span className="rounded bg-surface px-1.5 py-0.5 text-[11.5px] text-ink/75">{t}</span>
            </div>
          ))}
        </div>
        <div className="bg-bg px-5 py-5 md:px-7">
          <div className="space-y-3 text-[14.5px]">
            <p className="w-fit rounded-xl rounded-tl-md bg-surface px-3.5 py-2">Hi! Is 2 PM available tomorrow for a cleaning?</p>
            <div className="ml-auto flex max-w-[420px] gap-2.5 rounded-xl rounded-tr-md bg-surface px-3.5 py-2.5">
              <Sparkle size={16} className="mt-0.5 shrink-0 text-ink/70" />
              <p>Yes, we have a slot tomorrow at 2:00 PM for a Cleaning (60 mins, ₱800). Would you like me to request it for you?</p>
            </div>
            <p className="w-fit rounded-xl rounded-tl-md bg-surface px-3.5 py-2">Yes, please! Book it for me.</p>
          </div>
          <div className="mt-4 max-w-[520px] overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-2.5 bg-surface px-4 py-2 text-[14.5px] font-semibold">
              <CalendarDays size={17} /> Appointment request <span className="ml-auto rounded bg-warn-soft px-2 py-0.5 text-[11.5px] font-normal text-warn-ink">Pending approval</span>
            </div>
            <div className="space-y-1 px-4 py-2.5 text-[13.5px]">
              <p className="flex items-center gap-3"><Scissors size={14} /> Cleaning</p>
              <p className="flex items-center gap-3"><Clock size={14} /> Tomorrow, 2:00 PM – 3:00 PM</p>
              <p className="flex items-center gap-3"><Tag size={14} /> ₱800</p>
            </div>
            <p className="flex items-center gap-2 border-t border-line px-4 py-2 text-[12.5px] text-muted"><Info size={14} /> Awaiting staff approval.</p>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="flex h-9 items-center gap-1.5 rounded-md bg-accent-strong px-3.5 text-[13.5px] font-medium text-white"><Check size={15} /> Approve &amp; Confirm</span>
            <span className="flex h-9 items-center rounded-md border border-line px-3.5 text-[13.5px]">Decline</span>
          </div>
        </div>
      </div>
    </div>
  );
}
