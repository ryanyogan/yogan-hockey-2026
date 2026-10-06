import { Section, SectionHeader } from "@yogan-hockey/ui/components/section";

/**
 * The visitor's favorite players. Favorites are #45: it keeps the ids in the browser, resolves
 * them through a Server Action and lists them here with `PlayerLedger`. Until then nobody can
 * have one, so this is its empty state.
 */
export function FavoritePlayers() {
  return (
    <Section>
      <SectionHeader title="Favorites" count="0 players" />
      <p className="border-foreground/20 border-t px-2 py-1.5 text-foreground/70">
        No favorite players yet.
      </p>
    </Section>
  );
}
