// PROTOTYPE index: three variants each of the dashboard and the live game page,
// switchable via ?variant= and the pink bar at the bottom. Mock data throughout.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Yogan Hockey look and feel (prototype)</h1>
      <p className="text-muted-foreground">Use ← and → or the pink bar to switch variants. All data is invented.</p>
      <a className="rounded-lg border p-4 hover:bg-muted" href="/prototype/dashboard">Dashboard: A, B, C</a>
      <a className="rounded-lg border p-4 hover:bg-muted" href="/prototype/game">Live game page: A, B, C</a>
    </main>
  );
}
