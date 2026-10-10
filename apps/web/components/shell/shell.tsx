import { type ReactNode, Suspense } from "react";
import { Link } from "../link";
import { NavLinks } from "./nav-links";
import { ScoreTickerSlot } from "./score-ticker-slot";
import { SiteFooter } from "./site-footer";
import { ThemeToggle } from "./theme-toggle";

/** A persistent server layout: only the current-link marker and theme control need state. */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-container header-inner">
          <Link href="/" className="wordmark" aria-label="YOGAN/HOCKEY">
            YOGAN<span>/HOCKEY</span>
          </Link>
          <nav aria-label="Site" className="site-nav">
            <Suspense>
              <NavLinks />
            </Suspense>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <ScoreTickerSlot />
      <main id="main-content" className="site-container page-content">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
