import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { api } from "../../lib/api";
import { CommandPalette, ToastProvider, type PaletteCommand } from "./ui";
import { adminBus } from "./bus";

import { Login } from "./Login";
import { Overview } from "./Overview";

const ProjectsAdmin = lazy(() => import("./ProjectsAdmin").then((m) => ({ default: m.ProjectsAdmin })));
const CertificatesAdmin = lazy(() => import("./CertificatesAdmin").then((m) => ({ default: m.CertificatesAdmin })));
const SkillsAdmin = lazy(() => import("./SkillsAdmin").then((m) => ({ default: m.SkillsAdmin })));
const TimelineAdmin = lazy(() => import("./TimelineAdmin").then((m) => ({ default: m.TimelineAdmin })));
const ProfileAdmin = lazy(() => import("./ProfileAdmin").then((m) => ({ default: m.ProfileAdmin })));
const MessagesAdmin = lazy(() => import("./MessagesAdmin").then((m) => ({ default: m.MessagesAdmin })));
const MediaAdmin = lazy(() => import("./MediaAdmin").then((m) => ({ default: m.MediaAdmin })));
const AuditAdmin = lazy(() => import("./AuditAdmin").then((m) => ({ default: m.AuditAdmin })));
const SecurityCenter = lazy(() => import("./SecurityCenter").then((m) => ({ default: m.SecurityCenter })));

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
}

const NAV_GROUPS: { label: string | null; items: NavItem[] }[] = [
  { label: null, items: [{ path: "/private", label: "Overview", icon: "◈", keywords: "home dashboard attention", end: true }] },
  {
    label: "Work",
    items: [
      { path: "/private/projects", label: "Projects", icon: "▦", keywords: "work portfolio case studies" },
      { path: "/private/certificates", label: "Certificates", icon: "❖", keywords: "credentials courses" },
      { path: "/private/skills", label: "Skills", icon: "⬡", keywords: "stack capabilities tech" },
      { path: "/private/timeline", label: "Timeline", icon: "◐", keywords: "journey history milestones" },
      { path: "/private/profile", label: "Profile", icon: "●", keywords: "bio identity socials resume" },
    ],
  },
  {
    label: "Inbox",
    items: [
      { path: "/private/messages", label: "Messages", icon: "✉", keywords: "inbox contact mail", badge: true },
      { path: "/private/media", label: "Media", icon: "▣", keywords: "files uploads images library" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/private/security", label: "Security", icon: "⬢", keywords: "2fa sessions password auth" },
      { path: "/private/audit", label: "Audit log", icon: "≣", keywords: "history trail events" },
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
  "/private/profile": "Profile",
  "/private/media": "Media",
  "/private/security": "Security",
  "/private/audit": "Audit log",
};

function ensureNoIndex() {
  let tag = document.querySelector('meta[name="robots"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "robots");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", "noindex, nofollow, noarchive");
}

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform);

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [unread, setUnread] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [triageCount, setTriageCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

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
  }, [location.pathname]);

  // Expired session: API returns 401 — send back to login cleanly.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener("hp:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hp:unauthorized", onUnauthorized);
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    navigate("/private", { replace: true });
  }, [navigate]);

  // Global ⌘K / Ctrl+K palette + Escape closes drawer.
  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setTriageCount(adminBus.getTriage()?.selectedCount ?? 0);
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape") {
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user]);

  const commands: PaletteCommand[] = useMemo(() => {
    const go = (path: string) => () => navigate(path);
    const nav: PaletteCommand[] = NAV_GROUPS.flatMap((g) =>
      g.items.map((n) => ({
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
      { id: "new-project", label: "New project", group: "Create", keywords: "add project work", action: () => navigate("/private/projects?new=1") },
      { id: "new-cert", label: "New certificate", group: "Create", keywords: "add credential", action: () => navigate("/private/certificates?new=1") },
      { id: "new-skill", label: "New skill", group: "Create", keywords: "add capability stack", action: () => navigate("/private/skills?new=1") },
      { id: "new-timeline", label: "New timeline entry", group: "Create", keywords: "add milestone journey", action: () => navigate("/private/timeline?new=1") },
      {
        id: "upload-media",
        label: "Upload media",
        group: "Create",
        keywords: "file image upload library",
        action: () => {
          if (!location.pathname.startsWith("/private/media")) navigate("/private/media");
          window.setTimeout(() => adminBus.requestUpload(), 150);
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
      { id: "logout", label: "Log out", group: "System", keywords: "sign out exit", action: () => void logout() },
    ];
  }, [navigate, logout, triageCount, location.pathname, paletteOpen]);

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
        <div key={g.label ?? "top"}>
          {g.label && <div className="ctl-nav-label">{g.label}</div>}
          {g.items.map((n) => (
            <Link
              key={n.path}
              to={n.path}
              className={`ctl-nav-item${isActive(n) ? " active" : ""}`}
              aria-current={isActive(n) ? "page" : undefined}
            >
              <span className="ctl-nav-ico" aria-hidden="true">{n.icon}</span>
              {n.label}
              {n.badge && unread > 0 && <span className="ctl-nav-badge">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          ))}
        </div>
      ))}
      <div className="ctl-sidebar-foot">
        <div className="ctl-userchip" title={user.email}>
          <span className="ctl-avatar" aria-hidden="true">{initial}</span>
          <div style={{ minWidth: 0 }}>
            <b className="ctl-userchip-email">{user.email}</b>
            <span>{user.role} · {user.totpEnabled ? "2FA on" : "2FA off"}</span>
          </div>
          <span className="ctl-session-dot" title="Session active" />
        </div>
        <div className="ctl-foot-row">
          <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/security" style={{ flex: 1, justifyContent: "center" }}>Security</Link>
          <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/" style={{ flex: 1, justifyContent: "center" }}>Public site</Link>
          <button className="ctl-btn ctl-btn--ghost ctl-btn--sm" onClick={() => void logout()} style={{ flex: 1, justifyContent: "center" }}>Log out</button>
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
            <nav className="ctl-drawer" aria-label="Control navigation">
              <div className="ctl-drawer-head">
                <span className="ctl-brand-name">Harsh // Control</span>
                <button className="ctl-icon-btn" onClick={() => setDrawer(false)} aria-label="Close navigation">×</button>
              </div>
              {nav}
            </nav>
          </>
        )}
        <div className="ctl-body">
          <header className="ctl-topbar">
            <button className="ctl-menu-btn" onClick={() => setDrawer(true)} aria-label="Open navigation">☰</button>
            <span className="ctl-topbar-title">Control / <b>{title}</b></span>
            <div className="ctl-topbar-right">
              <button
                className="ctl-cmdk-btn"
                onClick={() => {
                  setTriageCount(adminBus.getTriage()?.selectedCount ?? 0);
                  setPaletteOpen(true);
                }}
                aria-label="Open command palette"
              >
                <span aria-hidden="true">⌕</span> Search or command… <kbd>{isMac ? "⌘K" : "Ctrl+K"}</kbd>
              </button>
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
                {user.totpEnabled ? "⬢ 2FA on" : "⬢ 2FA off"}
              </Link>
            </div>
          </header>
          <main className="ctl-main">
            <Suspense fallback={<p style={{ color: "#6b7280" }}>Loading…</p>}>
              <Routes>
                <Route index element={<Overview onUnreadChange={refreshUnread} />} />
                <Route path="projects" element={<ProjectsAdmin />} />
                <Route path="certificates" element={<CertificatesAdmin />} />
                <Route path="skills" element={<SkillsAdmin />} />
                <Route path="timeline" element={<TimelineAdmin />} />
                <Route path="profile" element={<ProfileAdmin />} />
                <Route path="messages" element={<MessagesAdmin onChange={refreshUnread} />} />
                <Route path="media" element={<MediaAdmin />} />
                <Route path="security" element={<SecurityCenter onSessionChange={() => undefined} />} />
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
