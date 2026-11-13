import Link from "next/link";
import { redirect } from "next/navigation";
import { getContext } from "@/server/context";
import { Logo } from "@/components/logo";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const metadata = { title: "Set up your business · Reception" };

export default async function OnboardingPage() {
  const ctx = await getContext();
  if (!ctx) redirect("/login?next=/onboarding");
  if (ctx.business) redirect("/app/overview");
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[62px] items-center border-b border-line px-4 md:px-8">
        <Link href="/"><Logo /></Link>
        <span className="ml-auto text-[13.5px] text-muted">Signed in as {ctx.user.email}</span>
      </header>
      <main className="mx-auto max-w-[640px] px-4 py-10">
        {ctx.user.emailVerified ? (
          <OnboardingWizard ownerName={ctx.user.name} />
        ) : (
          <p className="rounded-md bg-warn-soft px-4 py-3 text-[14px] text-warn-ink">Verify your email first. Open the link we sent to {ctx.user.email}.</p>
        )}
      </main>
    </div>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
