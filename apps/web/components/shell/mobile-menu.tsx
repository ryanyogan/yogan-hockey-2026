"use client";

import { buttonVariants } from "@yogan-hockey/ui/components/button";
import { usePathname, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { NavLinks } from "./nav-links";

/**
 * The open menu: the browser's own `<dialog>`, shown without making the rest of the page inert
 * (`show()`, not `showModal()`), so the top bar above it still works. Showing it moves focus to
 * its first link, and closing it while focus is inside hands focus back to the button; both are
 * the browser's doing. It is drawn at the end of `<body>`, under the top bar's layer. Escape, and
 * a press anywhere outside it and its button, ask for it to be closed.
 */
function Panel({
  trigger,
  onClose,
  children,
}: {
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  // A layout effect, because its cleanup runs while the dialog is still in the document, which is
  // when the browser can hand focus back.
  useLayoutEffect(() => {
    const shown = dialog.current;
    shown?.show();
    return () => shown?.close();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onClick = (event: MouseEvent) => {
      const pressed = event.target instanceof Node ? event.target : null;
      if (dialog.current?.contains(pressed) || trigger.current?.contains(pressed)) return;
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [trigger, onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 top-(--top-bar) z-20 bg-black/40 md:hidden" />
      {/* `w-full` and `text-foreground` undo the width and colour a browser gives a dialog. */}
      <dialog
        ref={dialog}
        aria-label="Menu"
        className="fixed inset-x-0 top-(--top-bar) z-20 w-full border-rule border-b bg-background p-2 pr-[calc(0.5rem+var(--safe-right))] pl-[calc(0.5rem+var(--safe-left))] text-foreground md:hidden"
      >
        {children}
      </dialog>
    </>,
    document.body,
  );
}

/**
 * The navigation below the `md` breakpoint: a button in the top bar that drops a panel of links
 * from under the bar. It closes on any navigation (a link, or the browser's back button), on
 * Escape and on a tap outside.
 */
function Menu() {
  const location = `${usePathname()}?${useSearchParams()}`;
  // The menu is open only at the address it was opened on, so any navigation closes it.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === location;
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpenedAt(null), []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={buttonVariants({ variant: "ghost", size: "touch" })}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpenedAt(open ? null : location)}
      >
        {open ? "close" : "menu"}
      </button>
      {open && (
        <Panel trigger={trigger} onClose={close}>
          <nav aria-label="Site" className="flex flex-col">
            {/* Following the link to the page already shown is no navigation, so it closes here. */}
            <NavLinks size="touch" onNavigate={close} />
          </nav>
        </Panel>
      )}
    </>
  );
}

export function MobileMenu() {
  return (
    // Reading the query string suspends during a static render.
    <Suspense>
      <Menu />
    </Suspense>
  );
}
