"use server";

import { peekDevMagicLink } from "@/lib/email/magic-link";

/** Development only (no email provider configured): returns the last magic link for this email, else null. */
export async function devMagicLink(email: string) {
  return peekDevMagicLink(email);
}
