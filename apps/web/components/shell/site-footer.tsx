import { COLOPHON } from "../../lib/agate-copy";

/**
 * The foot of every page (#240): the 3px double rule, which only this and the masthead have,
 * over the credit at one end and the paper's name at the other. On a phone the two are one
 * above the other.
 */
export function SiteFooter() {
  return (
    <footer className="mt-9 flex flex-wrap justify-between gap-x-6 gap-y-2 border-rule border-t-[3px] border-double pt-3 text-[13px] text-muted-foreground leading-[1.45]">
      <p>
        Scores and stats from{" "}
        <a
          href="https://www.espn.com/nhl/"
          className="tap-target text-foreground underline underline-offset-2 hover:text-kicker"
        >
          ESPN
        </a>
        . Yogan Hockey is a family project, not affiliated with ESPN or the NHL.
      </p>
      <p className="whitespace-nowrap uppercase tracking-[0.1em]">{COLOPHON}</p>
    </footer>
  );
}
