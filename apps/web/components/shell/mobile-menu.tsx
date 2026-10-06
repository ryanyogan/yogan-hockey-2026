"use client";

import { Dialog } from "@base-ui/react/dialog";
import { buttonVariants } from "@yogan-hockey/ui/components/button";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { NavLinks } from "./nav-links";

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

  return (
    <Dialog.Root
      modal={false}
      open={open}
      onOpenChange={(next) => setOpenedAt(next ? location : null)}
    >
      <Dialog.Trigger
        className={buttonVariants({ variant: "ghost", size: "inline" })}
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? "close" : "menu"}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 top-11 z-20 bg-black/40 md:hidden" />
        <Dialog.Popup
          aria-label="Menu"
          className="fixed inset-x-0 top-11 z-20 border-rule border-b bg-background p-2 md:hidden"
        >
          <nav aria-label="Site" className="flex flex-col">
            {/* Following the link to the page already shown is no navigation, so it closes here. */}
            <NavLinks size="touch" onNavigate={() => setOpenedAt(null)} />
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
