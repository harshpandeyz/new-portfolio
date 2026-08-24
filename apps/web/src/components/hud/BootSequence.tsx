import { useEffect, useRef, useState } from "react";

const BOOT_LINES = [
  "INITIALIZING PERSONAL SYSTEM",
  "LOADING ENGINEERING PROFILE",
  "LOADING PROJECT ARCHIVE",
  "LOADING TECHNICAL CAPABILITIES",
  "VERIFYING CREDENTIALS",
  "SYSTEM ONLINE",
];

interface BootSequenceProps {
  onComplete: () => void;
  reducedMotion: boolean;
}

export function BootSequence({ onComplete, reducedMotion }: BootSequenceProps) {
  const [lines, setLines] = useState<number>(0);
  const [pct, setPct] = useState(0);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    window.setTimeout(onComplete, reducedMotion ? 60 : 620);
  };

  useEffect(() => {
    if (reducedMotion) {
      const t = window.setTimeout(finish, 350);
      return () => window.clearTimeout(t);
    }

    let lineTimer: number[] = [];
    BOOT_LINES.forEach((_, i) => {
      lineTimer.push(window.setTimeout(() => setLines(i + 1), 240 + i * 330));
    });

    const start = performance.now();
    const duration = 2300;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease with a stall in the middle for anticipation
      const eased = t < 0.7 ? t * 1.15 : 0.8 + ((t - 0.7) / 0.3) * 0.2;
      setPct(Math.min(100, Math.round(eased * 100)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(finish, 260);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      lineTimer.forEach(clearTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  return (
    <div className={`boot${exiting ? " boot-exit" : ""}`} role="status" aria-label="System booting">
      <div className="boot-inner">
        <div className="boot-logo">
          HP<b>//</b>OS <span style={{ color: "var(--faint)" }}>v3.0</span>
        </div>
        <div className="boot-lines" aria-hidden="true">
          {BOOT_LINES.slice(0, Math.max(lines, 1)).map((line, i) => (
            <div className={`boot-line${i < lines ? " on" : ""}`} key={line}>
              {i < lines - 1 || pct > 96 ? (
                <>
                  {line} <span className="ok">[OK]</span>
                </>
              ) : (
                <>
                  {line} <span style={{ color: "var(--accent)" }}>…</span>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="boot-bar">
          <div className="boot-bar-fill" style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
        <div className="boot-pct">
          <span>HARSH PANDEY // SYSTEM</span>
          <span>{String(pct).padStart(3, "0")}%</span>
        </div>
        <button className="boot-skip" onClick={finish} autoFocus>
          SKIP INTRO →
        </button>
      </div>
    </div>
  );
}
