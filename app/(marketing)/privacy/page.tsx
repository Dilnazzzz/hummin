import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-6 lg:pt-10">
      <h1 className="title-screen">Privacy policy</h1>
      <p className="mt-4 text-[15px] text-ink-2">
        Draft placeholder. The real policy is written before the Google sign-in consent screen goes live.
      </p>
      <div className="mt-8 flex flex-col gap-4 text-[15px] text-ink-2">
        <p>
          <strong className="text-ink">What we store.</strong> Your name, email and avatar for sign-in. Your area,
          interests and timezone so reminders and Explore make sense. The events you save and the flyers you
          upload.
        </p>
        <p>
          <strong className="text-ink">What we never do.</strong> Sell your data. Store precise GPS unless you ask
          for it. Infer sensitive traits.
        </p>
        <p>
          <strong className="text-ink">Your controls.</strong> Download your data and delete your account from
          Settings. Uploaded images are removed within 30 days of deletion.
        </p>
      </div>
    </main>
  );
}
