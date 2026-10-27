import type { Metadata } from "next";
import { ConfirmClient } from "@/components/catch/confirm-client";

export const metadata: Metadata = { title: "Is this right?" };

export default function ConfirmPage() {
  return <ConfirmClient />;
}
