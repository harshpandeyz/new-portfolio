import type { ReactNode } from "react";

export type BadgeVariant = "default" | "accent" | "success" | "warning" | "info" | "muted";

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

/** Semantic badge component using design tokens. */
export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClass =
    variant === "accent" ? "tag-accent" :
    variant === "success" ? "tag-success" :
    variant === "warning" ? "tag-warning" :
    variant === "info" ? "tag-info" :
    variant === "muted" ? "tag-muted" : "";

  return (
    <span className={`tag ${variantClass} ${className}`.trim()}>
      {children}
    </span>
  );
}