let lockCount = 0;

function applyLock() {
  if (lockCount === 0) document.body.classList.add("no-scroll");
  lockCount += 1;
}

function releaseLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.classList.remove("no-scroll");
}

import { useEffect } from "react";

/**
 * Locks body scroll while `active` is true. Reference-counted so multiple
 * overlays (menu + dialog + chat + palette) do not fight each other — the
 * body only unlocks when the last locker releases.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    applyLock();
    return () => releaseLock();
  }, [active]);
}

// Imperative helpers for components that manage lock without the hook lifecycle
export function lockScroll() {
  applyLock();
}

export function unlockScroll() {
  releaseLock();
}
