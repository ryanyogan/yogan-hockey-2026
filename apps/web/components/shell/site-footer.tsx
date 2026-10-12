/** The foot of every page: a plain rule over the credit, a band's height under the page. */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-rule border-t pt-3 text-[13px] text-aside leading-[1.45] md:mt-11">
      <p>
        Scores and stats from{" "}
        <a
          href="https://www.espn.com/nhl/"
          className="tap-target text-foreground underline underline-offset-2 hover:text-label"
        >
          ESPN
        </a>
        . Yogan Hockey is a family project, not affiliated with ESPN or the NHL.
      </p>
    </footer>
  );
}
