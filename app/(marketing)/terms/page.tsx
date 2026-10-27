import type { Metadata } from "next";
import { PhaseChip } from "@/components/placeholder";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-6 lg:pt-10">
      <h1 className="title-screen">Terms of service</h1>
      <p className="mt-4 text-[15px] text-ink-2">
        Draft placeholder. Required for Google sign-in; finalised in the launch polish phase.
      </p>
      <div className="mt-4">
        <PhaseChip phase={10} />
      </div>
      <div className="mt-8 flex flex-col gap-4 text-[15px] text-ink-2">
        <p>
          <strong className="text-ink">The service.</strong> Hummin&apos; helps you save and remember events. Event
          details are extracted by AI and confirmed by you. Registration and tickets always happen on the
          host&apos;s own page.
        </p>
        <p>
          <strong className="text-ink">Your content.</strong> You own what you upload. You give us permission to
          process it to build your events and show them back to you.
        </p>
        <p>
          <strong className="text-ink">Accuracy.</strong> We do our best, but always check the date before you go.
        </p>
      </div>
    </main>
  );
}
