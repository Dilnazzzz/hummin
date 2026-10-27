import type { Metadata } from "next";
import { PageContainer } from "@/components/page-container";
import { Placeholder } from "@/components/placeholder";

export const metadata: Metadata = { title: "Admin" };

// TODO(phase 3): gate on ADMIN_EMAILS server-side. TODO(phase 7): create and edit listed Explore events.

export default function AdminPage() {
  return (
    <PageContainer>
      <Placeholder
        title="Admin"
        eyebrow="ADMIN_EMAILS only"
        purpose="How Explore gets seeded at launch: create and edit listed events by capture or by form."
        phase={7}
        items={[
          "Create a listed event from a flyer using the same extraction pipeline",
          "Create or edit a listed event with a form",
          "Toggle is_listed, set host, category and location",
        ]}
      />
    </PageContainer>
  );
}
