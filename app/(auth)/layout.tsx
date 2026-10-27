import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/** Sign in and onboarding: centered card, no app nav. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-10 lg:justify-center lg:py-16">
      <Link href="/" aria-label="Hummin' home" className="mb-8 rounded-md">
        <Logo size={34} />
      </Link>
      <div className="w-full max-w-[440px] rounded-panel border border-line bg-surface p-6 lg:p-8">{children}</div>
    </main>
  );
}
