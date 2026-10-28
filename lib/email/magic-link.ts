import { env } from "../env";

// Development only: remember the last link per email so the login screen can
// offer it directly (no email provider on a laptop or phone test). Lives on
// globalThis so route handlers and server actions share it.
type DevLinks = Map<string, { url: string; at: number }>;
const devLinks: DevLinks = ((globalThis as { __humminDevLinks?: DevLinks }).__humminDevLinks ??= new Map());
const DEV_LINKS_ENABLED = env.NODE_ENV !== "production" && !env.RESEND_API_KEY;

export function peekDevMagicLink(email: string): string | null {
  if (!DEV_LINKS_ENABLED) return null;
  const hit = devLinks.get(email.trim().toLowerCase());
  return hit && Date.now() - hit.at < 15 * 60 * 1000 ? hit.url : null;
}

/**
 * Sends the magic link with Resend when a key is configured.
 * In development without a key, prints the link to the server terminal instead.
 */
export async function sendMagicLinkEmail(to: string, url: string) {
  if (!env.RESEND_API_KEY) {
    console.log(`\n[hummin] Magic link for ${to}\n${url}\n`);
    if (DEV_LINKS_ENABLED) devLinks.set(to.trim().toLowerCase(), { url, at: Date.now() });
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject: "Your sign-in link",
      text: `Tap to sign in to Hummin': ${url}\n\nThis link expires in 15 minutes. If you didn't ask for it, ignore this email.`,
      html: `<p style="font:16px/1.5 system-ui">Tap to sign in to Hummin&apos;:</p><p><a href="${url}" style="display:inline-block;background:#1B1A20;color:#FAF8F3;padding:14px 22px;border-radius:999px;text-decoration:none;font:600 16px system-ui">Sign in</a></p><p style="font:13px/1.5 system-ui;color:#5E5B66">This link expires in 15 minutes. If you didn&apos;t ask for it, ignore this email.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}
