import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { safeNext } from "@/lib/safe-next";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <RedirectIfSignedIn searchParams={searchParams} />
      <LoginForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}

async function RedirectIfSignedIn({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const session = await getSession();
  if (!session) return null;
  const { next } = await searchParams;
  redirect(safeNext(typeof next === "string" ? next : null));
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
