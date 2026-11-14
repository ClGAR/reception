import { MessageSquare } from "lucide-react";

export function Logo({ name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Reception" }: { name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-[28px] place-items-center rounded-[8px] bg-brand text-white" aria-hidden>
        <MessageSquare size={14} strokeWidth={2.4} fill="currentColor" />
      </span>
      <span className="font-display text-[19px] font-semibold tracking-[-0.03em]">{name}</span>
    </span>
  );
}
