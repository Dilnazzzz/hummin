import { Camera, Check, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { getSession } from "@/lib/session";

/** Signed-in visitors go straight to their hum. Streams in behind the static landing. */
async function RedirectIfSignedIn() {
  const session = await getSession();
  if (session) redirect("/hum");
  return null;
}

const steps = [
  {
    Icon: Camera,
    title: "Snap it",
    body: "Photo of a flyer, a screenshot of a story, a pasted link or text.",
  },
  {
    Icon: Check,
    title: "Hum it",
    body: "We read the date, place and price. You check it. One tap and it's saved.",
  },
  {
    Icon: MapPin,
    title: "Show up",
    body: "Reminders, calendar, recurring events. Never miss what's hummin'.",
  },
];

export default function LandingPage() {
  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pb-16 pt-10 lg:pt-20">
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
      </Suspense>
      <section className="flex flex-col gap-6 lg:max-w-[640px]">
        <p className="label-caps text-muted">Never miss what&apos;s hummin&apos;</p>
        <h1 className="font-serif text-[44px] leading-[1.02] tracking-[-0.01em] lg:text-[64px]">
          Save events from <em>anywhere</em>.
          <br />
          Actually go.
        </h1>
        <p className="max-w-prose text-base text-ink-2 lg:text-lg">
          Local events hide in Instagram stories, newsletters, group chats and cafe boards. Hummin&apos; catches
          them wherever you find them and remembers them for you.
        </p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/login" variant="lime" size="lg">
            Get started
          </ButtonLink>
          <ButtonLink href="/catch" variant="secondary" size="lg">
            Try a capture
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="how" className="mt-16 lg:mt-24">
        <h2 id="how" className="label-caps mb-6 text-muted">
          How it works
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <li key={title} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-lime text-ink">
                  <Icon size={18} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="label-caps text-muted">Step {i + 1}</span>
              </div>
              <p className="text-base font-semibold">{title}</p>
              <p className="text-[15px] text-ink-2">{body}</p>
            </li>
          ))}
        </ol>
      </section>

    </main>
  );
}
