"use client";

import { playColor, Rink } from "@/components/rink";
import { logo, prediction } from "@/lib/mock";
import { useFakeStream } from "./use-fake-stream";

// A: Broadcast split. Dark. Big scoreboard on top, rink on the left, play-by-play on the right.
export function VariantA() {
  const { shown, latest, score, shots } = useFakeStream();
  return (
    <div className="dark min-h-screen bg-zinc-950 pb-24 text-zinc-100">
      <header className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 px-6 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-10">
          {(["TOR", "MTL"] as const).map((abbr, i) => (
            <div key={abbr} className={`flex items-center gap-5 ${i ? "flex-row-reverse" : ""}`}>
              <img src={logo(abbr)} alt="" className="size-20" />
              <div className={i ? "text-left" : "text-right"}><div className="text-sm text-zinc-400">{abbr === "TOR" ? "Maple Leafs" : "Canadiens"}</div><div className="text-xs text-zinc-600">{shots[abbr]} shots</div></div>
              <div className="font-mono text-7xl font-bold tabular-nums">{score[abbr]}</div>
            </div>
          )).flatMap((el, i) => i === 0 ? [el, <div key="mid" className="text-center"><div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-red-400"><span className="size-1.5 animate-pulse rounded-full bg-red-500" />Live</div><div className="font-mono text-2xl">{latest.time}</div><div className="text-xs text-zinc-500">Period {latest.period}</div></div>] : [el])}
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[3fr_2fr]">
        <section>
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-4"><Rink plays={shown} highlight={latest.id} className="w-full" /></div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">{Object.entries(playColor).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className="size-2 rounded-full" style={{ background: c }} />{k}</span>)}</div>
          <div className="mt-6 rounded-xl border border-sky-500/20 bg-sky-950/30 p-4 text-sm"><div className="text-xs uppercase tracking-widest text-sky-400">Claude's pre-game pick · {prediction.pick}</div><p className="mt-1 text-zinc-300">{prediction.reason}</p></div>
        </section>
        <section className="rounded-xl border border-white/10 bg-zinc-900">
          <div className="border-b border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-zinc-500">Play-by-play</div>
          <ol className="max-h-[70vh] divide-y divide-white/5 overflow-y-auto">
            {[...shown].reverse().map((p, i) => (
              <li key={p.id} className={`flex gap-3 px-4 py-2.5 text-sm ${i === 0 ? "bg-white/5" : ""} ${p.type === "goal" ? "border-l-2 border-red-500" : ""}`}>
                <span className="w-14 shrink-0 font-mono text-xs text-zinc-500">P{p.period} {p.time}</span>
                <img src={logo(p.team)} alt="" className="size-5" />
                <div><div className={p.type === "goal" ? "font-semibold" : ""}>{p.type === "goal" && "GOAL · "}{p.text}</div>{p.score && <div className="text-xs text-zinc-500">{p.score}</div>}</div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
