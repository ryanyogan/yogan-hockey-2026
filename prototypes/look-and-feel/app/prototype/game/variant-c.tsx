"use client";

import { useState } from "react";
import { Rink } from "@/components/rink";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prediction } from "@/lib/mock";
import { useFakeStream } from "./use-fake-stream";

// C: Rink as the page. The rink fills the width with the score laid over it. Under it, a horizontal
// timeline of the game; clicking a tick highlights that play on the ice. Lists live in tabs below.
export function VariantC() {
  const { shown, latest, score, shots } = useFakeStream();
  const [picked, setPicked] = useState<number | null>(null);
  const focus = shown.find((p) => p.id === picked) ?? latest;
  const pos = (p: (typeof shown)[number]) => (((p.period - 1) * 20 + Number(p.time.slice(0, 2)) + Number(p.time.slice(3)) / 60) / 60) * 100;
  return (
    <div className="min-h-screen bg-slate-900 pb-24 text-slate-100">
      <div className="relative mx-auto max-w-6xl px-4 pt-4">
        <Rink plays={shown} highlight={focus.id} className="w-full text-sky-200" />
        <div className="pointer-events-none absolute inset-x-0 top-8 flex justify-between px-[14%] font-mono">
          <div><div className="text-sm text-slate-400">MTL · {shots.MTL} shots</div><div className="text-6xl font-bold">{score.MTL}</div></div>
          <div className="text-center text-xs text-red-400">● LIVE<div className="text-base text-slate-200">P{latest.period} {latest.time}</div></div>
          <div className="text-right"><div className="text-sm text-slate-400">TOR · {shots.TOR} shots</div><div className="text-6xl font-bold">{score.TOR}</div></div>
        </div>
        <div className="absolute inset-x-0 bottom-6 text-center"><span className="rounded-full bg-black/70 px-4 py-1.5 text-sm">{focus.type === "goal" && "GOAL · "}{focus.text} <span className="text-slate-400">P{focus.period} {focus.time}</span></span></div>
      </div>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="relative h-12 rounded-lg bg-slate-800">
          {[1, 2].map((x) => <div key={x} className="absolute inset-y-0 border-l border-slate-600" style={{ left: `${(x / 3) * 100}%` }} />)}
          {["1st", "2nd", "3rd"].map((l, i) => <span key={l} className="absolute top-0.5 pl-1 text-[10px] text-slate-500" style={{ left: `${(i / 3) * 100}%` }}>{l}</span>)}
          {shown.map((p) => (
            <button key={p.id} onClick={() => setPicked(p.id === picked ? null : p.id)} title={p.text} className={`absolute bottom-1 -translate-x-1/2 cursor-pointer rounded-sm ${p.type === "goal" ? "h-8 w-1.5 bg-red-500" : "h-4 w-1 bg-slate-400"} ${p.id === focus.id ? "ring-2 ring-white" : ""}`} style={{ left: `${pos(p)}%` }} />
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-500">Click a tick to see that play on the ice. {picked ? "Showing a picked play." : "Following live."}</p>
        <Tabs defaultValue="plays" className="mt-6">
          <TabsList><TabsTrigger value="plays">Plays</TabsTrigger><TabsTrigger value="scoring">Scoring</TabsTrigger><TabsTrigger value="pick">Claude's pick</TabsTrigger></TabsList>
          <TabsContent value="plays" className="grid gap-x-8 font-mono text-xs md:grid-cols-2">{[...shown].reverse().map((p) => <button key={p.id} onClick={() => setPicked(p.id)} className="flex cursor-pointer gap-3 border-b border-slate-800 py-1.5 text-left hover:bg-slate-800"><span className="text-slate-500">P{p.period} {p.time}</span><span className="w-8">{p.team}</span><span className={p.type === "goal" ? "font-bold text-red-400" : ""}>{p.text}</span></button>)}</TabsContent>
          <TabsContent value="scoring" className="space-y-2 text-sm">{shown.filter((p) => p.type === "goal").map((p) => <div key={p.id}>P{p.period} {p.time} · {p.text} <span className="text-slate-500">({p.score})</span></div>)}</TabsContent>
          <TabsContent value="pick" className="max-w-prose text-sm"><b>{prediction.pick}.</b> {prediction.reason}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
