import Link from "next/link";
import { type ReactNode, Suspense } from "react";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { ScoreTickerSlot } from "./score-ticker-slot";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-bold text-sm ${className}`}>
      YOGAN/HOCKEY
    </Link>
  );
}

/**
 * The frame around every page. From `md` up: a sidebar and the content column. Below it: a top
 * bar with the menu, then the same column. The column is the ticker slot, the page, the footer.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-48 shrink-0 flex-col gap-1 border-rule border-r p-4 md:flex">
        <Wordmark className="mb-4" />
        <nav aria-label="Site" className="flex flex-col gap-1">
          {/* Reading the query string suspends during a static render. */}
          <Suspense>
            <NavLinks />
          </Suspense>
        </nav>
        <ThemeToggle className="mt-auto self-start px-2" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center justify-between border-rule border-b bg-background px-4 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <MobileMenu />
          </div>
        </header>
        <ScoreTickerSlot />
        {/* A page's top-level sections are spaced by the shell. */}
        <main className="flex-1 space-y-8 p-4 md:p-6">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}
