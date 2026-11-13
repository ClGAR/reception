import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata = { title: "Privacy · Reception" };

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="flex h-[62px] items-center border-b border-line px-4 md:px-8">
        <Link href="/"><Logo /></Link>
      </header>
      <main className="mx-auto max-w-[680px] space-y-5 px-4 py-12 text-[15px] leading-relaxed text-ink/85">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-ink">Privacy notice</h1>
        <p className="rounded-md bg-warn-soft px-3 py-2 text-[13.5px] text-warn-ink">Draft for the MVP. To be reviewed against the Data Privacy Act of 2012 (RA 10173) before launch.</p>
        <p>Reception processes personal data on behalf of the businesses that use it. When you chat with or book at a business, that business is the personal information controller and Reception is its processor.</p>
        <h2 className="pt-2 text-[18px] font-semibold text-ink">What we collect</h2>
        <p>Your name, email, optional mobile number, appointment details and the messages you send. We collect them only to answer you and manage your appointment.</p>
        <h2 className="pt-2 text-[18px] font-semibold text-ink">Who can see it</h2>
        <p>Only staff of the business you contacted. Each business&apos;s data is kept separate from every other business.</p>
        <h2 className="pt-2 text-[18px] font-semibold text-ink">Your rights</h2>
        <p>You can ask the business to show, correct or delete your data. Contact them directly using the details on their booking page.</p>
      </main>
    </div>
  );
}
