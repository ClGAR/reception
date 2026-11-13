# Reception — Design

Source of truth: the user's inbox mockup (Glow Studio Salon, 3-pane). Match it ~1:1 at 1440×810.

## Tokens (src/app/globals.css)
- bg #FAF9F6 · surface #F2F1ED · surface-2 #ECEAE4 · ink #212826 · muted #69716D
- line #E7E5DF · accent #526A60 · accent-strong #3F574D (primary buttons, badges) · accent-soft #DCE6DC
- warn-soft #F6ECC9 / warn-ink #7A5D12 (Pending approval only) · live #2F7A4D (unread dot)
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
