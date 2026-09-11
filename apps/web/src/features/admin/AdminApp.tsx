import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { CommandPalette, ToastProvider } from "./ui";
import type { PaletteCommand } from "./ui";
import { adminBus } from "./bus";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useScrollLock } from "../../hooks/useScrollLock";

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

interface AdminUser {
  email: string;
  role: string;
  displayName: string | null;
  totpEnabled: boolean;
}

function NavIcon({ kind }: { kind: string }) {
  const p = {
    width: 16, height: 16, viewBox: "0 0 16 16", fill: "none",
    stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "overview": return (<svg {...p} aria-hidden="true"><path d="M2 8l6-5 6 5v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" /><path d="M6 13v-4h4v4" /></svg>);
    case "projects": return (<svg {...p} aria-hidden="true"><rect x="2" y="2.5" width="12" height="11" rx="2" /><path d="M2 6h12M6 6v7.5" /></svg>);
    case "certs": return (<svg {...p} aria-hidden="true"><circle cx="8" cy="6" r="3.5" /><path d="M6 9l-2 5 4-2 4 2-2-5" /></svg>);
    case "skills": return (<svg {...p} aria-hidden="true"><path d="M8 1.8l5.5 3.2v6L8 14.2 2.5 11V5z" /><path d="M8 5.5v5M5.5 7l5 2M10.5 7l-5 2" /></svg>);
    case "timeline": return (<svg {...p} aria-hidden="true"><path d="M8 2v12M4 4.5h8M4 11.5h8" /><circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" /></svg>);
    case "education": return (<svg {...p} aria-hidden="true"><path d="M8 2.5L2 5.5 8 8.5l6-3z" /><path d="M4 7v3.5c0 1 1.8 2 4 2s4-1 4-2V7M13 5.5V11" /></svg>);
    case "profile": return (<svg {...p} aria-hidden="true"><circle cx="8" cy="5.5" r="2.8" /><path d="M2.8 13.5c.8-2.6 2.8-4 5.2-4s4.4 1.4 5.2 4" /></svg>);
    case "messages": return (<svg {...p} aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="2" /><path d="M2.5 4.5L8 9l5.5-4.5" /></svg>);
    case "media": return (<svg {...p} aria-hidden="true"><rect x="2" y="3" width="12" height="10" rx="2" /><circle cx="5.5" cy="6.5" r="1.2" /><path d="M2.5 11.5l3.5-3 2.5 2 2-1.5 3 2.5" /></svg>);
    case "security": return (<svg {...p} aria-hidden="true"><path d="M8 1.8l5 2v4c0 3-2 5.4-5 6.4-3-1-5-3.4-5-6.4v-4z" /><path d="M6 8l1.5 1.5L10.5 6" /></svg>);
    case "settings": return (<svg {...p} aria-hidden="true"><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6L11 5M5 11l-1.4 1.4" /></svg>);
    case "audit": return (<svg {...p} aria-hidden="true"><path d="M3 4h10M3 8h10M3 12h6" /><circle cx="12.5" cy="12" r="1.5" /></svg>);
    default: return (<svg {...p} aria-hidden="true"><circle cx="8" cy="8" r="5" /></svg>);
  }
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
  { label: "Home", items: [{ path: "/private", label: "Overview", icon: "overview", keywords: "home dashboard attention", end: true }] },
  {
    label: "Content",
    items: [
      { path: "/private/projects", label: "Projects", icon: "projects", keywords: "work portfolio case studies" },
      { path: "/private/certificates", label: "Certificates", icon: "certs", keywords: "credentials courses" },
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
    label: "System",
    items: [
      { path: "/private/security", label: "Security", icon: "security", keywords: "2fa sessions password auth" },
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [triageCount, setTriageCount] = useState(0);
  const [userMenu, setUserMenu] = useState(false);
  const [newMenu, setNewMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const drawerRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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
      const tag = (e.target as HTMLElement).tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape" && !paletteOpen) {
        setDrawer(false);
        setUserMenu(false);
        setNewMenu(false);
      } else if (!inField && e.key === "/") {
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

  useFocusTrap(drawerRef as React.RefObject<HTMLElement | null>, drawer, () => setDrawer(false));
  useScrollLock(drawer);

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
      { id: "open-settings", label: "Open site settings", group: "System", keywords: "feature flags maintenance assistant", action: go("/private/settings") },
      { id: "logout", label: "Log out", group: "System", keywords: "sign out exit", action: () => void logout() },
    ];
  }, [navigate, logout, triageCount, location.pathname]);

  if (checking) {
    return (
      <div className="ctl-login-wrap">
        <div className="ctl-login-card" aria-label="Loading">
          <div className="ctl-brand-mark">H</div>
          <p style={{ marginTop: 12, color: "#5b6472", fontSize: 13 }}>Verifying session…</p>
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

  const title = TITLES[location.pathname] ?? "Control";
  const initial = (user.email?.[0] ?? "A").toUpperCase();
  const isActive = (n: NavItem) => (n.end ? location.pathname === n.path : location.pathname.startsWith(n.path));

  const nav = (
    <>
      <Link to="/" className="ctl-brand" aria-label="Harsh Control home">
        <span className="ctl-brand-mark">H</span>
        <span className="ctl-brand-name">Harsh // Control<small>PORTFOLIO OS</small></span>
      </Link>
      {NAV_GROUPS.map((g) => (
        <nav key={g.label} aria-label={g.label}>
          <div className="ctl-nav-label">{g.label}</div>
          {g.items.filter((n) => !n.adminOnly || user.role === "ADMIN").map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`ctl-nav-item${isActive(n) ? " active" : ""}`}
              aria-current={isActive(n) ? "page" : undefined}
            >
              <span className="ctl-nav-ico" aria-hidden="true"><NavIcon kind={n.icon} /></span>
              {n.label}
              {n.badge && unread > 0 && <span className="ctl-nav-badge">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ))}
        </nav>
      ))}
      <div className="ctl-sidebar-foot">
        <div className="ctl-userchip" title={user.email}>
          <span className="ctl-avatar" aria-hidden="true">{initial}</span>
          <div style={{ minWidth: 0 }}>
            <b className="ctl-userchip-email">{user.displayName || user.email}</b>
            <span>{user.role} · {user.totpEnabled ? "2FA on" : "2FA off"}</span>
          </div>
          <span className="ctl-session-dot" title="Session active" />
        </div>
        <div className="ctl-foot-row">
          <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/security" style={{ flex: 1, justifyContent: "center" }}>Security</Link>
          <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/" style={{ flex: 1, justifyContent: "center" }}>Public site</Link>
          <button type="button" className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void logout()} style={{ flex: 1, justifyContent: "center" }}>Log out</button>
        </div>
      </div>
    </>
  );

  return (
    <ToastProvider>
      <div className="ctl-shell">
        <aside className="ctl-sidebar" aria-label="Control navigation">{nav}</aside>
        {drawer && (
          <>
            <div className="ctl-drawer-backdrop" onClick={() => setDrawer(false)} />
            <nav ref={drawerRef as React.RefObject<HTMLElement>} className="ctl-drawer" aria-label="Control navigation">
              <div className="ctl-drawer-head">
                <span className="ctl-brand-name">Harsh // Control</span>
                <button type="button" className="ctl-icon-btn" onClick={() => setDrawer(false)} aria-label="Close navigation">×</button>
              </div>
              {nav}
            </nav>
          </>
        )}
        <div className="ctl-body">
          <header className="ctl-topbar">
            <button type="button" className="ctl-menu-btn" onClick={() => setDrawer(true)} aria-label="Open navigation" aria-expanded={drawer}>☰</button>
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
                <span aria-hidden="true">⌕</span> Search or command… <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
              </button>
              <div className="ctl-new-wrap" id="ctl-new-menu">
                <button type="button" className="ctl-btn ctl-btn--primary ctl-btn--sm" onClick={() => setNewMenu((v) => !v)} aria-expanded={newMenu} aria-haspopup="menu">
                  + New
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
                <Link to="/private/messages" className="ctl-btn ctl-btn--secondary ctl-btn--sm" aria-label={`${unread} unread messages`}>
                  ✉ {unread} new
                </Link>
              )}
              <Link
                to="/private/security"
                className={`ctl-btn ctl-btn--ghost ctl-btn--sm${user.totpEnabled ? "" : " ctl-btn--warn"}`}
                title={user.totpEnabled ? "Two-factor on" : "Two-factor off — enable in Security"}
              >
                {user.totpEnabled ? "2FA on" : "2FA off"}
              </Link>
              <div className="ctl-user-menu-wrap" ref={userMenuRef}>
                <button type="button" className="ctl-avatar-btn" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu} aria-haspopup="menu" aria-label={`Account: ${user.email}`}>
                  <span className="ctl-avatar" aria-hidden="true">{initial}</span>
                </button>
                {userMenu && (
                  <div className="ctl-user-menu" role="menu" aria-label="Account">
                    <div style={{ padding: "8px 12px", fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {user.displayName && <div style={{ fontWeight: 700, color: "#16181d" }}>{user.displayName}</div>}
                      <div>{user.email}</div>
                      <div>{user.role}</div>
                    </div>
                    <Link role="menuitem" to="/private/security" onClick={() => setUserMenu(false)}>Security center</Link>
                    <Link role="menuitem" to="/" onClick={() => setUserMenu(false)}>View public site</Link>
                    <button type="button" role="menuitem" className="danger" onClick={() => { setUserMenu(false); void logout(); }}>Log out</button>
                  </div>
                )}
              </div>
            </div>
          </header>
          <main className="ctl-main" id="ctl-main">
            <Suspense fallback={<div role="status" style={{ color: "#6b7280" }}>Loading section…</div>}>
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
