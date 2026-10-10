/**
 * "vs" before an opponent met at home, "@" before one visited. Both take two columns of type, so
 * the opponents line up down a schedule.
 */
export function Versus({ home }: { home: boolean }) {
  return (
    <span className="inline-block w-[2ch] text-muted-foreground">
      {home ? (
        "vs"
      ) : (
        <>
          <span aria-hidden="true">@</span>
          <span className="sr-only">at</span>
        </>
      )}
    </span>
  );
}
