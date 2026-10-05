import { favorites, games, standings, tracked } from "@/lib/mock";

// C: Tonight ledger. Left sidebar, monospace, one dense table per subject. No cards, no logos.
const Th = ({ children, r }: { children?: React.ReactNode; r?: boolean }) => <th className={`border-b border-current/20 px-2 py-1 text-[10px] font-normal uppercase tracking-wider opacity-50 ${r ? "text-right" : "text-left"}`}>{children}</th>;

export function VariantC() {
  return (
    <div className="flex min-h-screen bg-[#fbfaf7] pb-24 font-mono text-[13px] text-neutral-900">
      <aside className="sticky top-0 hidden h-screen w-48 shrink-0 flex-col gap-1 border-r border-neutral-300 p-4 md:flex">
        <div className="mb-4 text-sm font-bold">YOGAN/HOCKEY</div>
        {["tonight", "standings", "teams", "players", "family/andrew", "family/rylan"].map((l, i) => <span key={l} className={i === 0 ? "bg-neutral-900 px-2 py-0.5 text-white" : "px-2 py-0.5 opacity-60"}>{l}</span>)}
        <div className="mt-auto text-[10px] opacity-40">updated 20:14:07</div>
      </aside>
      <main className="flex-1 space-y-8 p-6">
        <section>
          <h2 className="mb-1 font-bold">TONIGHT <span className="font-normal opacity-50">6 games, 2 live</span></h2>
          <table className="w-full border-collapse">
            <thead><tr><Th>status</Th><Th>away</Th><Th r /><Th>home</Th><Th r /><Th>note</Th></tr></thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.id} className={`border-b border-neutral-200 hover:bg-yellow-100 ${g.state === "live" ? "bg-red-50" : ""}`}>
                  <td className="px-2 py-1.5">{g.state === "live" ? <a href="/prototype/game?variant=C" className="font-bold text-red-600 underline">● {g.period} {g.clock}</a> : g.state === "pre" ? g.start : `final${g.period ? `/${g.period}` : ""}`}</td>
                  <td className="px-2">{g.away.abbr} <span className="opacity-40">{g.away.record}</span></td>
                  <td className="px-2 text-right text-base font-bold tabular-nums">{g.state === "pre" ? "" : g.awayScore}</td>
                  <td className="px-2">{g.home.abbr} <span className="opacity-40">{g.home.record}</span></td>
                  <td className="px-2 text-right text-base font-bold tabular-nums">{g.state === "pre" ? "" : g.homeScore}</td>
                  <td className="px-2 opacity-70">{g.pick ? `claude: ${g.pick}` : g.favorite ? "★ favorite team" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="grid gap-8 xl:grid-cols-2">
          <section>
            <h2 className="mb-1 font-bold">FAMILY</h2>
            <table className="w-full border-collapse">
              <thead><tr><Th>player</Th><Th>team</Th><Th r>gp</Th><Th r>g</Th><Th r>a</Th><Th r>pts</Th></tr></thead>
              <tbody>
                {tracked.map((p) => (
                  <tr key={p.slug} className="border-b border-neutral-200 align-top">
                    <td className="px-2 py-1.5 font-bold underline">{p.name}</td>
                    <td className="px-2 py-1.5">{p.team}<div className="opacity-60">{p.today ? `${p.today.label} ${p.today.line}` : p.last}</div></td>
                    {["GP", "G", "A", "PTS"].map((k) => <td key={k} className="px-2 py-1.5 text-right tabular-nums">{p.season?.[k] ?? "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-1 font-bold">FAVORITES</h2>
            <table className="w-full border-collapse">
              <thead><tr><Th>player</Th><Th>team</Th><Th>season</Th><Th /></tr></thead>
              <tbody>{favorites.map((f) => <tr key={f.name} className="border-b border-neutral-200"><td className="px-2 py-1.5">{f.name}</td><td className="px-2">{f.team}</td><td className="px-2 opacity-70">{f.line}</td><td className="px-2 text-red-600">{f.live ? "● live" : ""}</td></tr>)}</tbody>
            </table>
          </section>
          <section>
            <h2 className="mb-1 font-bold">STANDINGS <span className="font-normal opacity-50">league</span></h2>
            <table className="w-full border-collapse">
              <thead><tr><Th>#</Th><Th>team</Th><Th r>w</Th><Th r>l</Th><Th r>otl</Th><Th r>pts</Th></tr></thead>
              <tbody>{standings.map(([abbr, w, l, o, pts], i) => <tr key={abbr} className="border-b border-neutral-200"><td className="px-2 py-1 opacity-40">{i + 1}</td><td className="px-2">{abbr}</td><td className="px-2 text-right">{w}</td><td className="px-2 text-right">{l}</td><td className="px-2 text-right">{o}</td><td className="px-2 text-right font-bold">{pts}</td></tr>)}</tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
}
