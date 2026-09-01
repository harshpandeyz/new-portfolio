import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus inside the given container while `active` is true and
 * calls `onEscape` when the user presses Escape. Restores focus to a saved
 * element on cleanup (pass the trigger element as `restoreTo`).
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
  restoreTo?: HTMLElement | null,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = restoreTo ?? (document.activeElement as HTMLElement | null);

    const getFocusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          el.getAttribute("aria-hidden") !== "true" &&
          (el.offsetParent !== null || el === document.activeElement || el.getClientRects().length > 0),
      );

    // Move focus into the container on open — defer one frame so the element
    // is painted and focusable (required for mobile sheets that animate in).
    const raf = window.requestAnimationFrame(() => {
      const focusables = getFocusables();
      const first = focusables[0];
      first?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscape?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl?.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      // Restore focus to the trigger if it is still connected; otherwise
      // fall back to the previously focused element if still in the DOM.
      const target = restoreTo ?? previouslyFocused;
      if (target && target.isConnected) {
        target.focus();
      } else if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, onEscape, restoreTo]);
}
