import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  initialFocusRef?: RefObject<HTMLElement | null>,
  restoreFallback?: () => HTMLElement | null,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = restoreTo ?? (document.activeElement as HTMLElement | null);
    const canRestoreFocus = (element: HTMLElement | null | undefined): element is HTMLElement =>
      Boolean(element?.isConnected && element !== document.body && element !== document.documentElement && element.matches(FOCUSABLE));

    const getFocusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          !el.hasAttribute("disabled") &&
          !el.closest("[inert]") &&
          el.getAttribute("aria-hidden") !== "true" &&
          (el.offsetParent !== null || el === document.activeElement || el.getClientRects().length > 0),
      );

    // Move focus into the container on open — defer one frame so the element
    // is painted and focusable (required for mobile sheets that animate in).
    const raf = window.requestAnimationFrame(() => {
      const focusables = getFocusables();
      const first = initialFocusRef?.current ?? focusables[0];
      first?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
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
      if (canRestoreFocus(target)) {
        target.focus();
      } else if (canRestoreFocus(previouslyFocused)) {
        previouslyFocused.focus();
      } else {
        // The trigger may be conditionally rendered while the dialog is open
        // (for example, a chat launcher). Give the owner one frame to restore
        // it before resolving the fallback ref.
        window.requestAnimationFrame(() => {
          const focusFallback = () => {
            const fallback = restoreFallback?.();
            if (!canRestoreFocus(fallback)) return false;
            fallback.focus();
            return true;
          };
          if (focusFallback()) return;
          const observer = new MutationObserver(() => {
            if (focusFallback()) observer.disconnect();
          });
          observer.observe(document.body, { childList: true, subtree: true });
          window.setTimeout(() => observer.disconnect(), 1500);
        });
      }
    };
  }, [active, containerRef, onEscape, restoreTo, initialFocusRef, restoreFallback]);
}
