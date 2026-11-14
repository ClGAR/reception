"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, Check, Mail, MessageSquare, Sparkle } from "lucide-react";
import { cx } from "@/components/ui";

const STEPS = [
  { title: "A customer asks", body: "“Is 2 PM free tomorrow for a cleaning?” arrives from your website chat or booking page, day or night." },
  { title: "The AI checks your real schedule", body: "Hours, staff, breaks and existing bookings. It only offers times that are actually free." },
  { title: "A request lands in your inbox", body: "The customer agrees, and you get the service, time, price and contact details in one card." },
  { title: "You approve with one tap", body: "It goes on the calendar and the customer gets a confirmation email. Nothing is booked without you." },
] as const;

function Scene({ i }: { i: number }) {
  if (i === 0)
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-[13px] text-ink-3">
          <MessageSquare size={14} aria-hidden /> Website chat · 9:41 PM
        </p>
        <p className="ml-auto w-fit max-w-[88%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-[16px] leading-snug text-primary-ink">
          Hi! Is 2 PM free tomorrow for a cleaning?
        </p>
        <div className="flex items-center gap-1.5 pl-1 text-ink-3" aria-hidden>
          <span className="typing-dot size-2 rounded-full bg-ink-3" />
          <span className="typing-dot size-2 rounded-full bg-ink-3" style={{ animationDelay: "160ms" }} />
          <span className="typing-dot size-2 rounded-full bg-ink-3" style={{ animationDelay: "320ms" }} />
        </div>
      </div>
    );
  if (i === 1)
    return (
      <div>
        <p className="flex items-center gap-2 text-[13px] text-ink-3">
          <Sparkle size={14} className="text-primary" aria-hidden /> Checking Maria&apos;s schedule, tomorrow
        </p>
        <ul className="mt-3 space-y-2 text-[15px]">
          {[
            ["1:00 PM", "Booked", false],
            ["2:00 PM", "Free · 60 min", true],
            ["3:00 PM", "Booked", false],
          ].map(([t, l, free]) => (
            <li
              key={t as string}
              className={cx(
                "flex items-center gap-3 rounded-[12px] border px-3.5 py-2.5",
                free ? "border-primary bg-accent-soft font-medium text-primary" : "border-line text-ink-3",
              )}
            >
              <span className="w-[72px] tabular-nums">{t as string}</span>
              <span>{l as string}</span>
              {free && <Check size={16} className="ml-auto" aria-hidden />}
            </li>
          ))}
        </ul>
      </div>
    );
  if (i === 2)
    return (
      <div className="overflow-hidden rounded-[14px] border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5 text-[14px] font-semibold">
          <CalendarDays size={15} aria-hidden /> Appointment request
          <span className="ml-auto rounded-full bg-warn-soft px-2.5 py-1 text-[12px] leading-none font-medium text-warn-ink">Pending</span>
        </div>
        <dl className="grid grid-cols-[88px_1fr] gap-y-1.5 px-4 py-3 text-[15px]">
          <dt className="text-ink-3">Customer</dt>
          <dd>Maria Santos</dd>
          <dt className="text-ink-3">Service</dt>
          <dd>Cleaning · 60 min</dd>
          <dt className="text-ink-3">When</dt>
          <dd className="tabular-nums">Tomorrow, 2:00 PM</dd>
          <dt className="text-ink-3">Price</dt>
          <dd className="tabular-nums">₱800</dd>
        </dl>
        <div className="flex gap-2 border-t border-line px-4 py-3">
          <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-primary text-[15px] font-medium text-primary-ink">
            <Check size={16} aria-hidden /> Approve
          </span>
          <span className="flex h-10 flex-1 items-center justify-center rounded-[10px] border border-line-strong text-[15px] font-medium">Decline</span>
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-[14px] border border-success-line bg-success-soft px-4 py-3.5">
        <span className="grid size-9 place-items-center rounded-full bg-success text-white" aria-hidden>
          <Check size={18} strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-[16px] font-semibold text-success">Confirmed</p>
          <p className="text-[14px] text-ink-2 tabular-nums">Maria Santos · Tomorrow, 2:00 PM</p>
        </div>
      </div>
      <p className="flex items-center gap-2 rounded-[12px] border border-line px-4 py-3 text-[14px] text-ink-2">
        <Mail size={15} className="text-ink-3" aria-hidden /> Confirmation email sent to Maria
      </p>
    </div>
  );
}

/**
 * "From message to booking" in four steps.
 * Default (no JS, phones, reduced motion): a plain numbered list, each step with its picture.
 * Desktop with motion allowed: the section pins and scrolling walks through the steps (GSAP ScrollTrigger).
 */
export function BookingStory() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        el.dataset.mode = "pinned";
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]", el);
        const scenes = gsap.utils.toArray<HTMLElement>("[data-scene]", el);
        gsap.set(scenes, { autoAlpha: 0, y: 16 });
        gsap.set(scenes[0]!, { autoAlpha: 1, y: 0 });
        gsap.set(steps, { opacity: 0.4 });
        gsap.set(steps[0]!, { opacity: 1 });
        const tl = gsap.timeline({
          defaults: { duration: 1, ease: "power2.out" },
          scrollTrigger: {
            trigger: el.querySelector("[data-pin]"),
            start: "top 96px",
            end: () => `+=${window.innerHeight * 2.4}`,
            pin: true,
            scrub: 0.5,
          },
        });
        // Each step rests on screen (the empty tweens) before handing over to the next.
        tl.to({}, { duration: 0.8 });
        for (let i = 1; i < STEPS.length; i++) {
          tl.to(scenes[i - 1]!, { autoAlpha: 0, y: -16 })
            .to(steps[i - 1]!, { opacity: 0.4 }, "<")
            .fromTo(scenes[i]!, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0 }, "<0.3")
            .to(steps[i]!, { opacity: 1 }, "<")
            .to({}, { duration: 0.8 });
        }
        tl.fromTo(el.querySelector("[data-rail]"), { scaleY: 0 }, { scaleY: 1, ease: "none", duration: tl.duration() }, 0);
        return () => {
          el.dataset.mode = "static";
        };
      });
      cleanup = () => mm.revert();
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <section ref={root} id="how" data-mode="static" className="group/story scroll-mt-16 border-t border-line">
      <div className="mx-auto max-w-[1120px] px-5 py-20 md:px-8 md:py-24">
        <div className="w-full">
          <h2 className="font-display max-w-[20ch] text-[clamp(30px,4.2vw,48px)] leading-[1.04] font-semibold tracking-[-0.035em]">
            From first message to booked appointment.
          </h2>
          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">
            The AI does the back-and-forth. Your staff make the decision.
          </p>

          <div data-pin className="mt-12 grid gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:items-center lg:gap-16">
            <ol className="relative space-y-10 group-data-[mode=pinned]/story:space-y-7 group-data-[mode=pinned]/story:pl-8">
              <span aria-hidden className="absolute top-1 bottom-1 left-[5px] hidden w-0.5 rounded-full bg-line lg:group-data-[mode=pinned]/story:block" />
              <span
                aria-hidden
                data-rail
                className="absolute top-1 bottom-1 left-[5px] hidden w-0.5 origin-top rounded-full bg-primary lg:group-data-[mode=pinned]/story:block"
              />
              {STEPS.map((s, i) => (
                <li key={s.title} data-step>
                  <p className="flex items-center gap-3 text-[14px] font-medium text-primary tabular-nums">
                    <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[14px] font-semibold">{i + 1}</span>
                    Step {i + 1}
                  </p>
                  <h3 className="mt-3 text-[22px] leading-snug font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 max-w-[44ch] text-[16px] leading-relaxed text-ink-2">{s.body}</p>
                  {/* Static mode: each step carries its own picture. */}
                  <div aria-hidden className="mt-5 max-w-[440px] rounded-[18px] border border-line bg-bg p-5 shadow-[var(--shadow-pop)] group-data-[mode=pinned]/story:hidden">
                    <Scene i={i} />
                  </div>
                </li>
              ))}
            </ol>

            {/* Pinned mode: one device, the scenes crossfade in place. */}
            <div aria-hidden className="relative hidden lg:group-data-[mode=pinned]/story:block">
              <div className="rounded-[22px] border border-line bg-bg p-2 shadow-[var(--shadow-float)]">
                <div className="flex items-center gap-2 px-3 pt-2 pb-3">
                  <span className="grid size-7 place-items-center rounded-full bg-avatar text-[12px] font-semibold">GS</span>
                  <span className="text-[14px] font-semibold">Glow Studio</span>
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[12px] leading-none font-medium text-primary">
                    <span className="size-1.5 rounded-full bg-primary" /> AI on
                  </span>
                </div>
                <div className="relative h-[300px] rounded-[16px] bg-surface">
                  {STEPS.map((s, i) => (
                    <div key={s.title} data-scene className="invisible absolute inset-0 flex flex-col justify-center p-5">
                      <div className="rounded-[16px] bg-bg p-4 shadow-[var(--shadow-sm)]">
                        <Scene i={i} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
