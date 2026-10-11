import type { ReactNode } from "react";
import { Link } from "../link";
import { NavLinks } from "./nav-links";
import { ScoreTickerSlot } from "./score-ticker-slot";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`tap-target font-strong text-wordmark ${className}`}>
      YOGAN/HOCKEY
    </Link>
  );
}

/**
 * The frame around every page. From `md` up: a sidebar and the content column. Below it: a top
 * bar, the same column, and the five places in a tab bar fixed to the foot of the screen. The
 * column is the ticker slot, the page, the footer.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen w-[calc(12rem+var(--safe-left))] shrink-0 flex-col gap-1 p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] md:flex">
        <Wordmark className="mb-4" />
        <nav aria-label="Site" className="flex flex-col">
          <NavLinks />
        </nav>
        <ThemeToggle className="mt-auto self-start px-2 py-1" />
      </aside>
      {/*
        The rule beside the sidebar is the column's: the sidebar is one screen tall, and a rule of
        its own would stop a screen down a long page.
      */}
      <div className="flex min-w-0 flex-1 flex-col border-rule max-md:pb-(--tab-bar) md:border-l">
        <header className="sticky top-0 z-30 flex h-(--top-bar) shrink-0 items-center justify-between border-rule border-b bg-background pt-(--safe-top) pr-[calc(0.5rem+var(--safe-right))] pl-[calc(1rem+var(--safe-left))] md:hidden">
          <Wordmark />
          {/* 44px to press. Without the button's own border, so its words end 16px from the edge. */}
          <ThemeToggle className="min-h-11 border-0 px-2" />
        </header>
        <ScoreTickerSlot />
        {/* A page's top-level sections are spaced by the shell. */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 space-y-8 p-4 pr-[calc(1rem+var(--safe-right))] pb-8 pl-[calc(1rem+var(--safe-left))] md:p-6 md:pr-[calc(1.5rem+var(--safe-right))] md:pb-8"
        >
          {children}
        </main>
        <SiteFooter />
      </div>
      {/*
        The phone's places, after the page as they are on the screen. The column is padded by the
        bar's height, so the footer ends above it; the bar's own padding is the home bar's room, so
        its background reaches the screen's edge.
      */}
      <nav
        aria-label="Site"
        data-slot="tab-bar"
        className="fixed inset-x-0 bottom-0 z-30 grid h-(--tab-bar) grid-cols-5 border-rule border-t bg-background pr-(--safe-right) pb-(--safe-bottom) pl-(--safe-left) md:hidden"
      >
        <NavLinks variant="tabBar" />
      </nav>
    </div>
  );
}
