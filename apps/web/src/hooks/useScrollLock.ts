import { useEffect, useState } from "react";

/**
 * Locks body scroll while `active` is true. Used by modals, mobile menus and
 * overlays so page content cannot scroll behind a focused surface.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [active]);
}
