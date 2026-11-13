import { MessageSquare } from "lucide-react";

export function Logo({ name = process.env.NEXT_PUBLIC_BRAND_NAME ?? "Reception" }: { name?: string }) {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-[28px] place-items-center rounded-[7px] bg-accent-strong text-white" aria-hidden>
        <MessageSquare size={15} strokeWidth={2.25} fill="currentColor" />
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.02em]">{name}</span>
    </span>
  );
}
