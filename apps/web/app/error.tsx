"use client";

import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Link } from "../components/link";
import { unreadPage } from "../lib/error-page";

/**
 * A page whose render failed, which nearly always means ESPN did not answer and nothing was
 * cached: drawn inside the shell, where the page would be, with a retry and the page's way back.
 * It never shows the error itself: a message can carry an ESPN address.
 */
export default function ErrorPage({ reset }: { error: Error; reset?: () => void }) {
  const pathname = usePathname();
  const address = `${pathname}?${useSearchParams()}`;
  const { title, subject, back } = unreadPage(pathname);
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  // The failure is in what the server sent, so the server is asked again before the boundary
  // lets go of it; `reset()` alone would draw the same failed render. A page that failed on its
  // first load is drawn by the server with no `reset`: the refresh alone replaces it.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset?.();
    });

  // vinext keeps the boundary in its failed state through a navigation to a path under the same
  // first segment (`/nhl/teams/1` to `/nhl`), so the page arrived at would be this one for ever.
  // Leaving the address the failure was caught at lets go of it.
  const [caughtAt] = useState(address);
  useEffect(() => {
    if (address !== caughtAt) reset?.();
  }, [address, caughtAt, reset]);

  return (
    <Section data-slot="error-page">
      <title>Not answering · Yogan Hockey</title>
      <SectionHeader title={title} count="not read" />
      <p className="border-foreground/20 border-t px-2 py-1.5">
        ESPN is not answering just now, so {subject} could not be read.{" "}
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="cursor-pointer font-bold underline disabled:cursor-default disabled:text-muted-foreground"
        >
          {retrying ? "Trying again" : "Try again"}
        </button>{" "}
        or go to{" "}
        <Link href={back.href} className="font-bold underline">
          {back.label}
        </Link>
        .
      </p>
    </Section>
  );
}
