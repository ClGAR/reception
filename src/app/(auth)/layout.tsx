import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-[62px] items-center border-b border-line px-4 md:px-8">
        <Link href="/">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-12 pb-16 md:pt-20">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
