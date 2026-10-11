/**
 * A moment as text: a game's start, a slate's date, the "updated" stamp. Every time the site
 * shows is put together here. The server does not know the visitor's time zone, so it writes the
 * NHL's (Eastern) and `LocalTime` writes the visitor's once the page is in the browser.
 *
 * Text is assembled from `formatToParts`, because the space before "PM" differs between runtimes.
 */

/** The zone the NHL dates its slates in, and the one a time is shown in before the visitor's. */
export const NHL_TIME_ZONE = "America/New_York";

const formatter = (timeZone: string | undefined, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...options, timeZone });

const part = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((each) => each.type === type)?.value ?? "";

/** "Tue Oct 6": the day a game starts. Without a zone, the zone of whatever runs this. */
export function gameDay(startTime: string, timeZone?: string): string {
  const parts = formatter(timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).formatToParts(new Date(startTime));
  return `${part(parts, "weekday")} ${part(parts, "month")} ${part(parts, "day")}`;
}

/** "7:00 PM": the time a game starts. Without a zone, the zone of whatever runs this. */
export function gameTime(startTime: string, timeZone?: string): string {
  const parts = formatter(timeZone, { hour: "numeric", minute: "2-digit" }).formatToParts(
    new Date(startTime),
  );
  return `${part(parts, "hour")}:${part(parts, "minute")} ${part(parts, "dayPeriod")}`;
}

/** "20:14:07": a moment to the second on a 24-hour clock, as the "updated" stamp shows it. */
export function clockTime(at: string, timeZone?: string): string {
  const parts = formatter(timeZone, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(at));
  return `${part(parts, "hour")}:${part(parts, "minute")}:${part(parts, "second")}`;
}

/** The three ways a moment is shown, by the name `LocalTime` takes for each. */
export const TIME_FORMATS = { day: gameDay, time: gameTime, clock: clockTime };

/** What the server's Eastern time is marked with. A day needs no mark. */
const EASTERN_MARK = { day: "", time: " ET", clock: " ET" };

/**
 * "7:00 PM ET": a moment as the server writes it, in Eastern time and marked so. The mark makes a
 * time or a clock longer than the same moment in any visitor's zone, so the room this takes holds
 * whichever of the two is drawn.
 */
export function easternTime(at: string, show: keyof typeof TIME_FORMATS): string {
  return `${TIME_FORMATS[show](at, NHL_TIME_ZONE)}${EASTERN_MARK[show]}`;
}

/** "Tue Oct 6": a slate's date (`YYYY-MM-DD`), a calendar day with no time zone of its own. */
export function slateDay(date: string): string {
  return gameDay(`${date}T00:00:00Z`, "UTC");
}

/** "Oct 6": a calendar day (`YYYY-MM-DD`) in a table that has no room for the weekday. */
export function calendarDay(date: string): string {
  const parts = formatter("UTC", { month: "short", day: "numeric" }).formatToParts(
    new Date(`${date}T00:00:00Z`),
  );
  return `${part(parts, "month")} ${part(parts, "day")}`;
}
