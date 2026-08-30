import type { ReactNode } from "react";

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
  children?: ReactNode;
}

/**
 * Skeleton loading placeholder using design tokens.
 * Uses CSS-driven animation from the design system.
 */
export function Skeleton({
  className = "",
  style,
  variant = "rectangular",
  width,
  height,
}: SkeletonProps) {
  const variantClass =
    variant === "text" ? "skeleton-head" :
    variant === "circular" ? "skeleton-circle" : "";

  return (
    <div
      className={`skeleton ${variantClass} ${className}`.trim()}
      style={{
        ...style,
        width: width ?? (variant === "text" ? "240px" : "100%"),
        height: height ?? (variant === "text" ? "32px" : variant === "circular" ? "40px" : "120px"),
        borderRadius: variant === "circular" ? "50%" : "var(--radius-md)",
      }}
      aria-hidden="true"
    />
  );
}

export function SkeletonGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`skeleton-group ${className}`}>{children}</div>;
}