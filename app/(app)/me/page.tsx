import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { Placeholder } from "@/components/placeholder";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PageContainer>
      <Placeholder
        title="You"
        purpose="Your hummingbird takes its colours from the events you go to."
        phase={10}
        items={[
          "Animated hummingbird coloured by your top three categories (later roadmap)",
          "Your vibe this month: a name, a line and category mix bars",
          "Share as a story-sized card",
        ]}
      >
        <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-5">
          <div className="flex size-20 items-center justify-center rounded-full bg-sunken text-faint" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 14c3-6 8-8 14-8-1 4-3 7-7 9l-3 4-1-3-3-2Z" />
            </svg>
          </div>
          <p className="text-[15px] text-muted">Hum a few events to colour your bird.</p>
          <ButtonLink href="/settings" variant="secondary">
            Settings
          </ButtonLink>
        </div>
      </Placeholder>
    </PageContainer>
  );
}
