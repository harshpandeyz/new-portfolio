import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { CommandPalette, ToastProvider } from "./ui";
import type { PaletteCommand } from "./ui";
import { adminBus } from "./bus";
import { useDialogLifecycle } from "../../hooks/useDialogLifecycle";
import { isEditableTarget } from "../../hooks/useKeyboardShortcut";
import { AdminIcon } from "./Icon";
import "../../styles/admin.css";

import { Login } from "./Login";
import { Overview } from "./Overview";

const ProjectsAdmin = lazy(() => import("./ProjectsAdmin").then((m) => ({ default: m.ProjectsAdmin })));
const CertificatesAdmin = lazy(() => import("./CertificatesAdmin").then((m) => ({ default: m.CertificatesAdmin })));
const SkillsAdmin = lazy(() => import("./SkillsAdmin").then((m) => ({ default: m.SkillsAdmin })));
const TimelineAdmin = lazy(() => import("./TimelineAdmin").then((m) => ({ default: m.TimelineAdmin })));
const EducationAdmin = lazy(() => import("./EducationAdmin").then((m) => ({ default: m.EducationAdmin })));
const ProfileAdmin = lazy(() => import("./ProfileAdmin").then((m) => ({ default: m.ProfileAdmin })));
const MessagesAdmin = lazy(() => import("./MessagesAdmin").then((m) => ({ default: m.MessagesAdmin })));
const MediaAdmin = lazy(() => import("./MediaAdmin").then((m) => ({ default: m.MediaAdmin })));
const AuditAdmin = lazy(() => import("./AuditAdmin").then((m) => ({ default: m.AuditAdmin })));
const SecurityCenter = lazy(() => import("./SecurityCenter").then((m) => ({ default: m.SecurityCenter })));
const SettingsAdmin = lazy(() => import("./SettingsAdmin").then((m) => ({ default: m.SettingsAdmin })));
const AiProvidersAdmin = lazy(() => import("./AiProvidersAdmin").then((m) => ({ default: m.AiProvidersAdmin })));

interface AdminUser {
  email: string;
  role: string;
  displayName: string | null;
  totpEnabled: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  keywords: string;
  badge?: boolean;
  end?: boolean;
  adminOnly?: boolean;
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Analytics", items: [{ path: "/private", label: "Overview", icon: "overview", keywords: "home dashboard attention analytics stats", end: true }] },
  {
    label: "Content",
    items: [
      { path: "/private/projects", label: "Projects", icon: "projects", keywords: "work portfolio case studies curation order" },
      { path: "/private/certificates", label: "Certificates", icon: "certificates", keywords: "credentials courses" },
      { path: "/private/skills", label: "Skills", icon: "skills", keywords: "stack capabilities tech" },
      { path: "/private/timeline", label: "Timeline", icon: "timeline", keywords: "journey history milestones" },
      { path: "/private/education", label: "Education", icon: "education", keywords: "degree university study" },
      { path: "/private/profile", label: "Profile", icon: "profile", keywords: "bio identity socials resume" },
    ],
  },
  {
    label: "Inbox",
    items: [
      { path: "/private/messages", label: "Messages", icon: "messages", keywords: "inbox contact mail", badge: true },
      { path: "/private/media", label: "Media", icon: "media", keywords: "files uploads images library" },
    ],
  },
  {
    label: "AI",
    items: [
      { path: "/private/ai-providers", label: "AI providers", icon: "ai", keywords: "llm model openrouter nvidia openai assistant config", adminOnly: true },
    ],
  },
  {
    label: "Security",
    items: [
      { path: "/private/security", label: "Security", icon: "security", keywords: "2fa sessions password auth" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/private/settings", label: "Settings", icon: "settings", keywords: "site feature flags assistant maintenance", adminOnly: true },
      { path: "/private/audit", label: "Audit log", icon: "audit", keywords: "history trail events" },
    ],
  },
];

const TITLES: Record<string, string> = {
  "/private": "Overview",
  "/private/messages": "Messages",
  "/private/projects": "Projects",
  "/private/certificates": "Certificates",
  "/private/skills": "Skills",
  "/private/timeline": "Timeline",
  "/private/education": "Education",
  "/private/profile": "Profile",
  "/private/media": "Media",
  "/private/security": "Security",
  "/private/ai-providers": "AI providers",
  "/private/settings": "Settings",
  "/private/audit": "Audit log",
};

const QUICK_CREATE: { label: string; path: string; keywords: string }[] = [
  { label: "Project", path: "/private/projects?new=1", keywords: "add project work" },
  { label: "Certificate", path: "/private/certificates?new=1", keywords: "add credential" },
  { label: "Skill", path: "/private/skills?new=1", keywords: "add capability stack" },
  { label: "Timeline entry", path: "/private/timeline?new=1", keywords: "add milestone journey" },
  { label: "Education", path: "/private/education?new=1", keywords: "add degree study" },
];

function ensureNoIndex() {
  let tag = document.querySelector('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", "noindex, nofollow, noarchive");
}

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform ?? "");

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [unread, setUnread] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [compactNav, setCompactNav] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("ctl:sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [triageCount, setTriageCount] = useState(0);
  const [userMenu, setUserMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const update = (event: MediaQueryListEvent) => {
      setCompactNav(event.matches);
      if (!event.matches) setDrawer(false);
    };
    setCompactNav(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const refreshUnread = useCallback(() => {
    api.admin
      .messages({ status: "NEW" })
      .then((r) => setUnread(r.unread ?? r.total ?? 0))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    ensureNoIndex();
    document.title = "Control — Harsh Pandey";
    api
      .me()
      .then((r) => {
        setUser({ email: r.user.email, role: r.user.role, displayName: r.user.displayName, totpEnabled: r.user.totpEnabled });
        return api.csrf().catch(() => undefined);
      })
      .then(() => refreshUnread())
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, [refreshUnread]);

  useEffect(() => {
    setDrawer(false);
    setUserMenu(false);
    setNewMenu(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    try { localStorage.setItem("ctl:sidebar-collapsed", String(sidebarCollapsed)); } catch { /* storage is optional */ }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("hp:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hp:unauthorized", onUnauthorized);
  }, []);

  // Live triage count for palette labels (subscription, not polling).
  useEffect(() => {
    if (!user) return;
    setTriageCount(adminBus.getTriage()?.selectedCount ?? 0);
    return adminBus.onTriageChange(() => {
      setTriageCount(adminBus.getTriage()?.selectedCount ?? 0);
    });
  }, [user, paletteOpen]);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    navigate("/private", { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target instanceof Element ? e.target : null;
      const inField = isEditableTarget(e.target);
      const inDialog = Boolean(target?.closest("[role='dialog'], [role='alertdialog']"));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (inField || inDialog) return;
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape" && !paletteOpen) {
        if (inDialog) return;
        setDrawer(false);
        setUserMenu(false);
        setNewMenu(false);
      } else if (!inField && !inDialog && e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, paletteOpen]);

  // Close menus on outside click.
  useEffect(() => {
    if (!userMenu && !newMenu) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenu(false);
      const nm = document.getElementById("ctl-new-menu");
      if (nm && !nm.contains(e.target as Node)) setNewMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenu, newMenu]);

  const closeDrawer = useCallback(() => setDrawer(false), []);
  useDialogLifecycle(drawerRef as React.RefObject<HTMLElement | null>, drawer, closeDrawer, menuButtonRef.current);

  const commands: PaletteCommand[] = useMemo(() => {
    const go = (path: string) => () => navigate(path);
    const nav: PaletteCommand[] = NAV_GROUPS.flatMap((g) =>
      g.items.filter((n) => !n.adminOnly || user?.role === "ADMIN").map((n) => ({
        id: `go-${n.path}`,
        label: `Go to ${n.label}`,
        group: "Navigate",
        keywords: n.keywords,
        action: go(n.path),
      })),
    );
    const triage = adminBus.getTriage();
    const n = triage?.selectedCount ?? triageCount;
    return [
      ...nav,
      ...QUICK_CREATE.map((q) => ({ id: `new-${q.path}`, label: `New ${q.label.toLowerCase()}`, group: "Create", keywords: q.keywords, action: go(q.path) })),
      {
        id: "upload-media",
        label: "Upload media",
        group: "Create",
        keywords: "file image upload library",
        action: () => {
          if (!location.pathname.startsWith("/private/media")) navigate("/private/media");
          window.setTimeout(() => {
            if (!adminBus.requestUpload()) {
              document.getElementById("ctl-media-upload")?.click();
            }
          }, 150);
        },
      },
      {
        id: "triage-read",
        label: n > 0 ? `Mark ${n} selected as read` : "Mark selected messages as read",
        group: "Messages",
        keywords: "inbox triage read",
        disabled: !triage || n === 0,
        action: () => triage?.markSelectedRead(),
      },
      {
        id: "triage-archive",
        label: n > 0 ? `Archive ${n} selected` : "Archive selected messages",
        group: "Messages",
        keywords: "inbox triage archive",
        disabled: !triage || n === 0,
        action: () => triage?.archiveSelected(),
      },
      { id: "open-security", label: "Open security center", group: "System", keywords: "2fa sessions password", action: go("/private/security") },
      { id: "open-ai", label: "Open AI providers", group: "System", keywords: "llm model provider openrouter assistant", action: go("/private/ai-providers") },
      { id: "open-settings", label: "Open site settings", group: "System", keywords: "feature flags maintenance assistant", action: go("/private/settings") },
      { id: "logout", label: "Log out", group: "System", keywords: "sign out exit", action: () => void logout() },
    ];
  }, [navigate, logout, triageCount, location.pathname]);

  if (checking) {
    return (
      <div className="ctl-login-wrap">
        <div className="ctl-login-card" aria-label="Loading">
          <div className="ctl-brand-mark">H</div>
          <p className="ctl-muted ctl-loading-note">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Login
          onSuccess={(u) => {
            setUser({ ...u, totpEnabled: u.totpEnabled ?? false });
            refreshUnread();
          }}
        />
      </ToastProvider>
    );
  }

  const currentPath = location.pathname.replace(/\/+$/, "") || "/";
  const title = TITLES[currentPath] ?? "Control";
  const initial = (user.email?.[0] ?? "A").toUpperCase();
  const isActive = (n: NavItem) => (n.end ? location.pathname === n.path : location.pathname.startsWith(n.path));

  const nav = (
    <>
      <Link to="/private" className="ctl-brand" aria-label="Harsh Control overview">
        <span className="ctl-brand-mark">H</span>
        <span className="ctl-brand-name">Harsh // Control<small>PORTFOLIO OS</small></span>
      </Link>
      {NAV_GROUPS.map((g) => (
        <nav key={g.label} aria-label={g.label}>
          <div className="ctl-nav-label" title={g.label}>{g.label}</div>
          {g.items.filter((n) => !n.adminOnly || user.role === "ADMIN").map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`ctl-nav-item${isActive(n) ? " active" : ""}`}
              aria-current={isActive(n) ? "page" : undefined}
              title={n.label}
            >
              <span className="ctl-nav-ico"><AdminIcon name={n.icon as React.ComponentProps<typeof AdminIcon>["name"]} /></span>
              <span className="ctl-nav-text">{n.label}</span>
              {n.badge && unread > 0 && <span className="ctl-nav-badge" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ))}
        </nav>
      ))}
      <div className="ctl-sidebar-foot">
        <div className="ctl-userchip" title={user.email}>
          <span className="ctl-avatar" aria-hidden="true">{initial}</span>
          <div className="ctl-min-w-0">
            <b className="ctl-userchip-email">{user.displayName || user.email}</b>
            <span>{user.role} · {user.totpEnabled ? "2FA on" : "2FA off"}</span>
          </div>
          <span className="ctl-session-dot" title="Session active" />
        </div>
        <div className="ctl-foot-row">
          <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/" aria-label="View public site"><AdminIcon name="external" size={16} /><span>Public site</span></Link>
          <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void logout()} aria-label="Log out"><AdminIcon name="logout" size={16} /><span>Log out</span></button>
        </div>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <a className="ctl-skip" href="#ctl-main">Skip to content</a>
      <div className={`ctl-shell${sidebarCollapsed ? " ctl-shell--collapsed" : ""}`}>
        <aside className="ctl-sidebar" aria-label="Control navigation">{nav}</aside>
        {drawer && (
          <>
            <button type="button" className="ctl-drawer-backdrop" onClick={closeDrawer} aria-label="Close navigation" />
            <aside ref={drawerRef as React.RefObject<HTMLElement>} className="ctl-drawer" role="dialog" aria-modal="true" aria-label="Control navigation">
              <div className="ctl-drawer-head">
                <span className="ctl-brand-name">Harsh // Control</span>
                <button type="button" className="ctl-icon-btn" onClick={closeDrawer} aria-label="Close navigation"><AdminIcon name="close" /></button>
              </div>
              {nav}
            </aside>
          </>
        )}
        <div className="ctl-body">
          <header className="ctl-topbar">
            <button
              ref={menuButtonRef}
              type="button"
              className="ctl-menu-btn"
              onClick={() => {
                if (!compactNav) setSidebarCollapsed((value) => !value);
                else setDrawer(true);
              }}
              aria-label={compactNav ? "Open navigation" : (sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar")}
              aria-expanded={compactNav ? drawer : !sidebarCollapsed}
            ><AdminIcon name="panel" /></button>
            <nav className="ctl-crumbs" aria-label="Breadcrumb">
              <Link to="/private">Control</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{title}</span>
            </nav>
            <div className="ctl-topbar-right">
              <button
                type="button"
                className="ctl-cmdk-btn"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
              >
                <AdminIcon name="search" /> <span>Search or command…</span> <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
              </button>
              <div className="ctl-new-wrap" id="ctl-new-menu">
                <button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" onClick={() => setNewMenu((v) => !v)} aria-expanded={newMenu} aria-haspopup="menu">
                  <AdminIcon name="plus" size={16} /><span>New</span>
                </button>
                {newMenu && (
                  <div className="ctl-new-menu" role="menu" aria-label="Create new">
                    {QUICK_CREATE.map((q) => (
                      <button key={q.path} type="button" role="menuitem" onClick={() => { setNewMenu(false); navigate(q.path); }}>
                        {q.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setNewMenu(false);
                        if (!location.pathname.startsWith("/private/media")) navigate("/private/media");
                        window.setTimeout(() => {
                          if (!adminBus.requestUpload()) document.getElementById("ctl-media-upload")?.click();
                        }, 150);
                      }}
                    >
                      Upload media
                    </button>
                  </div>
                )}
              </div>
              {unread > 0 && (
                <Link to="/private/messages" className="ctl-btn ctl-btn--secondary ctl-btn--sm ctl-unread-link" aria-label={`${unread} unread messages`}>
                  <AdminIcon name="messages" size={16} /><span>{unread} new</span>
                </Link>
              )}
              <Link
                to="/private/security"
                className={`ctl-btn ctl-btn--ghost ctl-btn--sm${user.totpEnabled ? "" : " ctl-btn--warn"}`}
                title={user.totpEnabled ? "Two-factor on" : "Two-factor off — enable in Security"}
              >
                <AdminIcon name={user.totpEnabled ? "security" : "alert"} size={16} /><span>{user.totpEnabled ? "2FA on" : "2FA off"}</span>
              </Link>
              <div className="ctl-user-menu-wrap" ref={userMenuRef}>
                <button type="button" className="ctl-avatar-btn" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu} aria-haspopup="menu" aria-label={`Account: ${user.email}`}>
                  <span className="ctl-avatar" aria-hidden="true">{initial}</span>
                </button>
                {userMenu && (
                  <div className="ctl-user-menu" role="menu" aria-label="Account">
                    <div className="ctl-user-menu-account">
                      {user.displayName && <div className="ctl-user-menu-name">{user.displayName}</div>}
                      <div>{user.email}</div>
                      <div>{user.role}</div>
                    </div>
                    <Link role="menuitem" to="/private/security" onClick={() => setUserMenu(false)}>Security center</Link>
                    <Link role="menuitem" to="/" onClick={() => setUserMenu(false)}><AdminIcon name="external" size={16} />View public site</Link>
                    <button type="button" role="menuitem" className="danger" onClick={() => { setUserMenu(false); void logout(); }}><AdminIcon name="logout" size={16} />Log out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="ctl-main" id="ctl-main">
            <Suspense fallback={<div className="ctl-route-loading" role="status"><span className="ctl-loading-dot" />Loading section…</div>}>
              <Routes>
                <Route index element={<Overview onUnreadChange={refreshUnread} />} />
                <Route path="projects" element={<ProjectsAdmin />} />
                <Route path="certificates" element={<CertificatesAdmin />} />
                <Route path="skills" element={<SkillsAdmin />} />
                <Route path="timeline" element={<TimelineAdmin />} />
                <Route path="education" element={<EducationAdmin />} />
                <Route path="profile" element={<ProfileAdmin />} />
                <Route path="messages" element={<MessagesAdmin onChange={refreshUnread} />} />
                <Route path="media" element={<MediaAdmin />} />
                <Route path="security" element={<SecurityCenter onSessionChange={() => undefined} />} />
                <Route path="ai-providers" element={<AiProvidersAdmin />} />
                <Route path="settings" element={<SettingsAdmin />} />
                <Route path="audit" element={<AuditAdmin />} />
                <Route path="*" element={<Navigate to="/private" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </ToastProvider>
  );
}
