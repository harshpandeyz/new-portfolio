import type { ReactNode } from "react";
import { TechGlyph } from "../../tech/TechIcons";
import { Reveal } from "../visuals";

export function TechStrip({ stack }: { stack: string[] }) {
  return (
    <div className="cs-secgrid" aria-label="Technology">
      {stack.map((t) => <span key={t} className="cs-secbadge"><TechGlyph name={t} />{t}</span>)}
    </div>
  );
}

export function Split({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="cs-split"><Reveal className="cs-prose">{left}</Reveal><Reveal delay={0.08}>{right}</Reveal></div>;
}
