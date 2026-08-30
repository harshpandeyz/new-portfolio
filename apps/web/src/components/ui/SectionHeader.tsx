import type { ReactNode } from "react";

export interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  inline?: boolean;
  id?: string;
}

/** Consistent section heading: eyebrow + title + optional subtitle. */
export function SectionHeader({ eyebrow, title, sub, inline = false }: SectionHeaderProps) {
  return (
    <div className={`section-head${inline ? " section-head-inline" : ""}`} data-reveal>
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="section-title">{title}</h2>
      </div>
      {sub && <p className="section-sub">{sub}</p>}
    </div>
  );
}