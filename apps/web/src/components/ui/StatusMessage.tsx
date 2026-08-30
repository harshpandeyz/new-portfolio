import type { ReactNode } from "react";

export type StatusKind = "info" | "ok" | "err";

/** Accessible inline status message (form success/error, notices). */
export function StatusMessage({ kind, children }: { kind: StatusKind; children: ReactNode }) {
  return (
    <div className={`form-status ${kind}`} role="status">
      {children}
    </div>
  );
}