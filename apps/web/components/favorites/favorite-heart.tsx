"use client";

import { HeartButton } from "@yogan-hockey/ui/components/heart-button";
import type { FavoriteKind } from "../../lib/favorites";
import { useFavorites } from "../../lib/use-favorites";

/**
 * The heart beside a player or a team: filled when a favorite, and pressing it changes that.
 * A server component can render it. It is drawn empty on the server and fills in once the page
 * has read the browser's favorites, without moving anything.
 */
export function FavoriteHeart({
  kind,
  id,
  name,
  className,
}: {
  kind: FavoriteKind;
  id: string;
  /** Whose heart it is, for the button's name: "Auston Matthews", "Toronto Maple Leafs". */
  name: string;
  className?: string;
}) {
  const { has, toggle } = useFavorites(kind);
  const pressed = has(id);
  return (
    <HeartButton
      pressed={pressed}
      label={`Favorite ${name}`}
      title={pressed ? "Remove from favorites" : "Add to favorites"}
      className={className}
      onClick={() => toggle(id)}
    />
  );
}
