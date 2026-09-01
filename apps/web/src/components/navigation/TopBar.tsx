import { useRef, useState } from "react";

import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcut";
import { Button } from "../ui/Button";
import { IconMenu, IconClose } from "../ui/icons";
import { NAV_LINKS, type SectionId } from "./nav";

export interface TopBarProps {
  scrolled: boolean;
  onLogoClick: () => void;
  activeSection: SectionId;
  onViewResume: () => void;
  onAskHarsh: () => void;
  onOpenPalette: () => void;
}

function scrollToId(id: string, reducedMotion: boolean) {
  document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
}

export function TopBar({ scrolled, onLogoClick, activeSection, onViewResume, onAskHarsh, onOpenPalette }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useFocusTrap(sheetRef, mobileOpen, () => setMobileOpen(false));
  useScrollLock(mobileOpen);
  useKeyboardShortcut(["Escape"], () => setMobileOpen(false), mobileOpen);

  const go = (id: SectionId) => {
    setMobileOpen(false);
    scrollToId(id, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  };

  const goViaHash = (href: string) => {
    setMobileOpen(false);
    // "#id" deep-links work from any route because router handles "/#id".
    const id = href.replace(/^\/?#/, "");
    if (window.location.pathname !== "/") {
      window.location.assign(`/#${id}`);
    } else {
      scrollToId(id, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  };

  return (
    <>
      <header className={`topbar${scrolled ? " scrolled" : ""}`}>
        <button className="brand" onClick={onLogoClick} aria-label="Harsh Pandey — back to home">
          <span className="brand-mark" aria-hidden="true" />
          Harsh&nbsp;Pandey
        </button>

        <nav className="topbar-nav" aria-label="Primary navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              href={`/#${link.id}`}
              className={activeSection === link.id ? "active" : ""}
              aria-current={activeSection === link.id ? "true" : undefined}
              onClick={(e) => {
                if (window.location.pathname !== "/" && link.id !== "hero") return;
                e.preventDefault();
                go(link.id);
              }}
            >
              {link.label}
            </a>
          ))}
          <Button size="sm" variant="ghost" onClick={onAskHarsh}>
            Ask Harsh
          </Button>
          <Button size="sm" onClick={onViewResume}>
            Résumé
          </Button>
        </nav>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-controls="primary-mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <IconClose /> : <IconMenu />}
        </button>
      </header>

      {mobileOpen && (
        <div className="nav-sheet" id="primary-mobile-nav" ref={sheetRef} data-open>
          <button className="nav-sheet-close" onClick={() => setMobileOpen(false)} aria-label="Dismiss menu">
            <IconClose />
          </button>
          <nav className="nav-sheet-list" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a key={link.id} href={`#${link.id}`} className="nav-sheet-item" onClick={(e) => { e.preventDefault(); go(link.id); }}>
                {link.label}
              </a>
            ))}
            <button className="nav-sheet-item" onClick={() => { setMobileOpen(false); onViewResume(); }}>
              View résumé
            </button>
            <button className="nav-sheet-item" onClick={() => { setMobileOpen(false); onAskHarsh(); }}>
              Ask Harsh
            </button>
          </nav>
          <span className="nav-sheet-command">Press <kbd>⌘K</kbd> for more</span>
        </div>
      )}
    </>
  );
}