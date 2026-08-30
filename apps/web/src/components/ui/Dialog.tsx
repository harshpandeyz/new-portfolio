import { useEffect, useRef, type ReactNode } from "react";

import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  labelledByLabel?: string;
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "full";
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Accessible modal foundation used by the resume viewer and credential viewer.
 *
 * - role="dialog" + aria-modal + accessible name
 * - focus trap (Tab cycles, Escape closes)
 * - body scroll lock while open
 * - click-outside to close
 * - focus restored to the opener on close
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  labelledByLabel,
  children,
  className = "",
  size = "md",
  initialFocusRef,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusables[0]?.focus();
  }, [open, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
      aria-hidden="true"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className={`dialog-panel dialog-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : labelledByLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}