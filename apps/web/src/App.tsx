import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { DataProvider, useData } from "./lib/data";
import { detectCapabilities, type EnvCapabilities } from "./lib/device";
import { bindReveals, killTriggers, type ScrollTrigger } from "./lib/motion";
import { unlock } from "./lib/achievements";
import { api } from "./lib/api";
import { applyMeta } from "./lib/seo";
import { SEO } from "./app/constants";
import type { CoreMode } from "./components/three/CoreScene";

import { TopBar } from "./components/navigation/TopBar";
import { CORE_MODE_BY_INDEX, SECTION_IDS, type SectionId } from "./components/navigation/nav";
import { Footer } from "./components/layout/Footer";
import { ResumeViewer } from "./components/document/ResumeViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useScrollPosition } from "./lib/scroll";
import { CommandPalette, type Command, type CommandIcon } from "./components/hud/CommandPalette";
import { AchievementToasts } from "./components/hud/AchievementToasts";
import { PrivateAccess, useGlobalShortcuts } from "./components/hud/PrivateAccess";

import { Hero } from "./features/home/Hero";
import { Work } from "./features/home/Work";
import { About } from "./features/home/About";
import { Capabilities } from "./features/home/Capabilities";
import { Journey } from "./features/home/Journey";
import { Credentials } from "./features/home/Credentials";
import { Contact } from "./features/contact/Contact";
import { Closing } from "./features/home/Closing";
import { ProjectCase } from "./features/projects/ProjectCase";
import { ChatWidget } from "./features/chat/ChatWidget";

function Experience({ caps }: { caps: EnvCapabilities }) {
  const { loaded, error, refresh } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [coreMode, setCoreMode] = useState<CoreMode>("hero");
  const triggersRef = useRef<ScrollTrigger[]>([]);
  const recruiterMode = location.pathname === "/recruiter";

  const { sectionIndex, scrolled } = useScrollPosition([...SECTION_IDS]);

  useEffect(() => { void api.track("page_view"); }, []);

  useEffect(() => {
    // Page-specific metadata (defaults for the home shell).
    if (location.pathname === "/recruiter") {
      applyMeta({ title: `${SEO.title.split(" | ")[0]} — Résumé`, description: "Fast, printable summary of Harsh Pandey's experience, selected work, capabilities and education." });
    } else if (location.pathname.startsWith("/projects/")) {
      applyMeta({ title: "Project — Harsh Pandey", description: SEO.description });
    } else {
      applyMeta({ title: SEO.title, description: SEO.description });
    }
  }, [location.pathname]);

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

  const openResume = useCallback(() => {
    setResumeOpen(true);
    void api.track("resume_view");
  }, []);

  const openChat = useCallback(() => {
    unlock("ai");
    window.dispatchEvent(new CustomEvent("hp:open-chat"));
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
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" }), 120);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
      }
    };
    return [
      { id: "work", label: "Go to Work", icon: "work" as const, action: go("work"), keywords: "projects systems work portfolio" },
      { id: "about", label: "Go to About", icon: "about" as const, action: go("about"), keywords: "identity about bio who" },
      { id: "journey", label: "Go to Journey", icon: "journey" as const, action: go("journey"), keywords: "timeline education history experience" },
      { id: "credentials", label: "Go to Credentials", icon: "credentials" as const, action: go("credentials"), keywords: "certificates credentials archive" },
      { id: "contact", label: "Go to Contact", icon: "contact" as const, action: go("contact"), keywords: "contact email message hire" },
      { id: "resume", label: "View résumé", icon: "resume" as const, hint: "PDF", action: openResume, keywords: "resume cv pdf view" },
      { id: "recruiter", label: "Recruiter view", icon: "recruiter" as const, hint: "FAST", action: () => navigate("/recruiter"), keywords: "recruiter quick summary hr" },
      { id: "github", label: "Open GitHub", icon: "github" as const, hint: "EXT", action: () => window.open("https://github.com/harshpandeyz", "_blank", "noopener"), keywords: "github code repos" },
      { id: "linkedin", label: "Open LinkedIn", icon: "linkedin" as const, hint: "EXT", action: () => window.open("https://www.linkedin.com/in/harshpandeyz/", "_blank", "noopener"), keywords: "linkedin profile network" },
      { id: "chat", label: "Ask Harsh", icon: "chat" as const, action: openChat, keywords: "ai chat assistant ask" },
      { id: "recruiter-home", label: "Return Home", icon: "home" as const, action: () => navigate("/"), keywords: "home top start hero" },
    ];
  }, [caps.reducedMotion, location.pathname, navigate, openResume, openChat]);

  const activeSection: SectionId = SECTION_IDS[sectionIndex] ?? "hero";

  return (
    <ErrorBoundary>
      {!recruiterMode && <a href="#main" className="skip-link">SKIP TO CONTENT</a>}
      {!recruiterMode && <div className="bg-layers" aria-hidden="true"><div className="bg-ambient" /></div>}
      {!recruiterMode && <TopBar scrolled={scrolled} onLogoClick={onLogoClick} activeSection={activeSection} onViewResume={openResume} onAskHarsh={openChat} onOpenPalette={() => setPaletteOpen(true)} />}
      {!recruiterMode && (error && <div className="data-notice" role="status">Some content is temporarily unavailable. <button onClick={() => void refresh()}>Try again</button></div>)}
      <main id="main">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero caps={caps} coreMode={coreMode} onViewResume={openResume} />
                <Work />
                <About />
                <Capabilities />
                <Journey />
                <Credentials />
                <Contact onViewResume={openResume} />
                <Closing onViewResume={openResume} />
              </>
            }
          />
          <Route path="/projects/:slug" element={<ProjectCase onViewResume={openResume} />} />
          <Route path="/recruiter" element={<RecruiterRoute onViewResume={openResume} />} />
          <Route path="*" element={<NotFound onHome={() => navigate("/")} />} />
        </Routes>
      </main>

      {!recruiterMode && <Footer onViewResume={openResume} />}

      {!recruiterMode && <ResumeViewer open={resumeOpen} onClose={() => setResumeOpen(false)} />}
      {!recruiterMode && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />}
      {!recruiterMode && <PrivateAccess open={privateOpen} onClose={() => setPrivateOpen(false)} />}
      {!recruiterMode && <ChatWidget />}
      {!recruiterMode && <AchievementToasts />}
    </ErrorBoundary>
  );
}

function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
      <div>
        <h1 style={{ marginBottom: 18, fontSize: "clamp(42px, 7vw, 72px)" }}>Page not found</h1>
        <button className="btn" onClick={onHome}>Back to home →</button>
      </div>
    </div>
  );
}

const Recruiter = lazy(() =>
  import("./features/recruiter/Recruiter").then((m) => ({ default: m.Recruiter })),
);
function RecruiterRoute({ onViewResume }: { onViewResume: () => void }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh", display: "grid", placeItems: "center" }}><span className="mono mono-dim">Loading…</span></div>}>
      <Recruiter onViewResume={onViewResume} />
    </Suspense>
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

// code-split the admin dashboard (three.js + gsap stay out of this chunk)
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