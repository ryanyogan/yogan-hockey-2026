import { expect, test } from "vitest";
import { spaceEndedAddress, trailingSlashLocation } from "./canonical-address";

const at = (path: string) => new URL(`https://hockey.test${path}`);

test("an address ending in a slash lives at the one without it, its query kept", () => {
  for (const [asked, answer] of [
    ["/nhl/", "/nhl"],
    ["/nhl/live/", "/nhl/live"],
    ["/nhl/teams/21/", "/nhl/teams/21"],
    ["/nhl/teams/21/roster/", "/nhl/teams/21/roster"],
    ["/nhl/games/401803652/", "/nhl/games/401803652"],
    ["/players/", "/players"],
    ["/players/4024123/", "/players/4024123"],
    ["/picks/", "/picks"],
    ["/skeleton/", "/skeleton"],
    ["/no-such-page/", "/no-such-page"],
    // As the site before the port answered each of these.
    ["/nhl/?x=1&y=2", "/nhl?x=1&y=2"],
    ["/nhl/teams/21/?tab=roster", "/nhl/teams/21?tab=roster"],
    ["/nhl/live/?", "/nhl/live"],
    ["/nhl//", "/nhl"],
    ["/Nhl/", "/Nhl"],
    ["/nhl/%20/", "/nhl/%20"],
  ])
    expect(trailingSlashLocation(at(asked as string))).toBe(`https://hockey.test${answer}`);
});

test("an address with no slash to lose is left alone", () => {
  for (const path of ["/", "/?x=1", "//", "/nhl", "/nhl?next=/players/", "/nhl/teams/21/roster"])
    expect(trailingSlashLocation(at(path))).toBeNull();
});

test("an address ending in a space is handed to the site with the space kept", () => {
  for (const [asked, handed] of [
    ["/nhl/teams/%20", "/nhl/teams/%20/"],
    ["/nhl/teams/21%20", "/nhl/teams/21%20/"],
    ["/nhl%20%20", "/nhl%20%20/"],
    ["/%20", "/%20/"],
    ["/nhl/teams/%20?x=1", "/nhl/teams/%20/?x=1"],
  ])
    expect(spaceEndedAddress(at(asked as string))?.href).toBe(`https://hockey.test${handed}`);
});

test("any other address is the site's as it was asked", () => {
  for (const path of [
    "/nhl/teams/21",
    "/nhl/teams/%20/roster",
    "/nhl/teams/%2021",
    "/nhl/teams/21?x=%20",
    "/players?q=mar%20",
  ])
    expect(spaceEndedAddress(at(path))).toBeNull();
});
