"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Command,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Scissors,
  Search,
  Settings,
  Users,
  X,
  Zap,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { markNotificationsRead } from "@/server/actions";
import { cx } from "@/components/ui";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { FloatingAssistant } from "@/components/assistant/floating-assistant";

const nav = [
  { label: "Overview", href: "/app/overview", icon: LayoutGrid },
  { label: "Inbox", href: "/app/inbox", icon: MessageSquare },
  { label: "Bookings", href: "/app/bookings", icon: CalendarDays },
  { label: "Customers", href: "/app/customers", icon: Users },
  { label: "Services", href: "/app/services", icon: Scissors },
  { label: "Knowledge", href: "/app/knowledge", icon: BookOpen },
  { label: "Settings", href: "/app/settings", icon: Settings },
] as const;

const mobileNav = nav.slice(0, 4);

export interface ShellProps {
  businessName: string;
  userName: string;
  userEmail: string;
  role: string;
  counts: { unread: number; pending: number; aiMessages: number; unreadNotifications: number };
  aiLimit: number;
  notifications: { id: string; kind: string; text: string; ago: string; unread: boolean }[];
  children: ReactNode;
}

export function AppShell(p: ShellProps) {
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <TopBar {...p} onMenu={() => setDrawer(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar {...p} className="hidden w-[248px] lg:flex" />
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button aria-label="Close menu" className="absolute inset-0 bg-[var(--scrim)] backdrop-blur-[2px]" onClick={() => setDrawer(false)} />
            <div className="drawer-anim relative z-10 flex h-full w-[288px] max-w-[84vw] flex-col border-r border-line bg-bg-elevated shadow-[var(--shadow-float)]">
              <Sidebar {...p} className="flex w-full flex-1" onClose={() => setDrawer(false)} />
              <div className="border-t border-line px-5 py-4">
                <p className="truncate text-[14.5px] font-medium">{p.userName}</p>
                <p className="truncate text-[13.5px] text-ink-3">{p.userEmail}</p>
                <SignOutButton className="mt-3 flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[15px] text-ink-2 hover:bg-surface" />
              </div>
            </div>
          </div>
        )}
        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(62px+env(safe-area-inset-bottom))] lg:pb-0">
          {p.children}
        </main>
      </div>
      <MobileTabs counts={p.counts} onMore={() => setDrawer(true)} />
      <FloatingAssistant counts={p.counts} aiLimit={p.aiLimit} />
    </div>
  );
}

function TopBar(p: ShellProps & { onMenu: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="material z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line px-3 md:h-[60px] md:px-5">
      <button onClick={p.onMenu} aria-label="Open menu" className="press -ml-0.5 grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface hover:text-ink lg:hidden">
        <Menu size={20} />
      </button>
      <Link href="/app/overview" className="flex items-center gap-3 md:w-[216px]" aria-label="Reception home">
        <Logo />
      </Link>
      <span className="mx-3 hidden h-6 w-px bg-line md:block" />
      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <span className="max-w-[220px] truncate text-[14.5px] font-medium">{p.businessName}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[12px] font-medium text-ink-3">Pro</span>
      </div>
      <div className="ml-auto flex items-center gap-1 md:gap-2">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/app/customers?q=${encodeURIComponent(q)}`);
          }}
          className="mr-1 hidden h-10 w-[340px] items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3.5 transition-colors focus-within:border-primary focus-within:bg-bg xl:flex"
        >
          <Search size={17} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
          <label htmlFor="global-search" className="sr-only">
            Search customers
          </label>
          <input
            id="global-search"
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people, bookings, messages"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none placeholder:text-ink-3"
          />
          <kbd className="flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-bg px-1.5 py-0.5 text-[12px] text-ink-3">
            <Command size={10} /> K
          </kbd>
        </form>
        <Link href="/app/customers" aria-label="Search" className="press grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface hover:text-ink xl:hidden">
          <Search size={19} strokeWidth={1.75} />
        </Link>
        <ThemeToggle />
        <Notifications items={p.notifications} unread={p.counts.unreadNotifications} />
        <AccountMenu name={p.userName} email={p.userEmail} role={p.role} />
      </div>
    </header>
  );
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function Notifications({ items, unread }: { items: ShellProps["notifications"]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const ref = useOutside(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) start(() => void markNotificationsRead());
        }}
        className="press relative grid size-10 place-items-center rounded-full text-ink-2 hover:bg-surface hover:text-ink"
      >
        <Bell size={19} strokeWidth={1.75} />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-bg bg-primary" />}
      </button>
      {open && (
        <div className="pop menu-anim absolute right-0 z-30 mt-2 w-[344px] max-w-[calc(100vw-24px)] overflow-hidden">
          <p className="border-b border-line px-4 py-3 text-[14px] font-semibold">Notifications</p>
          <ul className="max-h-[360px] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-10 text-center text-[14.5px] text-ink-3">You&apos;re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line px-4 py-3 text-[14.5px] last:border-0 hover:bg-surface">
                <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", n.unread ? "bg-primary" : "bg-line-strong")} />
                <span className="flex-1 leading-relaxed">
                  {n.text}
                  <span className="mt-0.5 block text-[13px] text-ink-3">{n.ago}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/app/bookings" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-[13.5px] text-ink-3 hover:text-ink">
            View bookings
          </Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div ref={ref} className="relative">
      <button className="press flex items-center gap-1.5 rounded-full p-0.5 hover:bg-surface md:pr-1.5" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-[13.5px] font-semibold text-primary">{initials}</span>
        <ChevronDown size={14} strokeWidth={2} className="hidden text-ink-3 md:block" />
      </button>
      {open && (
        <div className="pop menu-anim absolute right-0 z-30 mt-2 w-[256px] overflow-hidden py-1">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[15px] font-medium">{name}</p>
            <p className="truncate text-[13.5px] text-ink-3">{email}</p>
            <p className="mt-1.5 text-[12.5px] tracking-[0.01em] text-ink-3 capitalize">{role === "member" ? "Reception staff" : role}</p>
          </div>
          <Link href="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-[15px] hover:bg-surface">
            <Settings size={16} /> Settings
          </Link>
          <SignOutButton className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[15px] hover:bg-surface" />
        </div>
      )}
    </div>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
      className={className}
    >
      <LogOut size={16} /> Sign out
    </button>
  );
}

function Sidebar(p: ShellProps & { className?: string; onClose?: () => void }) {
  const path = usePathname();
  const { aiMessages } = p.counts;
  const pct = p.aiLimit ? Math.min(100, (aiMessages / p.aiLimit) * 100) : 0;
  return (
    <aside className={cx("shrink-0 flex-col border-r border-line px-3 py-5", p.className)} aria-label="Workspace">
      {p.onClose && (
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-[13px] font-medium text-ink-3">Menu</span>
          <button onClick={p.onClose} aria-label="Close menu" className="press grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink">
            <X size={17} />
          </button>
        </div>
      )}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4" aria-label="Sections">
        {[
          { title: "Workspace", items: nav.slice(0, 4) },
          { title: "Setup", items: nav.slice(4) },
        ].map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1.5 text-[13px] font-medium text-ink-3">{group.title}</p>
            <div className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = path.startsWith(href);
                const badge = label === "Inbox" ? p.counts.unread : label === "Bookings" ? p.counts.pending : 0;
                return (
                  <Link
                    key={label}
                    href={href}
                    onClick={p.onClose}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "press flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px]",
                      active ? "bg-accent-soft font-semibold text-primary" : "text-ink-2 hover:bg-surface hover:text-ink",
                    )}
                  >
                    <Icon size={18} strokeWidth={active ? 2 : 1.7} aria-hidden />
                    <span className="flex-1">{label}</span>
                    {badge > 0 && (
                      <span
                        aria-label={`${badge} ${label === "Inbox" ? "unread" : "pending"}`}
                        className={cx(
                          "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold tabular-nums",
                          label === "Inbox" ? "bg-primary text-primary-ink" : "bg-warn-soft text-warn-ink",
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto rounded-[14px] border border-line bg-surface px-4 py-3.5">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold">
          <Zap size={13} strokeWidth={2} aria-hidden /> Pro plan
        </p>
        <p className="mt-1.5 text-[12.5px] text-ink-3 tabular-nums">
          {aiMessages.toLocaleString()} / {p.aiLimit.toLocaleString()} AI messages
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-track" role="progressbar" aria-valuenow={aiMessages} aria-valuemax={p.aiLimit} aria-label="AI messages used this month">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
        </div>
        <Link href="/app/settings?tab=usage" className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2 hover:text-ink">
          Manage plan <ArrowRight size={12} />
        </Link>
      </div>
    </aside>
  );
}

function MobileTabs({ counts, onMore }: { counts: ShellProps["counts"]; onMore: () => void }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="material-strong pb-safe fixed inset-x-0 bottom-0 z-40 grid h-[62px] grid-cols-5 items-stretch border-t border-line lg:hidden"
    >
      {mobileNav.map(({ label, href, icon: Icon }) => {
        const active = path.startsWith(href);
        const badge = label === "Inbox" ? counts.unread : label === "Bookings" ? counts.pending : 0;
        return (
          <Link key={label} href={href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center justify-center gap-1 text-[12px]">
            <span className={cx("relative", active ? "text-primary" : "text-ink-3")}>
              <Icon size={21} strokeWidth={active ? 2.1 : 1.7} aria-hidden />
              {badge > 0 && <span className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[11.5px] font-semibold tabular-nums text-primary-ink tabular-nums">{badge}</span>}
            </span>
            <span className={cx(active ? "font-semibold text-primary" : "text-ink-2")}>{label}</span>
            {active && <span className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary" />}
          </Link>
        );
      })}
      <button onClick={onMore} className="flex flex-col items-center justify-center gap-1 text-[12px] text-ink-2">
        <MoreHorizontal size={21} strokeWidth={1.7} />
        More
      </button>
    </nav>
  );
}
