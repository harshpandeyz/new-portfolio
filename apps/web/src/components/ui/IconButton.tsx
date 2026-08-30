import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  variant?: "default" | "solid";
}

/** Compact icon-only control with a required accessible label. */
export function IconButton({
  label,
  children,
  variant = "default",
  className = "",
  ...rest
}: IconButtonProps) {
  const variantClass = variant === "solid" ? " icon-btn-solid" : "";
  return (
    <button
      className={`icon-btn${variantClass} ${className}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      {children}
    </button>
  );
}