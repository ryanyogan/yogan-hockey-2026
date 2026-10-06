"use client";

import { Dialog } from "@base-ui/react/dialog";
import { buttonVariants } from "@yogan-hockey/ui/components/button";
import { Suspense, useState } from "react";
import { NavLinks } from "./nav-links";

/**
 * The navigation below the `md` breakpoint: a button in the top bar that drops a panel of links
 * from under the bar. Following a link closes it, as do Escape and a tap outside.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
            <Suspense>
              <NavLinks size="touch" onNavigate={() => setOpen(false)} />
            </Suspense>
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
