"use client";

import { Rink } from "@/components/rink";
import { logo, prediction } from "@/lib/mock";
import { useFakeStream } from "./use-fake-stream";

// B: Feed first. Light, phone-shaped single column. Sticky slim score bar; the stream reads like a
// message thread, goals are big cards with their own mini rink, routine plays are one-liners.
export function VariantB() {
  const { shown, latest, score } = useFakeStream();
  return (
    <div className="min-h-screen bg-stone-100 pb-24 text-stone-900">
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
          <img src={logo("TOR")} alt="" className="size-7" /><span className="text-2xl font-semibold tabular-nums">{score.TOR}</span>
          <div className="flex-1 text-center text-xs"><span className="rounded-full bg-red-600 px-2 py-0.5 font-medium text-white">LIVE</span><div className="mt-0.5 text-stone-500">P{latest.period} · {latest.time}</div></div>
          <span className="text-2xl font-semibold tabular-nums">{score.MTL}</span><img src={logo("MTL")} alt="" className="size-7" />
        </div>
      </div>
      <main className="mx-auto max-w-xl space-y-2 px-4 py-6">
        {[...shown].reverse().map((p, i) =>
          p.type === "goal" ? (
            <article key={p.id} className="my-4 overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-stone-200">
              <div className="flex items-center gap-3 bg-red-600 px-5 py-3 text-white"><img src={logo(p.team)} alt="" className="size-9 rounded-full bg-white p-1" /><div><div className="text-xs font-medium uppercase tracking-wide opacity-80">Goal · P{p.period} {p.time}</div><div className="text-lg font-semibold leading-tight">{p.text}</div></div></div>
              <div className="flex items-center gap-4 px-5 py-3"><Rink plays={[p]} highlight={p.id} className="w-40 text-stone-500" /><div className="text-sm text-stone-600">{p.score}</div></div>
            </article>
          ) : (
            <div key={p.id} className={`flex items-center gap-3 rounded-2xl px-4 py-2 text-sm ${i === 0 ? "bg-white shadow-sm ring-1 ring-stone-200" : ""} ${p.team === "MTL" ? "flex-row-reverse text-right" : ""}`}>
              <img src={logo(p.team)} alt="" className="size-5" />
              <div className="flex-1">{p.text}</div>
              <span className="text-xs tabular-nums text-stone-400">{p.time}</span>
            </div>
          ),
        )}
        <div className="pt-6 text-center text-xs text-stone-400">Puck drop</div>
        <article className="rounded-3xl bg-sky-50 p-5 text-sm ring-1 ring-sky-200"><div className="text-xs font-medium uppercase tracking-wide text-sky-700">Before the game · Claude picked {prediction.pick}</div><p className="mt-1 text-stone-700">{prediction.reason}</p></article>
      </main>
    </div>
  );
}
