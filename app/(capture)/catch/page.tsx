import type { Metadata } from "next";
import { CatchClient } from "@/components/catch/catch-client";

export const metadata: Metadata = { title: "Catch an event" };

export default function CatchPage() {
  return <CatchClient />;
}
