import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";

// TODO(phase 3): require a session here (auth.api.getSession) and redirect to /login?next=.

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
