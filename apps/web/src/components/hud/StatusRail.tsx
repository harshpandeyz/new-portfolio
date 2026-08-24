import { useEffect, useRef, useState } from "react";

interface StatusRailProps {
  progress: number; // 0..1
  sectionIndex: number;
  sectionCount: number;
  stats: { projects: number; certificates: number } | null;
}

export function StatusRail({ progress, sectionIndex, sectionCount, stats }: StatusRailProps) {
  return (
    <>
      <div className="status-rail" aria-hidden="true">
        <span className="rail-count">
          SYS <b>{String(sectionIndex + 1).padStart(2, "0")}</b>/{String(sectionCount).padStart(2, "0")}
        </span>
        <div className="rail-track">
          <div className="rail-thumb" style={{ top: `${progress * 100}%`, height: "18%" }} />
        </div>
        <span className="rail-count">
          {stats ? (
            <>
              PRJ <b>{String(stats.projects).padStart(2, "0")}</b> · CRT <b>{String(stats.certificates).padStart(2, "0")}</b>
            </>
          ) : (
            "SYNC…"
          )}
        </span>
      </div>
      <div className="status-strip" aria-hidden="true">
        <span>
          <span className="live-dot" />
          SYSTEM ONLINE · PROFILE VERIFIED
        </span>
        <div className="strip-right">
          <span>PUNE, IN · {new Date().getFullYear()}</span>
          <span>HP//OS v3.0</span>
          <span>⌘K COMMANDS</span>
        </div>
      </div>
    </>
  );
}

/** Tracks overall scroll progress + active section for the HUD. */
export function useScrollHud(sectionIds: string[]) {
  const [progress, setProgress] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
        setScrolled(window.scrollY > 40);

        // active section: nearest below viewport top + half
        const mid = window.scrollY + window.innerHeight * 0.4;
        let idx = 0;
        sectionIds.forEach((id, i) => {
          const el = document.getElementById(id);
          if (el && el.offsetTop <= mid) idx = i;
        });
        setSectionIndex(idx);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [sectionIds]);

  return { progress, sectionIndex, scrolled };
}
