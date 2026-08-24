import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { DataProvider, useData } from "./lib/data";
import { detectCapabilities, type EnvCapabilities } from "./lib/device";
import { bindReveals, killTriggers, ScrollTrigger } from "./lib/motion";
import { unlock } from "./lib/achievements";
import { api } from "./lib/api";
import type { CoreMode } from "./components/three/CoreScene";

import { BootSequence } from "./components/hud/BootSequence";
import { TopBar } from "./components/hud/TopBar";
import { StatusRail, useScrollHud } from "./components/hud/StatusRail";
import { CommandPalette, type Command } from "./components/hud/CommandPalette";
import { Cursor } from "./components/hud/Cursor";
import { AchievementToasts } from "./components/hud/AchievementToasts";
import { Terminal } from "./components/hud/Terminal";
import { PrivateAccess, useGlobalShortcuts } from "./components/hud/PrivateAccess";

import { Hero } from "./features/sections/Hero";
import { Identity } from "./features/sections/Identity";
import { EngineeringCore } from "./features/sections/EngineeringCore";
import { Projects } from "./features/sections/Projects";
import { Timeline } from "./features/sections/Timeline";
import { CertificateVault } from "./features/sections/CertificateVault";
import { Contact } from "./features/sections/Contact";
import { Exit } from "./features/sections/Exit";
import { ProjectCase } from "./features/sections/ProjectCase";
import { Recruiter } from "./features/recruiter/Recruiter";
import { ChatWidget } from "./features/chat/ChatWidget";

const SECTION_IDS = ["hero", "identity", "core", "projects", "timeline", "credentials", "contact", "exit"];
const CORE_MODE_BY_INDEX: CoreMode[] = ["hero", "hero", "core", "projects", "hero", "credentials", "contact", "contact"];

function Experience({ caps }: { caps: EnvCapabilities }) {
  const { stats, loaded } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [bootDone, setBootDone] = useState(() => sessionStorage.getItem("hp_boot_done") === "1");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [coreMode, setCoreMode] = useState<CoreMode>("hero");
  const triggersRef = useRef<ScrollTrigger[]>([]);

  const { progress, sectionIndex, scrolled } = useScrollHud(SECTION_IDS);

  // boot completion → unlock achievement + track
  const finishBoot = useCallback(() => {
    setBootDone(true);
    sessionStorage.setItem("hp_boot_done", "1");
    unlock("boot");
    void api.track("page_view");
  }, []);

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
  }, [caps, loaded, location.pathname, bootDone]);

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
      { id: "identity", label: "About Harsh", icon: "01", action: go("identity"), keywords: "identity about bio who" },
      { id: "core", label: "Engineering Core / Skills", icon: "02", action: go("core"), keywords: "skills capabilities tech stack" },
      { id: "projects", label: "Projects", icon: "03", action: go("projects"), keywords: "projects systems work portfolio" },
      { id: "timeline", label: "Mission Log / Timeline", icon: "04", action: go("timeline"), keywords: "timeline education history experience" },
      { id: "certs", label: "Certificates", icon: "05", action: go("credentials"), keywords: "certificates credentials archive" },
      { id: "contact", label: "Contact", icon: "06", action: go("contact"), keywords: "contact email message hire" },
      { id: "resume", label: "Download Resume", icon: "↓", hint: "PDF", action: () => { void api.track("resume_download"); window.open("/files/HARSH-RESUME.pdf", "_blank", "noopener"); }, keywords: "resume cv pdf download" },
      { id: "recruiter", label: "Recruiter View", icon: "⚡", hint: "FAST", action: () => navigate("/recruiter"), keywords: "recruiter quick summary hr" },
      { id: "github", label: "Open GitHub", icon: "↗", hint: "EXT", action: () => window.open("https://github.com/harshpandeyz", "_blank", "noopener"), keywords: "github code repos" },
      { id: "linkedin", label: "Open LinkedIn", icon: "↗", hint: "EXT", action: () => window.open("https://www.linkedin.com/in/harshpandeyz/", "_blank", "noopener"), keywords: "linkedin profile network" },
      { id: "chat", label: "Ask Harsh AI", icon: "◈", action: () => { unlock("ai"); window.dispatchEvent(new CustomEvent("hp:open-chat")); }, keywords: "ai chat assistant ask" },
      { id: "terminal", label: "Open Terminal", icon: "❯", action: () => setTerminalOpen(true), keywords: "terminal console shell commands" },
      { id: "private", label: "Private Access", icon: "⚿", hint: "AUTH", action: () => setPrivateOpen(true), keywords: "admin private operator login" },
    ];
  }, [caps.reducedMotion, location.pathname, navigate]);

  if (!bootDone) {
    return <BootSequence onComplete={finishBoot} reducedMotion={caps.reducedMotion} />;
  }

  return (
    <>
      <a href="#main" className="skip-link">SKIP TO CONTENT</a>
      <div className="bg-layers" aria-hidden="true">
        <div className="bg-grid" />
        <div className="bg-ambient" />
        <div className="bg-scanline" />
      </div>

      <TopBar
        scrolled={scrolled}
        sectionIndex={sectionIndex}
        sectionCount={SECTION_IDS.length}
        onOpenPalette={() => setPaletteOpen(true)}
        onLogoClick={onLogoClick}
      />
      <StatusRail progress={progress} sectionIndex={sectionIndex} sectionCount={SECTION_IDS.length} stats={stats ? { projects: stats.projects, certificates: stats.certificates } : null} />

      <main id="main">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero caps={caps} coreMode={coreMode} />
                <Identity caps={caps} />
                <EngineeringCore />
                <Projects />
                <Timeline />
                <CertificateVault />
                <Contact />
                <Exit />
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
                  <div className="mono mono-dim" style={{ marginBottom: 18 }}>404 // SECTOR UNMAPPED</div>
                  <button className="btn" onClick={() => navigate("/")}>RETURN TO SYSTEM →</button>
                </div>
              </div>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <span>© {new Date().getFullYear()} HARSH PANDEY · PUNE, IN</span>
        <button className="term-btn" onClick={() => setTerminalOpen(true)}>TERMINAL ❯</button>
        <span>HP//OS v3.0 · ENGINEERED, NOT TEMPLATED</span>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <Terminal open={terminalOpen} onClose={() => setTerminalOpen(false)} />
      <PrivateAccess open={privateOpen} onClose={() => setPrivateOpen(false)} />
      <ChatWidget />
      <AchievementToasts />
      <Cursor enabled={!caps.reducedMotion} />
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
