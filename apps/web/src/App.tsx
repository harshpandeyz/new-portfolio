import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { DataProvider, useData } from "./lib/data";
import { detectCapabilities, type EnvCapabilities } from "./lib/device";
import { bindReveals, killTriggers, ScrollTrigger } from "./lib/motion";
import { unlock } from "./lib/achievements";
import { api } from "./lib/api";
import { applyMeta } from "./lib/seo";
import { SEO } from "./app/constants";

import { TopBar } from "./components/navigation/TopBar";
import { SECTION_IDS, type SectionId } from "./components/navigation/nav";
import { Footer } from "./components/layout/Footer";
import { ResumeViewer } from "./components/document/ResumeViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useScrollPosition } from "./lib/scroll";
import { CommandPalette, type Command, type CommandIcon } from "./components/hud/CommandPalette";
import { AchievementToasts } from "./components/hud/AchievementToasts";
import { PrivateAccess, useGlobalShortcuts } from "./components/hud/PrivateAccess";

import { Hero } from "./features/home/Hero";
import { About } from "./features/home/About";
import { Journey } from "./features/home/Journey";
import { Work } from "./features/home/Work";
import { TechStack } from "./features/home/TechStack";
import { Credentials } from "./features/home/Credentials";
import { Contact } from "./features/contact/Contact";
import { Closing } from "./features/home/Closing";
import { ProjectCase } from "./features/projects/ProjectCase";
import { ProjectArchive } from "./features/projects/ProjectArchive";
import { CredentialArchive } from "./features/credentials/CredentialArchive";
import { ChatWidget } from "./features/chat/ChatWidget";

function Experience({ caps }: { caps: EnvCapabilities }) {
  const { loaded, error, refresh } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const triggersRef = useRef<ScrollTrigger[]>([]);
  const imageCleanupsRef = useRef<(() => void)[]>([]);
  const recruiterMode = location.pathname === "/recruiter";

  const { sectionIndex, scrolled } = useScrollPosition(SECTION_IDS);

  // Track page views on route changes. In the SPA, the Experience component
  // doesn't remount on navigation so we depend on location.pathname.
  useEffect(() => { void api.track("page_view", location.pathname); }, [location.pathname]);

  useEffect(() => {
    // Page-specific metadata (defaults for the home shell).
    if (location.pathname === "/recruiter") {
      applyMeta({ title: `${SEO.title.split(" | ")[0]} — Résumé`, description: "Fast, printable summary of Harsh Pandey's experience, selected work, capabilities and education." });
    } else if (location.pathname.startsWith("/projects/")) {
      applyMeta({ title: "Project — Harsh Pandey", description: SEO.description });
    } else if (location.pathname === "/projects") {
      applyMeta({ title: `${SEO.title.split(" | ")[0]} — Project archive`, description: "The full archive of Harsh Pandey's projects — flagship, selected work, experiments and internship builds." });
    } else if (location.pathname === "/credentials") {
      applyMeta({ title: `${SEO.title.split(" | ")[0]} — Credential archive`, description: "The full credential archive for Harsh Pandey — certificates, assessments and major achievements." });
    } else {
      applyMeta({ title: SEO.title, description: SEO.description });
    }
  }, [location.pathname]);

  // GSAP reveals after content loads (home only). Re-binding on `loaded`
  // snapshots final geometry, and ScrollTrigger is refreshed again once
  // fonts/lazy-images settle so trigger positions track real layout — reveal
  // state never depends on one fragile scroll-crossing happening at the exact
  // moment a trigger was created (refresh() fires onEnter for anything already
  // past its start).
  useEffect(() => {
    if (location.pathname !== "/") return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      killTriggers(triggersRef.current);
      triggersRef.current = bindReveals(document, caps);
      if (caps.reducedMotion) return;

      const refresh = () => ScrollTrigger.refresh();
      const onWindowLoad = () => refresh();
      window.addEventListener("load", onWindowLoad, { once: true });
      if (document.readyState === "complete") onWindowLoad();
      void document.fonts.ready.then(refresh).catch(() => undefined);

      const lazyImages = [...document.querySelectorAll<HTMLImageElement>("img[loading='lazy']")];
      const cleanups: (() => void)[] = [];
      if (lazyImages.length > 0) {
        let pending = lazyImages.length;
        const onImageReady = () => {
          pending -= 1;
          if (pending === 0) refresh();
        };
        lazyImages.forEach((img) => {
          if (img.complete) onImageReady();
          else {
            img.addEventListener("load", onImageReady, { once: true });
            cleanups.push(() => img.removeEventListener("load", onImageReady));
          }
        });
      }
      // Store cleanups so the effect cleanup can remove them if it re-runs.
      imageCleanupsRef.current = cleanups;
    }, loaded ? 60 : 600);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      // Clean up any lazy-image listeners from a previous timer fire.
      imageCleanupsRef.current.forEach((fn) => fn());
      imageCleanupsRef.current = [];
    };
  }, [caps, loaded, location.pathname]);

  // Shared deep links (/#work, /#credentials, …) must land on their section on
  // a fresh load — not just when clicked in-app. Sections render after content
  // loads; scrolling against pre-settle geometry makes the browser stop short,
  // so wait for fonts to settle before computing the scroll target. In-app
  // anchor jumps (footer etc.) are handled by the hashchange listener below.
  useEffect(() => {
    if (location.pathname !== "/") return;
    if (!loaded) return;
    const id = location.hash.replace(/^#/, "");
    if (!id) return;

    const handles: number[] = [];
    const scrollToHash = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
    };

    const settleAndScroll = () => {
      if (document.fonts && document.fonts.status === "loading") {
        void document.fonts.ready.then(() => window.setTimeout(scrollToHash, 120)).catch(scrollToHash);
      } else {
        scrollToHash();
      }
      // Smooth scrolling a tall page can land short when async content (lazy
      // images, reveal tweens) shifts geometry mid-flight. Verify the section
      // reached the viewport; re-scroll if not, then force an instant jump so
      // shareable deep links always land on the section.
      let attempts = 0;
      const checker = window.setInterval(() => {
        attempts += 1;
        const el = document.getElementById(id);
        if (!el) return window.clearInterval(checker);
        if (Math.abs(el.getBoundingClientRect().top) <= 12) return window.clearInterval(checker);
        if (attempts >= 3) {
          window.clearInterval(checker);
          el.scrollIntoView({ behavior: "instant" as ScrollBehavior });
          return;
        }
        scrollToHash();
      }, 250);
      handles.push(checker);
    };

    const t = window.setTimeout(settleAndScroll, 80);
    return () => {
      window.clearTimeout(t);
      handles.forEach((h) => window.clearInterval(h));
    };
  }, [location.hash, loaded, location.pathname, caps.reducedMotion]);

  useEffect(() => {
    if (location.pathname !== "/") return;
    const onHashChange = () => {
      const id = location.hash.replace(/^#/, "");
      if (!id) return;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [location.pathname, caps.reducedMotion]);

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
        navigate(`/#${id}`);
        window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" }), 220);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: caps.reducedMotion ? "auto" : "smooth" });
      }
    };
    return [
      { id: "work", label: "Go to Work", icon: "work" as const, action: go("work"), keywords: "projects systems work portfolio" },
      { id: "about", label: "Go to About", icon: "about" as const, action: go("about"), keywords: "identity about bio who" },
      { id: "tech", label: "Go to Tech Stack", icon: "tech" as const, action: go("tech"), keywords: "skills technologies stack capabilities" },
      { id: "journey", label: "Go to Education", icon: "journey" as const, action: go("journey"), keywords: "timeline education history milestones" },
      { id: "credentials", label: "Go to Credentials", icon: "credentials" as const, action: go("credentials"), keywords: "certificates credentials archive" },
      { id: "contact", label: "Go to Contact", icon: "contact" as const, action: go("contact"), keywords: "contact email message hire" },
      { id: "project-archive", label: "Open project archive", icon: "projects" as const, hint: "ALL", action: () => navigate("/projects"), keywords: "projects archive all work explore" },
      { id: "credential-archive", label: "Open credential archive", icon: "vault" as const, hint: "ALL", action: () => navigate("/credentials"), keywords: "certificates archive all credentials" },
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
                <Hero caps={caps} onViewResume={openResume} />
                <About />
                <Journey />
                <Work />
                <TechStack />
                <Credentials />
                <Contact onViewResume={openResume} />
                <Closing onViewResume={openResume} />
              </>
            }
          />
          <Route path="/projects" element={<ProjectArchive />} />
          <Route path="/credentials" element={<CredentialArchive />} />
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