import { useRef, type ReactNode } from "react";

import { useDialogLifecycle } from "../../hooks/useDialogLifecycle";

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

  useDialogLifecycle(panelRef, open, onClose, undefined, initialFocusRef);

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
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
