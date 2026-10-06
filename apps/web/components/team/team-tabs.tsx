"use client";

import { UrlTabs } from "@yogan-hockey/ui/components/url-tabs";
import { usePathname } from "next/navigation";
import { TEAM_TABS, teamPageHref, teamTabOfPath } from "../../lib/team-page";
import { Link } from "../link";

/**
 * A team page's tab bar. It lives in the team's layout, which is not rendered again when the tab
 * changes, so it reads the current tab from the path itself: a client component for that alone.
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
