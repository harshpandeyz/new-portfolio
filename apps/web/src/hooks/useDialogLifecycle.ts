import type { RefObject } from "react";

import { useFocusTrap } from "./useFocusTrap";
import { useScrollLock } from "./useScrollLock";

/** Shared focus, Escape, restoration, and scroll-lock behavior for all dialogs. */
export function useDialogLifecycle(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onClose: () => void,
  restoreTo?: HTMLElement | null,
  initialFocusRef?: RefObject<HTMLElement | null>,
  restoreFallback?: () => HTMLElement | null,
) {
  useFocusTrap(containerRef, active, onClose, restoreTo, initialFocusRef, restoreFallback);
  useScrollLock(active);
}
