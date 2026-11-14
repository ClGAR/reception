"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

/**
 * The real Reception inbox in a device frame that tilts flat as it scrolls in
 * (after Aceternity's "container scroll animation" on 21st.dev, rebuilt with GSAP).
 * Without JS or with reduced motion it simply sits flat.
 */
export function ProductReveal() {
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
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el.querySelector("[data-device]"),
          { rotateX: 22, scale: 0.94, y: 40 },
          {
            rotateX: 0,
            scale: 1,
            y: 0,
            ease: "none",
            scrollTrigger: { trigger: el.querySelector("[data-stage]"), start: "top 95%", end: "top 25%", scrub: 0.5 },
          },
        );
      });
      cleanup = () => mm.revert();
    })();
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <section ref={root} id="product" aria-labelledby="product-title" className="scroll-mt-16 overflow-hidden">
      <div className="mx-auto max-w-[1120px] px-5 pt-20 pb-16 text-center md:px-8 md:pt-28 md:pb-24">
        <h2 id="product-title" className="font-display mx-auto max-w-[18ch] text-[clamp(30px,4.6vw,52px)] leading-[1.03] font-semibold tracking-[-0.035em]">
          Your whole front desk in one screen.
        </h2>
        <p className="mx-auto mt-4 max-w-[50ch] text-[17px] leading-relaxed text-ink-2">
          Every chat, every request and every customer&apos;s history, side by side. This is the real app, with a demo salon.
        </p>

        <div data-stage className="mt-12 [perspective:1200px] md:mt-16">
          <div
            data-device
            className="mx-auto max-w-[1040px] origin-top rounded-[22px] border border-line-strong bg-ink p-2 shadow-[var(--shadow-float)] md:rounded-[30px] md:p-3"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="overflow-hidden rounded-[14px] bg-bg md:rounded-[20px]">
              <Image
                src="/product/inbox.webp"
                alt="The Reception inbox: a list of customer chats on the left, and a conversation where the AI offers a 2:00 PM cleaning and the request shows as confirmed."
                width={2720}
                height={1700}
                sizes="(min-width: 1100px) 1016px, 100vw"
                className="h-[380px] w-full object-cover object-[70%_top] md:h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
