export function SiteFooter() {
  return (
    <footer className="border-rule border-t pt-3 pr-[calc(1rem+var(--safe-right))] pb-[calc(0.75rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] text-aside text-small md:pr-[calc(1.5rem+var(--safe-right))] md:pl-6">
      Scores and stats from{" "}
      <a href="https://www.espn.com/nhl/" className="underline hover:text-foreground">
        ESPN
      </a>
      . Yogan Hockey is a family project, not affiliated with ESPN or the NHL.
    </footer>
  );
}
