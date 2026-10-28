import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}

/** Request-time: redirects signed-in visitors and reads provider config from the live environment. */
async function LoginGate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const session = await getSession();
  if (session) {
    const { next } = await searchParams;
    redirect(safeNext(typeof next === "string" ? next : null));
  }
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  return <LoginForm googleEnabled={googleEnabled} />;
}

function LoginSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="h-11 w-40 animate-pulse rounded-tile bg-sunken" />
      <div className="h-5 w-64 animate-pulse rounded bg-sunken" />
      <div className="mt-4 h-12 animate-pulse rounded-tile bg-sunken" />
      <div className="h-[52px] animate-pulse rounded-chip bg-sunken" />
    </div>
  );
}
