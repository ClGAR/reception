import { MessageSquare } from "lucide-react";

export function Logo({ name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Reception" }: { name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-[27px] place-items-center rounded-[8px] bg-primary text-primary-ink" aria-hidden>
        <MessageSquare size={14} strokeWidth={2.4} fill="currentColor" />
      </span>
      <span className="text-[20px] font-semibold tracking-[-0.045em]">{name}</span>
    </span>
  );
}
