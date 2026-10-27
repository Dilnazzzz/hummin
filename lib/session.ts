import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** Current session or null. Request-time: call inside a Suspense boundary or a Server Action. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Redirects to /login (returning to `next`) when signed out. */
export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next ?? "/hum")}`);
  return session.user;
}

