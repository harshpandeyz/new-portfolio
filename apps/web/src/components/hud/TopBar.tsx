import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  scrolled: boolean;
  sectionIndex: number;
  sectionCount: number;
  onOpenPalette: () => void;
  onLogoClick: () => void;
}

export function TopBar({ scrolled, sectionIndex, sectionCount, onOpenPalette, onLogoClick }: TopBarProps) {
  const [time, setTime] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    update();
    const t = window.setInterval(update, 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <button className="brand" onClick={onLogoClick} aria-label="HP//OS home">
        HP<b>//</b>OS
        <span className="cursor-blink" style={{ color: "var(--accent)" }}>_</span>
      </button>
      <div className="topbar-right">
        <span className="hud-clock" aria-hidden="true">
          {time} IST · PUNE
        </span>
        <span className="hud-clock" aria-hidden="true">
          {String(sectionIndex + 1).padStart(2, "0")} / {String(sectionCount).padStart(2, "0")}
        </span>
        <button className="menu-btn" onClick={onOpenPalette} aria-haspopup="dialog">
          MENU <kbd>⌘K</kbd>
        </button>
        <button
          className="menu-btn"
          style={{ display: "none" }}
          onClick={() => navigate("/recruiter")}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    </header>
  );
}
