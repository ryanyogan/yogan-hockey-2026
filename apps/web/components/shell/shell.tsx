import type { ReactNode } from "react";
import { Link } from "../link";
import { MobileMenu } from "./mobile-menu";
import { ScoreTickerSlot } from "./score-ticker-slot";
import { Sidebar } from "./sidebar";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`font-strong text-wordmark ${className}`}>
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
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      {/*
        The rule beside the sidebar is the column's: the sidebar is one screen tall, and a rule of
        its own would stop a screen down a long page.
      */}
      <div className="flex min-w-0 flex-1 flex-col border-rule md:border-l">
        <header className="sticky top-0 z-30 flex h-(--top-bar) shrink-0 items-center justify-between border-rule border-b bg-background pt-(--safe-top) pr-[calc(0.5rem+var(--safe-right))] pl-[calc(1rem+var(--safe-left))] md:hidden">
          <Wordmark />
          {/* Each is 44px tall and padded by 8px, so the two sit 16px apart. */}
          <div className="flex items-center">
            <ThemeToggle className="min-h-11 px-2" />
            <MobileMenu />
          </div>
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
    </div>
  );
}
