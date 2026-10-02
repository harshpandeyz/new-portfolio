import { useRef, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useDialogLifecycle } from "../../hooks/useDialogLifecycle";
import { useReducedMotion } from "../../hooks/useReducedMotion";
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

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform ?? "");

export function TopBar({ scrolled, onLogoClick, activeSection, onViewResume, onAskHarsh, onOpenPalette }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const closeMenu = useCallback(() => setMobileOpen(false), []);
  useDialogLifecycle(sheetRef, mobileOpen, closeMenu, triggerRef.current);

  const scrollToId = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }, [reducedMotion]);

  const navigateToSection = useCallback((id: SectionId) => {
    setMobileOpen(false);
    if (location.pathname !== "/") {
      // SPA navigate to homepage with hash — App.tsx hash effect handles scroll after settle
      navigate(`/#${id}`);
      // Fallback timer in case App hash effect hasn't fired yet (e.g. immediate)
      window.setTimeout(() => scrollToId(id), 220);
    } else {
      scrollToId(id);
    }
  }, [location.pathname, navigate, scrollToId]);

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
              aria-current={activeSection === link.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigateToSection(link.id);
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
          ref={triggerRef}
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
        <div className="nav-sheet" id="primary-mobile-nav" ref={sheetRef} data-open role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button className="nav-sheet-close" onClick={closeMenu} aria-label="Dismiss menu">
            <IconClose />
          </button>
          <nav className="nav-sheet-list" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a key={link.id} href={`/#${link.id}`} className={`nav-sheet-item${activeSection === link.id ? " active" : ""}`} aria-current={activeSection === link.id ? "page" : undefined} onClick={(e) => { e.preventDefault(); navigateToSection(link.id); }}>
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
          <span className="nav-sheet-command">Press <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd> for more</span>
        </div>
      )}
    </>
  );
}
