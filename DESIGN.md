# Reception — Design

Source of truth: the user's inbox mockup (Glow Studio Salon, 3-pane). Match it ~1:1 at 1440×810.

## Tokens (src/app/globals.css)
- Light (default): bg #FFFFFF, ink #000000, surface #F4F4F2, line #E6E6E3, muted #5F6662
- Dark (`prefers-color-scheme: dark`): bg #000000, ink #FFFFFF, surface #121212, line #262626, muted #A3A3A3
- Accent stays sage green in both (#3F574D buttons light / #4A7563 dark); soft accent, warn, danger, avatar and track all have light + dark values
- No hardcoded hex colors in components: use the tokens (bg-*, text-*, border-*)
- Font: Geist. Icons: Lucide, stroke 1.6–1.75.

## Layout (desktop)
- Top bar 62px · sidebar 254px · conversation list 408px · thread fills the rest
- Radii: 6px buttons, 8px cards/composer, 12px bubbles. Thin 1px dividers, almost no shadow.
- AI replies: right-aligned surface bubble with Sparkle icon. Staff replies: same bubble with User icon.
- Below lg: sidebar hides. Below md: list and thread become separate views with a Back button.

## Motion
- Colour transitions on hover/select.
- 140–200 ms rise for dropdowns, dialogs and toasts; slide-in for the mobile sidebar drawer. Transform/opacity only.
- All disabled under prefers-reduced-motion (globals.css).

## Pages
- Every app page uses the same shell (top bar 62px + 254px sidebar) as the inbox mockup.
- Page header: 24px semibold title, 14px muted description, bottom divider.
- Lists are bordered tables/lists with 1px dividers, not cards.
- Booking statuses: Pending = warn-soft, Confirmed = accent-soft, Declined/No-show = soft red, others neutral.
- Landing: one focal element, an HTML replica of the inbox (not an image). No gradients, logos or testimonials.
- Mobile (<768px): inbox and customers become list → detail views; bookings becomes an agenda list; sidebar becomes a drawer.

## Rejected
- Gradients, glow orbs, glass, bento cards, fake charts (see master prompt anti-slop list).
