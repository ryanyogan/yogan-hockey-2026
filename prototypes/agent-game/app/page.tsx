export const dynamic = "force-dynamic";

const SCOREBOARD = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard";

export default async function Home() {
  const started = Date.now();
  const res = await fetch(SCOREBOARD, { cache: "no-store" });
  const data: any = res.ok ? await res.json() : { events: [] };
  return (
    <main>
      <h1>Games on ESPN's scoreboard</h1>
      <p>
        Scoreboard fetch from the Worker: HTTP {res.status}, cache-control "{res.headers.get("cache-control")}", {Date.now() - started} ms
      </p>
      <ul>
        {data.events.map((e: any) => (
          <li key={e.id}>
            {e.shortName} ({e.status.type.description}): <a href={`/game/${e.id}`}>watch live</a> or{" "}
            <a href={`/game/${e.id}?replay=1`}>replay as if live</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
