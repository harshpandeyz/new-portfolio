import { useEffect } from "react";

let lockCount = 0;

function applyLock() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) document.body.classList.add("no-scroll");
  lockCount += 1;
}

function releaseLock() {
  if (typeof document === "undefined") {
    lockCount = 0;
    return;
  }
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.classList.remove("no-scroll");
}

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
