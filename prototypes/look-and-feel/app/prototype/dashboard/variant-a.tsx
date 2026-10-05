import { favorites, games, logo, standings, tracked, type Game } from "@/lib/mock";

// A: Scoreboard wall. Dark, broadcast-style. Live games are the page; everything else is a rail.
function Tile({ g }: { g: Game }) {
  const live = g.state === "live";
  return (
    <a href="/prototype/game?variant=A" className={`block rounded-xl border p-4 transition hover:border-white/40 ${live ? "border-red-500/50 bg-gradient-to-br from-red-950/40 to-zinc-900" : "border-white/10 bg-zinc-900"} ${live ? "md:col-span-3" : "md:col-span-2"}`}>
      <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-widest text-zinc-400">
        {live ? <span className="flex items-center gap-1.5 text-red-400"><span className="size-1.5 animate-pulse rounded-full bg-red-500" />Live · {g.period} {g.clock}</span> : <span>{g.state === "pre" ? g.start : `Final${g.period ? ` / ${g.period}` : ""}`}</span>}
        {g.favorite && <span className="text-amber-400">★ favorite</span>}
      </div>
      {[["away", g.away, g.awayScore] as const, ["home", g.home, g.homeScore] as const].map(([k, team, score]) => (
        <div key={k} className="flex items-center gap-3 py-1">
          <img src={logo(team.abbr)} alt="" className={live ? "size-10" : "size-7"} />
          <div className="flex-1">
            <div className={`font-semibold ${live ? "text-xl" : ""}`}>{live ? team.name : team.abbr}</div>
            <div className="text-xs text-zinc-500">{team.record}</div>
          </div>
          {g.state !== "pre" && <div className={`font-mono font-bold tabular-nums ${live ? "text-4xl" : "text-xl"}`}>{score}</div>}
        </div>
      ))}
      {g.pick && <div className="mt-2 border-t border-white/10 pt-2 text-xs text-sky-300">Claude's pick: {g.pick}</div>}
    </a>
  );
}

export function VariantA() {
  return (
    <div className="dark min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="font-mono text-sm font-bold tracking-tighter"><span className="text-red-500">YOGAN</span>HOCKEY</div>
        <nav className="flex gap-5 text-sm text-zinc-400"><span>Scores</span><span>Standings</span><span>Teams</span><span>Players</span><span>Family</span></nav>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_320px]">
        <main>
          <h2 className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Tonight · 2 live · 6 games</h2>
          <div className="grid gap-3 md:grid-cols-6">{games.map((g) => <Tile key={g.id} g={g} />)}</div>
        </main>
        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Family</h2>
            <div className="space-y-2">
              {tracked.map((p) => (
                <div key={p.slug} className="rounded-xl border border-white/10 bg-zinc-900 p-3">
                  <div className="flex items-baseline justify-between"><span className="font-semibold">{p.name}</span><span className="text-[11px] text-zinc-500">{p.league}</span></div>
                  <div className="text-xs text-zinc-400">{p.team}</div>
                  {p.today ? <div className="mt-2 rounded bg-red-500/15 px-2 py-1 text-xs text-red-300">{p.today.label} {p.today.line}</div> : <div className="mt-2 text-xs text-zinc-400">{p.last}</div>}
                  {p.season && <div className="mt-2 flex gap-3 font-mono text-xs">{Object.entries(p.season).map(([k, v]) => <span key={k}><b className="text-base">{v}</b> {k}</span>)}</div>}
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Your favorites</h2>
            <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-zinc-900">
              {favorites.map((f) => (
                <div key={f.name} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <img src={logo(f.team)} alt="" className="size-5" />
                  <span className="flex-1">{f.name}</span>
                  {f.live && <span className="text-[10px] uppercase text-red-400">live now</span>}
                  <span className="font-mono text-xs text-zinc-500">{f.line.split(" · ").slice(1).join(" ")}</span>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-xs uppercase tracking-widest text-zinc-500">Standings</h2>
            <table className="w-full rounded-xl font-mono text-xs">
              <tbody>{standings.map(([abbr, w, l, o, pts], i) => (
                <tr key={abbr} className="border-b border-white/5"><td className="py-1 text-zinc-600">{i + 1}</td><td className="font-sans font-medium">{abbr}</td><td className="text-right text-zinc-400">{w}-{l}-{o}</td><td className="text-right font-bold">{pts}</td></tr>
              ))}</tbody>
            </table>
          </section>
        </aside>
      </div>
    </div>
  );
}
