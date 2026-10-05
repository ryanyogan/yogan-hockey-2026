import type { Play } from "@/lib/mock";

const color: Record<Play["type"], string> = {
  goal: "#ef4444", shot: "#94a3b8", save: "#38bdf8", penalty: "#f59e0b", hit: "#a78bfa", faceoff: "#64748b",
};

// PROTOTYPE rink. viewBox is in feet: 200 x 85.
export function Rink({ plays, highlight, className }: { plays: Play[]; highlight?: number; className?: string }) {
  return (
    <svg viewBox="-102 -44.5 204 89" className={className} role="img" aria-label="Rink with event locations">
      <rect x={-100} y={-42.5} width={200} height={85} rx={28} fill="currentColor" fillOpacity={0.04} stroke="currentColor" strokeOpacity={0.35} />
      <line x1={0} y1={-42.5} x2={0} y2={42.5} stroke="#ef4444" strokeOpacity={0.6} />
      {[-25, 25].map((x) => <line key={x} x1={x} y1={-42.5} x2={x} y2={42.5} stroke="#3b82f6" strokeOpacity={0.6} strokeWidth={1.2} />)}
      {[-89, 89].map((x) => <line key={x} x1={x} y1={-37} x2={x} y2={37} stroke="#ef4444" strokeOpacity={0.4} strokeWidth={0.5} />)}
      <circle r={15} fill="none" stroke="#3b82f6" strokeOpacity={0.4} />
      {[-69, 69].flatMap((x) => [-22, 22].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={15} fill="none" stroke="#ef4444" strokeOpacity={0.3} />))}
      {plays.map((p) => (
        <circle key={p.id} cx={p.x} cy={p.y} r={p.id === highlight ? 5 : p.type === "goal" ? 3.2 : 2} fill={color[p.type]} stroke={p.id === highlight ? "white" : "none"} strokeWidth={1}>
          <title>{`P${p.period} ${p.time} ${p.text}`}</title>
        </circle>
      ))}
    </svg>
  );
}
export const playColor = color;
