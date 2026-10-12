const ORDINALS = new Intl.PluralRules("en", { type: "ordinal" });
const SUFFIX: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

/** "1st", "2nd", "3rd", "11th": a place in a table. */
export function ordinal(place: number): string {
  return `${place}${SUFFIX[ORDINALS.select(place)] ?? "th"}`;
}
