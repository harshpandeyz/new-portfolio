import type { ReactNode } from "react";

/** Consistent empty state for async sections. */
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="empty-state" role="status">
      {children}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  label = "Try again",
}: { message: string; onRetry: () => void; label?: string }) {
  return (
    <EmptyState>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center" }}>
        <span>{message}</span>
        <button className="btn btn-sm btn-ghost" onClick={onRetry}>{label}</button>
      </div>
    </EmptyState>
  );
}