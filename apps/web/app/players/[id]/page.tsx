import { PlayerGames } from "../../../components/players/player-games";
export const dynamic = "force-dynamic";
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  return <PlayerGames id={(await params).id} />;
}
