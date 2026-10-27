import Link from "next/link";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button-link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <Link href="/" aria-label="Hummin' home">
        <Logo size={32} />
      </Link>
      <h1 className="title-screen">Nothing hummin&apos; here</h1>
      <p className="max-w-sm text-[15px] text-ink-2">That page doesn&apos;t exist, or it moved on.</p>
      <ButtonLink href="/hum">Back to your hum</ButtonLink>
    </main>
  );
}
