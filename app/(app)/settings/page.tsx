import type { Metadata } from "next";
import { Suspense } from "react";
import { updateProfile } from "@/app/(auth)/welcome/actions";
import { signOutAction } from "./actions";
import { CATEGORY_LABEL } from "@/components/events/category";
import { PageContainer } from "@/components/page-container";
import { buttonClasses } from "@/components/ui/button-link";
import { Toast } from "@/components/ui/toast";
import { CATEGORIES } from "@/lib/db/schema";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <PageContainer>
      <header className="flex flex-col gap-2">
        <h1 className="title-screen">Settings</h1>
        <p className="text-[15px] text-ink-2">Where you are, what you&apos;re into, and how we remind you.</p>
      </header>
      <Suspense fallback={<div aria-busy="true" className="mt-6 h-80 animate-pulse rounded-card bg-sunken" />}>
        <SettingsContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function SettingsContent({ searchParams }: { searchParams: PageProps<"/settings">["searchParams"] }) {
  const user = await requireUser("/settings");
  const sp = await searchParams;
  const profile = await ensureProfile(user.id);
  const inputCls = "min-h-12 w-full rounded-tile border border-line bg-surface px-4 text-base text-ink placeholder:text-faint";

  return (
    <>
      {sp.saved ? <Toast message="Settings saved" /> : null}
      <form action={updateProfile} className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="area" className="label-caps text-muted">
            Your area
          </label>
          <input id="area" name="area" defaultValue={profile.area ?? ""} placeholder="Menlo Park" className={inputCls} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="radius" className="label-caps text-muted">
            Nearby means within <output>{profile.radiusMiles}</output> miles
          </label>
          <input id="radius" name="radius_miles" type="range" min={1} max={25} defaultValue={profile.radiusMiles} className="accent-ink" />
        </div>
        <fieldset className="flex flex-col gap-3">
          <legend className="label-caps mb-3 text-muted">Interests</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="checkbox" name="interests" value={c} defaultChecked={profile.interests.includes(c)} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-chip border border-line-strong bg-surface px-4 text-sm font-semibold text-ink peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {CATEGORY_LABEL[c]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor="timezone" className="label-caps text-muted">
            Timezone
          </label>
          <input id="timezone" name="timezone" defaultValue={profile.timezone} className={inputCls} />
        </div>
        <div className="rounded-card border border-line bg-surface p-4 text-[15px] text-ink-2">
          <p className="label-caps text-muted">Reminders</p>
          <p className="mt-1">Evening before at 6 PM and {profile.reminderHoursBefore} hours before. Email delivery arrives in the next phase.</p>
        </div>
        <button type="submit" className={buttonClasses({ size: "lg", className: "self-start" })}>
          Save
        </button>
      </form>

      <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6">
        <p className="text-[15px] text-ink-2">
          Signed in as <strong className="text-ink">{user.email}</strong>
        </p>
        <form action={signOutAction}>
          <button type="submit" className={buttonClasses({ variant: "secondary" })}>
            Sign out
          </button>
        </form>
        <p className="text-[13px] text-muted">Download my data and delete account arrive with launch polish.</p>
      </div>
    </>
  );
}
