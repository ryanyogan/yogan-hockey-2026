import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { favorites, games, logo, standings, tracked } from "@/lib/mock";

// B: Family first. Light, editorial, roomy. The two Tracked Players are the hero; the NHL is a rail beneath.
export function VariantB() {
  return (
    <div className="min-h-screen bg-stone-50 pb-24 text-stone-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-xl font-semibold tracking-tight">Yogan Hockey</div>
        <nav className="flex gap-6 text-sm text-stone-500"><span className="text-stone-900">Home</span><span>NHL</span><span>Players</span><span>Family</span></nav>
      </header>
      <main className="mx-auto max-w-5xl space-y-12 px-6">
        <section className="grid gap-6 md:grid-cols-2">
          {tracked.map((p) => (
            <article key={p.slug} className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-stone-200">
              <div className="text-sm text-stone-500">{p.team} · {p.league}</div>
              <h2 className="mt-1 text-4xl font-semibold tracking-tight">{p.name}</h2>
              {p.today ? (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-emerald-900"><div className="text-xs font-medium uppercase tracking-wide">Game day</div><div className="text-lg font-medium">{p.today.label} {p.today.line}</div></div>
              ) : (
                <div className="mt-6 rounded-2xl bg-stone-100 p-4"><div className="text-xs font-medium uppercase tracking-wide text-stone-500">Latest</div><div className="text-lg font-medium">{p.last}</div></div>
              )}
              {p.season ? (
                <div className="mt-6 grid grid-cols-4 gap-2 text-center">{Object.entries(p.season).map(([k, v]) => <div key={k}><div className="text-3xl font-semibold tabular-nums">{v}</div><div className="text-xs text-stone-500">{k}</div></div>)}</div>
              ) : (
                <p className="mt-6 text-sm text-stone-500">Schedule and results only; his league does not publish player stats.</p>
              )}
              <div className="mt-6 text-sm font-medium underline underline-offset-4">Full season →</div>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-4 flex items-baseline justify-between"><h3 className="text-2xl font-semibold tracking-tight">Tonight in the NHL</h3><span className="text-sm text-stone-500">2 live · 6 games</span></div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {games.map((g) => (
              <a key={g.id} href="/prototype/game?variant=B" className="w-44 shrink-0 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 hover:ring-stone-400">
                <div className="mb-3 h-5">{g.state === "live" ? <Badge variant="destructive">Live · {g.period} {g.clock}</Badge> : <span className="text-xs text-stone-500">{g.state === "pre" ? g.start : "Final"}</span>}</div>
                {[[g.away, g.awayScore] as const, [g.home, g.homeScore] as const].map(([team, s]) => (
                  <div key={team.abbr} className="flex items-center gap-2 py-0.5"><img src={logo(team.abbr)} alt="" className="size-6" /><span className="flex-1 font-medium">{team.abbr}</span>{g.state !== "pre" && <span className="text-lg font-semibold tabular-nums">{s}</span>}</div>
                ))}
                {g.pick && <div className="mt-2 text-xs text-stone-500">Pick: {g.pick}</div>}
              </a>
            ))}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Your favorites</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {favorites.map((f) => (
                <div key={f.name} className="flex items-center gap-3"><img src={logo(f.team)} alt="" className="size-8" /><div className="flex-1"><div className="font-medium">{f.name}</div><div className="text-xs text-stone-500">{f.line}</div></div>{f.live && <Badge variant="outline">Playing now</Badge>}</div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Standings</CardTitle></CardHeader>
            <CardContent>
              {standings.slice(0, 6).map(([abbr, w, l, o, pts], i) => (
                <div key={abbr} className="flex items-center gap-3 border-b border-stone-100 py-1.5 text-sm last:border-0"><span className="w-4 text-stone-400">{i + 1}</span><img src={logo(abbr)} alt="" className="size-5" /><span className="flex-1 font-medium">{abbr}</span><span className="tabular-nums text-stone-500">{w}-{l}-{o}</span><span className="w-6 text-right font-semibold tabular-nums">{pts}</span></div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
