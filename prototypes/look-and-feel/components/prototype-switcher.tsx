"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// PROTOTYPE: floating variant switcher. Not part of any design.
export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: { key: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const i = Math.max(0, variants.findIndex((v) => v.key === current));
  const go = (d: number) => {
    const next = variants[(i + d + variants.length) % variants.length];
    router.replace(`${pathname}?variant=${next.key}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const other = pathname.includes("dashboard") ? "game" : "dashboard";

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full bg-fuchsia-600 px-2 py-1.5 font-mono text-xs text-white shadow-2xl ring-2 ring-white">
      <button onClick={() => go(-1)} className="cursor-pointer rounded-full px-2 py-1 hover:bg-white/20">←</button>
      <span className="min-w-44 text-center">
        {variants[i].key} ({variants[i].name})
      </span>
      <button onClick={() => go(1)} className="cursor-pointer rounded-full px-2 py-1 hover:bg-white/20">→</button>
      <a href={`/prototype/${other}`} className="ml-1 rounded-full bg-white/20 px-2 py-1 hover:bg-white/30">
        {other} ↗
      </a>
    </div>
  );
}
