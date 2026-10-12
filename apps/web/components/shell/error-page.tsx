import { useRouter } from "@tanstack/react-router";
import { PageHeader } from "@yogan-hockey/ui/components/section";
import { useTransition } from "react";
import { unreadPage } from "../../lib/error-page";
import { usePathname } from "../../lib/use-page-address";
import { Link } from "../link";

/**
 * A page whose read failed, which nearly always means ESPN did not answer and nothing was
 * cached: drawn inside the shell, where the page would be, with a retry and the page's way back.
 * It never shows the error itself: a message can carry an ESPN address.
 */
export function ErrorPage() {
  const pathname = usePathname();
  const { title, subject, back } = unreadPage(pathname);
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  // The failure is in what the loader read, so it is read again: the router lets go of the
  // failure when the read answers.
  const retry = () => startTransition(() => router.invalidate());

  return (
    <section data-slot="error-page">
      <PageHeader title={title} count="not read" />
      <p className="pt-3 font-serif text-prose text-note leading-[1.4]">
        ESPN is not answering just now, so {subject} could not be read.{" "}
        <button
          type="button"
          onClick={retry}
          disabled={retrying}
          className="tap-target cursor-pointer font-strong underline disabled:cursor-default disabled:text-aside"
        >
          {retrying ? "Trying again" : "Try again"}
        </button>{" "}
        or go to{" "}
        <Link href={back.href} className="tap-target font-strong underline">
          {back.label}
        </Link>
        .
      </p>
    </section>
  );
}
