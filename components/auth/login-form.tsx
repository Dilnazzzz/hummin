"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonClasses } from "@/components/ui/button-link";
import { safeNext } from "@/lib/safe-next";
import { devMagicLink } from "@/app/(auth)/login/actions";

type Props = { googleEnabled: boolean };

export function LoginForm({ googleEnabled }: Props) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const linkError = params.get("error");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    setMessage(null);
    const { error } = await authClient.signIn.magicLink({
      email: email.trim(),
      callbackURL: next,
      newUserCallbackURL: `/welcome?next=${encodeURIComponent(next)}`,
      errorCallbackURL: "/login?error=link",
    });
    if (error) {
      setState("error");
      setMessage(error.message ?? "Couldn't send the link. Try again.");
      return;
    }
    setState("sent");
    if (process.env.NODE_ENV !== "production") setDevLink(await devMagicLink(email.trim()));
  }

  async function google() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      newUserCallbackURL: `/welcome?next=${encodeURIComponent(next)}`,
    });
  }

  if (state === "sent") {
    return (
      <div className="flex flex-col gap-4" role="status">
        <h1 className="title-screen">Check your email</h1>
        <p className="text-[15px] text-ink-2">
          We sent a sign-in link to <strong className="text-ink">{email}</strong>. It works for 15 minutes.
        </p>
        {devLink ? (
          <div className="flex flex-col gap-2 rounded-tile border border-warn-line bg-warn p-3">
            <p className="text-[13px] text-warn-ink">Development shortcut: no email provider is set up, so here is the link.</p>
            <a href={devLink} className={buttonClasses({ size: "lg" })}>
              Open the sign-in link
            </a>
          </div>
        ) : process.env.NODE_ENV !== "production" ? (
          <p className="rounded-tile bg-warn px-3 py-2 text-[13px] text-warn-ink">
            Local dev: the link is printed in the terminal running <code>npm run dev</code>.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setState("idle")}
          className="self-start text-sm font-semibold text-ink underline-offset-4 hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="title-screen">Sign in</h1>
        <p className="text-[15px] text-ink-2">Your hum follows you across phone and desktop.</p>
      </div>

      {linkError ? (
        <p className="rounded-tile border border-warn-line bg-warn px-3 py-2 text-[13px] text-warn-ink" role="alert">
          That link expired or was already used. Request a new one.
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {googleEnabled ? (
          <>
            <button type="button" onClick={google} className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full" })}>
              Continue with Google
            </button>
            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        ) : null}

        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <label htmlFor="email" className="label-caps text-muted">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 w-full rounded-tile border border-line bg-paper px-4 text-base text-ink placeholder:text-faint"
          />
          <button type="submit" disabled={state === "sending"} className={buttonClasses({ size: "lg" })}>
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {message ? (
            <p className="text-[13px] text-warn-ink" role="alert">
              {message}
            </p>
          ) : null}
        </form>
      </div>

      <p className="text-xs text-muted">
        No passwords. By continuing you agree to the <a href="/terms" className="underline">terms</a> and{" "}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </div>
  );
}

