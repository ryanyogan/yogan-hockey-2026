"use client";

import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import { TEAM_TABS, teamPageHref, teamTabOfPath } from "../../lib/team-page";
import { usePathname } from "../../lib/use-page-address";
import { Link } from "../link";

/**
 * A team page's tab bar. It is drawn by the team's route, which is not read again when the tab
 * changes, and reads the current tab from the path of the page that is drawn.
 */
export function TeamTabs({ teamId }: { teamId: string }) {
  const current = teamTabOfPath(usePathname());
  return (
    <UrlTabs
      label="Team"
      link={Link}
      current={current}
      tabs={TEAM_TABS.map((value) => ({
        value,
        label: value,
        href: teamPageHref(teamId, value),
      }))}
    />
  );
}
