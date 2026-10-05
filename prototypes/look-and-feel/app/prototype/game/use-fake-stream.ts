"use client";

import { useEffect, useState } from "react";
import { plays } from "@/lib/mock";

// PROTOTYPE stand-in for the Game Stream: starts mid-game, adds a play every 3.5s, then loops.
export function useFakeStream() {
  const [n, setN] = useState(7);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= plays.length ? 7 : v + 1)), 3500);
    return () => clearInterval(id);
  }, []);
  const shown = plays.slice(0, n);
  const latest = shown[shown.length - 1];
  const score = { TOR: shown.filter((p) => p.type === "goal" && p.team === "TOR").length, MTL: shown.filter((p) => p.type === "goal" && p.team === "MTL").length };
  const shots = { TOR: shown.filter((p) => p.team === "TOR" && ["goal", "shot", "save"].includes(p.type)).length, MTL: shown.filter((p) => p.team === "MTL" && ["goal", "shot", "save"].includes(p.type)).length };
  return { shown, latest, score, shots };
}
