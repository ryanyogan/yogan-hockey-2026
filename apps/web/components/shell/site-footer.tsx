export function SiteFooter() {
  return (
    <footer className="py-4 pr-[calc(1rem+var(--safe-right))] pb-[calc(1rem+var(--safe-bottom))] pl-[calc(1rem+var(--safe-left))] text-[10px] text-foreground/40 md:pr-[calc(1.5rem+var(--safe-right))] md:pl-6">
      Scores and stats from{" "}
      <a href="https://www.espn.com/nhl/" className="underline hover:text-foreground">
        ESPN
      </a>
      . Yogan Hockey is a family project, not affiliated with ESPN or the NHL.
    </footer>
  );
}
