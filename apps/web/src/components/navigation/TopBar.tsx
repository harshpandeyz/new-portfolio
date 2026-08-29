import { useState } from "react";

interface TopBarProps {
  scrolled: boolean;
  onLogoClick: () => void;
}

const links = [
  { label: "Work", href: "/#projects" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function TopBar({ scrolled, onLogoClick }: TopBarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <header className={`topbar${scrolled ? " scrolled" : ""}`}>
      <button className="brand" onClick={onLogoClick} aria-label="Harsh Pandey home">
        Harsh Pandey
      </button>
      <nav className="topbar-nav" aria-label="Primary navigation">
        {links.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
        <button className="nav-ask" onClick={() => window.dispatchEvent(new CustomEvent("hp:open-chat"))}>Ask Harsh</button>
      </nav>
      <button className="mobile-menu-btn" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="mobile-navigation">
        <span>{mobileOpen ? "Close" : "Menu"}</span><i aria-hidden="true" />
      </button>
      {mobileOpen && (
        <div className="nav-sheet" id="mobile-navigation">
          <nav className="nav-sheet-list" aria-label="Mobile navigation">
            {links.map((link) => <a key={link.href} className="nav-sheet-item" href={link.href} onClick={close}>{link.label}<span>↗</span></a>)}
            <button className="nav-sheet-item" onClick={() => { close(); window.dispatchEvent(new CustomEvent("hp:open-chat")); }}>Ask Harsh<span>✦</span></button>
          </nav>
          <span className="nav-sheet-command">Press <kbd>⌘K</kbd> for more</span>
        </div>
      )}
    </header>
  );
}
