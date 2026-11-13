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

const nav = [
  { label: "Overview", href: "/app/overview", icon: LayoutGrid },
  { label: "Inbox", href: "/app/inbox", icon: MessageSquare },
  { label: "Bookings", href: "/app/bookings", icon: CalendarDays },
  { label: "Customers", href: "/app/customers", icon: Users },
  { label: "Services", href: "/app/services", icon: Scissors },
  { label: "Knowledge", href: "/app/knowledge", icon: BookOpen },
  { label: "Settings", href: "/app/settings", icon: Settings },
] as const;

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
  return (
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <TopBar {...p} onMenu={() => setDrawer(true)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar {...p} className="hidden lg:flex" />
        {drawer && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button aria-label="Close menu" className="absolute inset-0 bg-ink/25" onClick={() => setDrawer(false)} />
            <Sidebar {...p} className="drawer-anim relative z-10 flex h-full bg-bg shadow-xl" onClose={() => setDrawer(false)} />
          </div>
        )}
        <main id="main" className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          {p.children}
        </main>
      </div>
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
    <header className="flex h-[62px] shrink-0 items-center border-b border-line px-4 md:px-7">
      <button onClick={p.onMenu} aria-label="Open menu" className="-ml-1 mr-2 grid size-9 place-items-center rounded-md hover:bg-surface lg:hidden">
        <Menu size={20} />
      </button>
      <Link href="/app/overview" className="flex items-center gap-3 md:w-[211px]">
        <Logo />
      </Link>
      <span className="mx-5 hidden h-7 w-px bg-line md:block" />
      <span className="hidden items-center gap-3 text-[16px] md:flex" title="Business">
        <span className="max-w-[220px] truncate">{p.businessName}</span>
        <ChevronDown size={17} strokeWidth={1.75} className="text-muted" aria-hidden />
      </span>
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/app/customers?q=${encodeURIComponent(q)}`);
          }}
          className="hidden h-10 w-[440px] items-center gap-3 rounded-lg border border-line bg-bg px-3 focus-within:border-accent xl:flex"
        >
          <Search size={19} strokeWidth={1.75} aria-hidden />
          <label htmlFor="global-search" className="sr-only">
            Search customers
          </label>
          <input
            id="global-search"
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations, customers, bookings..."
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          <kbd className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[12px] text-muted">
            <Command size={11} /> K
          </kbd>
        </form>
        <Link href="/app/customers" aria-label="Search" className="grid size-9 place-items-center rounded-md hover:bg-surface xl:hidden">
          <Search size={20} strokeWidth={1.75} />
        </Link>
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
    <div ref={ref} className="relative md:mx-3">
      <button
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open && unread) start(() => void markNotificationsRead());
        }}
        className="relative grid size-9 place-items-center rounded-md hover:bg-surface"
      >
        <Bell size={21} strokeWidth={1.75} />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-bg bg-live" />}
      </button>
      {open && (
        <div className="menu-anim absolute right-0 z-30 mt-2 w-[340px] max-w-[calc(100vw-32px)] rounded-lg border border-line bg-bg shadow-[0_12px_40px_-12px_rgba(33,40,38,0.25)]">
          <p className="border-b border-line px-4 py-2.5 text-[13.5px] font-medium">Notifications</p>
          <ul className="max-h-[360px] overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-8 text-center text-[13.5px] text-muted">You&apos;re all caught up.</li>}
            {items.map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line px-4 py-3 text-[13.5px] last:border-0">
                <span className={cx("mt-1.5 size-1.5 shrink-0 rounded-full", n.unread ? "bg-live" : "bg-transparent")} />
                <span className="flex-1">
                  {n.text}
                  <span className="mt-0.5 block text-[12px] text-muted">{n.ago}</span>
                </span>
              </li>
            ))}
          </ul>
          <Link href="/app/bookings" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-2.5 text-[13px] text-muted hover:text-ink">
            View bookings
          </Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useOutside(open, () => setOpen(false));
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <div ref={ref} className="relative">
      <button className="flex items-center gap-2" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="grid size-9 place-items-center rounded-full bg-surface-2 text-[14px] font-semibold">{initials}</span>
        <ChevronDown size={17} strokeWidth={1.75} className="hidden md:block" />
      </button>
      {open && (
        <div className="menu-anim absolute right-0 z-30 mt-2 w-[250px] rounded-lg border border-line bg-bg py-1 shadow-[0_12px_40px_-12px_rgba(33,40,38,0.25)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-[14px] font-medium">{name}</p>
            <p className="truncate text-[12.5px] text-muted">{email}</p>
            <p className="mt-1 text-[12px] text-muted capitalize">{role === "member" ? "Reception staff" : role}</p>
          </div>
          <Link href="/app/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-[14px] hover:bg-surface">
            <Settings size={16} /> Settings
          </Link>
          <button
            onClick={async () => {
              await authClient.signOut();
              router.push("/login");
              router.refresh();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] hover:bg-surface"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar(p: ShellProps & { className?: string; onClose?: () => void }) {
  const path = usePathname();
  const { aiMessages } = p.counts;
  const pct = p.aiLimit ? Math.min(100, (aiMessages / p.aiLimit) * 100) : 0;
  return (
    <aside className={cx("w-[254px] shrink-0 flex-col border-r border-line px-3 pt-8 pb-4", p.className)} aria-label="Workspace">
      <div className="mb-3 flex items-center justify-between px-4">
        <p className="text-[12.5px] font-medium tracking-[0.06em] text-muted">WORKSPACE</p>
        {p.onClose && (
          <button onClick={p.onClose} aria-label="Close menu" className="grid size-8 place-items-center rounded-md hover:bg-surface">
            <X size={18} />
          </button>
        )}
      </div>
      <nav className="space-y-1.5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path.startsWith(href);
          const badge = label === "Inbox" ? p.counts.unread : label === "Bookings" ? p.counts.pending : 0;
          return (
            <Link
              key={label}
              href={href}
              onClick={p.onClose}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex h-[42px] items-center gap-4 rounded-md px-4 text-[16.5px] transition-colors",
                active ? "bg-surface-2 font-medium" : "hover:bg-surface",
              )}
            >
              <Icon size={20} strokeWidth={1.6} aria-hidden />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  aria-label={`${badge} ${label === "Inbox" ? "unread" : "pending"}`}
                  className={cx(
                    "grid h-5 min-w-5 place-items-center rounded px-1 text-[12px] font-medium",
                    active || label === "Inbox" ? "bg-accent-strong text-white" : "bg-surface-2 text-ink/80",
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg bg-surface px-4 py-3.5">
        <p className="flex items-center gap-2.5 text-[15px] font-medium">
          <Zap size={17} strokeWidth={1.75} aria-hidden /> Pro Plan
        </p>
        <p className="mt-2 text-[14.5px]">
          {aiMessages.toLocaleString()} / {p.aiLimit.toLocaleString()} messages
        </p>
        <div className="mt-2 h-1.5 rounded-full bg-track" role="progressbar" aria-valuenow={aiMessages} aria-valuemax={p.aiLimit} aria-label="AI messages used this month">
          <div className="h-full rounded-full bg-accent-strong" style={{ width: `${pct}%` }} />
        </div>
        <Link href="/app/settings?tab=usage" className="mt-3 flex items-center gap-2 text-[14px] text-ink/80 hover:text-ink">
          Manage plan <ArrowRight size={15} />
        </Link>
      </div>
    </aside>
  );
}
