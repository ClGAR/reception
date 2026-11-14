# Reception design

Updated 2026-11-14. Feel: Vercel / X / Apple. Calm, plain, high contrast.

## Who it's for
- Owners and front-desk staff of PH clinics, salons and shops who rarely use web apps.
- Their customers, booking on a phone.
- So: big readable text, clear blue "do this" buttons, nothing hidden behind hover, labels next to icons.

## Tokens (`src/app/globals.css`)
- Light is the default for everyone. Dark (pure black, X "lights out") only when picked with the toggle.
- Background `#ffffff`, surfaces `#f5f7fa` / `#eceff3`, hairlines `#e6eaee` / `#cfd6dd`.
- Text: ink `#0f1419`, ink-2 `#2f3a45`, ink-3 `#536471` (secondary, 6.1:1). Use `text-ink-3`, never `text-muted` (`--muted` is shadcn's background).
- Inputs: `--field-line #8a96a3` (3:1 border), 44 px tall, 16 px text.
- Brand: DeepSeek blue `#4d6bfe` (logo). Actions: `--primary #3555f0` (5.7:1 with white), hover `#2443d6`.
- One accent, one meaning: blue = primary action, selected, link, focus, AI.
- Status always has a word, never colour alone: pending amber, confirmed/completed green (`success`), declined/no-show red.
- shadcn preset `b5J6bYbVg` (radix-nova, mist, 0.625rem radius) applied; its variables are mapped onto ours.

## Type
- Geist for UI and reading, Space Grotesk (from the preset) for page titles (`h1`, `.font-display`).
- No mono font for numbers: `tabular-nums` on Geist instead.
- App body 15 px, no text under 12 px; landing body 16 to 20 px.
- No tracked all-caps labels.

## Shape and layout
- Controls 10 px radius, cards 14 to 20 px, chips and avatars round.
- Buttons: sm 36 px, md 44 px, lg 48 px tall.
- Sidebar rows 44 px; mobile tab bar 62 px with labels.
- Selected nav, tab and filter: light blue fill + blue text.

## Motion (0 to 3 per screen, one focal moment)
- Landing hero: CSS entrance (rise and fade, staggered 60 to 300 ms). Job: first read order.
- Landing "From first message to booked appointment": GSAP ScrollTrigger pin, scrubbed, 4 steps crossfade in one device. Job: explain the product. Desktop + motion allowed only; otherwise a plain numbered list with a picture per step.
- Scroll reveals: content visible by default, only below-the-fold blocks fade in once.
- App: existing CSS entrances for menus, dialogs, drawer, toasts. No decorative motion.
- Reduced motion: movement off, content all there.

## Backgrounds
- Hero and auth side panel: faint static grid fading out (`.grid-backdrop`), 21st.dev-style. Nothing animated.

## Rejected
- Dithered mountain footer and logo burst (owner dropped them).
- Aurora / animated gradients, spotlight cursors, glass stacks: distracting, heavy on cheap phones.
- Lenis / smooth-scroll hijack: breaks expectations for new web users.
- Snap-to-step on the scroll story: fought fast scrolling; replaced with rest holds.
- Black primary buttons: blue reads as "press here" more clearly for the audience.

## Checks
- `npx tsx --env-file=.env scripts/screens.mts <dir>`: every page at 1920 / 1440 / 768 / 390, reports horizontal overflow.
