import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { DataProvider, useData } from "./lib/data";
import { detectCapabilities, type EnvCapabilities } from "./lib/device";
import { bindReveals, killTriggers, ScrollTrigger } from "./lib/motion";
import { unlock } from "./lib/achievements";
import { api, resolveMediaUrl } from "./lib/api";
import type { CoreMode } from "./components/three/CoreScene";

import { TopBar } from "./components/navigation/TopBar";
import { useScrollPosition } from "./lib/scroll";
import { CommandPalette, type Command } from "./components/hud/CommandPalette";
import { AchievementToasts } from "./components/hud/AchievementToasts";
import { Terminal } from "./components/hud/Terminal";
import { PrivateAccess, useGlobalShortcuts } from "./components/hud/PrivateAccess";

import { Hero } from "./features/sections/Hero";
import { About } from "./features/sections/About";
import { Capabilities } from "./features/sections/Capabilities";
import { Projects } from "./features/sections/Projects";
import { Timeline } from "./features/sections/Timeline";
import { Credentials } from "./features/sections/Credentials";
import { Contact } from "./features/sections/Contact";
import { Closing } from "./features/sections/Closing";
import { ProjectCase } from "./features/sections/ProjectCase";
import { Recruiter } from "./features/recruiter/Recruiter";
import { ChatWidget } from "./features/chat/ChatWidget";

const SECTION_IDS = ["hero", "about", "projects", "capabilities", "timeline", "credentials", "contact", "exit"];
const CORE_MODE_BY_INDEX: CoreMode[] = ["hero", "hero", "projects", "core", "hero", "credentials", "contact", "contact"];

function Experience({ caps }: { caps: EnvCapabilities }) {
  const { loaded, error, refresh } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [coreMode, setCoreMode] = useState<CoreMode>("hero");
  const triggersRef = useRef<ScrollTrigger[]>([]);
  const recruiterMode = location.pathname === "/recruiter";

  const { sectionIndex, scrolled } = useScrollPosition(SECTION_IDS);

  useEffect(() => { void api.track("page_view"); }, []);

  // section → 3D core mode
  useEffect(() => {
    if (location.pathname !== "/") return;
    setCoreMode(CORE_MODE_BY_INDEX[sectionIndex] ?? "hero");
  }, [sectionIndex, location.pathname]);

  // GSAP reveals after content loads (home only)
  useEffect(() => {
    if (location.pathname !== "/") return;
    const t = window.setTimeout(() => {
      killTriggers(triggersRef.current);
      triggersRef.current = bindReveals(document, caps);
      ScrollTrigger.refresh();
    }, loaded ? 60 : 600);
    return () => window.clearTimeout(t);
  }, [caps, loaded, location.pathname]);

  useEffect(() => () => killTriggers(triggersRef.current), []);

  // private access via exit-section event
  useEffect(() => {
    const open = () => setPrivateOpen(true);
    window.addEventListener("hp:private-access", open);
    return () => window.removeEventListener("hp:private-access", open);
  }, []);

  // triple-click logo easter egg → minimal mode (visual only)
  const logoClicks = useRef(0);
  const onLogoClick = useCallback(() => {
    logoClicks.current += 1;
    if (logoClicks.current === 1) {
      navigate("/");
      window.scrollTo({ top: 0, behavior: caps.reducedMotion ? "auto" : "smooth" });
    }
    if (logoClicks.current >= 5) {
      logoClicks.current = 0;
      document.documentElement.classList.toggle("minimal-mode");
      window.dispatchEvent(new CustomEvent("hp:toast", { detail: { title: "INTERFACE MODE", desc: "Minimal mode toggled." } }));
    }
  }, [navigate, caps.reducedMotion]);

  useGlobalShortcuts(
    useMemo(
      () => ({
        onPalette: () => setPaletteOpen((o) => !o),
        onPrivate: () => setPrivateOpen(true),
      }),
      [],
    ),
  );

  const commands: Command[] = useMemo(() => {
    const go = (id: string) => () => {
      if (location.pathname !== "/") {
        navigate("/");
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 120);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
      }
    };
    return [
      { id: "home", label: "Go Home", icon: "▲", hint: "TOP", action: go("hero"), keywords: "top start hero" },
      { id: "about", label: "About Harsh", icon: "01", action: go("about"), keywords: "identity about bio who" },
      { id: "projects", label: "Selected work", icon: "02", action: go("projects"), keywords: "projects systems work portfolio" },
      { id: "capabilities", label: "Capabilities", icon: "03", action: go("capabilities"), keywords: "skills capabilities tech stack" },
      { id: "timeline", label: "Journey", icon: "04", action: go("timeline"), keywords: "timeline education history experience" },
      { id: "certs", label: "Credentials", icon: "05", action: go("credentials"), keywords: "certificates credentials archive" },
      { id: "contact", label: "Contact", icon: "06", action: go("contact"), keywords: "contact email message hire" },
      { id: "resume", label: "Download résumé", icon: "↓", hint: "PDF", action: () => { void api.track("resume_download"); window.open(resolveMediaUrl("/files/HARSH-RESUME.pdf"), "_blank", "noopener"); }, keywords: "resume cv pdf download" },
      { id: "recruiter", label: "Recruiter view", icon: "↗", hint: "FAST", action: () => navigate("/recruiter"), keywords: "recruiter quick summary hr" },
      { id: "github", label: "Open GitHub", icon: "↗", hint: "EXT", action: () => window.open("https://github.com/harshpandeyz", "_blank", "noopener"), keywords: "github code repos" },
      { id: "linkedin", label: "Open LinkedIn", icon: "↗", hint: "EXT", action: () => window.open("https://www.linkedin.com/in/harshpandeyz/", "_blank", "noopener"), keywords: "linkedin profile network" },
      { id: "chat", label: "Ask Harsh", icon: "✦", action: () => { unlock("ai"); window.dispatchEvent(new CustomEvent("hp:open-chat")); }, keywords: "ai chat assistant ask" },
      { id: "terminal", label: "Open terminal", icon: "⌘", action: () => setTerminalOpen(true), keywords: "terminal console shell commands easter egg" },
      { id: "private", label: "Private access", icon: "•", hint: "AUTH", action: () => setPrivateOpen(true), keywords: "admin private operator login" },
    ];
  }, [caps.reducedMotion, location.pathname, navigate]);

  return (
    <>
      {!recruiterMode && <a href="#main" className="skip-link">SKIP TO CONTENT</a>}
      {!recruiterMode && <div className="bg-layers" aria-hidden="true"><div className="bg-ambient" /></div>}
      {!recruiterMode && <TopBar scrolled={scrolled} onLogoClick={onLogoClick} />}
      {!recruiterMode && error && <div className="data-notice" role="status">Some content is temporarily unavailable. <button onClick={() => void refresh()}>Try again</button></div>}
      <main id="main">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero caps={caps} coreMode={coreMode} />
                <About />
                <Projects />
                <Capabilities />
                <Timeline />
                <Credentials />
                <Contact />
                <Closing />
              </>
            }
          />
          <Route path="/projects/:slug" element={<ProjectCase />} />
          <Route path="/recruiter" element={<Recruiter />} />
          <Route
            path="*"
            element={
              <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
                <div>
                  <h1 style={{ marginBottom: 18, fontSize: "clamp(42px, 7vw, 72px)" }}>Page not found</h1>
                  <button className="btn" onClick={() => navigate("/")}>Back to home →</button>
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      {!recruiterMode && <footer className="footer">
        <div><strong>Harsh Pandey</strong><span>Software Engineer</span></div>
        <nav aria-label="Footer navigation"><a href="/#projects">Work</a><a href="/#about">About</a><a href="/#contact">Contact</a></nav>
        <div className="footer-links"><a href="https://github.com/harshpandeyz" target="_blank" rel="noopener noreferrer">GitHub ↗</a><a href="https://www.linkedin.com/in/harshpandeyz/" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a><button className="term-btn" onClick={() => setTerminalOpen(true)} aria-label="Open advanced terminal">⌘</button><span>© {new Date().getFullYear()}</span></div>
      </footer>}

      {!recruiterMode && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />}
      {!recruiterMode && <Terminal open={terminalOpen} onClose={() => setTerminalOpen(false)} />}
      {!recruiterMode && <PrivateAccess open={privateOpen} onClose={() => setPrivateOpen(false)} />}
      {!recruiterMode && <ChatWidget />}
      {!recruiterMode && <AchievementToasts />}
    </>
  );
}

export default function App() {
  const [caps] = useState<EnvCapabilities>(() => detectCapabilities());
  return (
    <DataProvider>
      <Routes>
        <Route path="/private/*" element={<AdminRoute />} />
        <Route path="*" element={<Experience caps={caps} />} />
      </Routes>
    </DataProvider>
  );
}

// code-split the entire admin dashboard (three.js + gsap stay out of this chunk)
const AdminApp = lazy(() => import("./features/admin/AdminApp"));

function AdminRoute() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100svh", display: "grid", placeItems: "center" }}>
          <span className="mono mono-dim">LOADING CONTROL…</span>
        </div>
      }
    >
      <AdminApp />
    </Suspense>
  );
}
