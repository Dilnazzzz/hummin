import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell/app-shell";

/** Capture, reading and confirm screens: same shell, but no bottom nav on phones. */
export default function CaptureLayout({ children }: { children: ReactNode }) {
  return <AppShell bottomNav={false}>{children}</AppShell>;
}
