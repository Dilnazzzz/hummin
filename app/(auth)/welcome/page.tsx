import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { WelcomeForm } from "@/components/auth/welcome-form";
import { safeNext } from "@/lib/safe-next";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="title-screen">Welcome</h1>
        <p className="text-[15px] text-ink-2">Tell us where you are and what you&apos;re into. You can skip this.</p>
      </div>
      <Suspense fallback={<div aria-busy="true" className="h-64 animate-pulse rounded-card bg-sunken" />}>
        <WelcomeContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WelcomeContent({ searchParams }: { searchParams: PageProps<"/welcome">["searchParams"] }) {
  const user = await requireUser("/welcome");
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const profile = await ensureProfile(user.id);
  if (profile.onboardedAt && sp.edit !== "1") redirect(next);
  return <WelcomeForm next={next} initial={{ area: profile.area, interests: profile.interests }} />;
}
