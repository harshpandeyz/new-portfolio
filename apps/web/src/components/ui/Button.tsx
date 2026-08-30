import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
  href?: string;
  target?: string;
  rel?: string;
  download?: string | boolean;
}

function classNameFor(variant: ButtonVariant, size: ButtonSize, extra?: string) {
  const sizeClass = size === "lg" ? "btn-lg" : size === "sm" ? "btn-sm" : "";
  const variantClass =
    variant === "primary" ? "btn-solid" :
    variant === "ghost" ? "btn-ghost" :
    variant === "danger" ? "btn-danger" : "";
  return `btn ${sizeClass} ${variantClass} ${extra ?? ""}`.trim();
}

/** Single button hierarchy across the whole site. Use <Button as> links via href. */
export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  href,
  target,
  rel,
  download,
  ...rest
}: ButtonProps) {
  const cls = classNameFor(variant, size, className);
  if (href) {
    return (
      <a href={href} target={target} rel={rel} download={download} className={cls}>
        {children}
      </a>
    );
  }
  return <button type="button" className={cls} {...rest}>{children}</button>;
}