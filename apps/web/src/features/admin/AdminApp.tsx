import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { api } from "../../lib/api";

import { Login } from "./Login";
import { Overview } from "./Overview";
import { ProjectsAdmin } from "./ProjectsAdmin";
import { CertificatesAdmin } from "./CertificatesAdmin";
import { SkillsAdmin } from "./SkillsAdmin";
import { TimelineAdmin } from "./TimelineAdmin";
import { ProfileAdmin } from "./ProfileAdmin";
import { MessagesAdmin } from "./MessagesAdmin";
import { MediaAdmin } from "./MediaAdmin";
import { AuditAdmin } from "./AuditAdmin";

interface AdminUser {
  email: string;
  role: string;
  displayName: string | null;
}

const NAV = [
  { path: "/private", label: "OVERVIEW", end: true },
  { path: "/private/projects", label: "PROJECTS" },
  { path: "/private/certificates", label: "CERTIFICATES" },
  { path: "/private/skills", label: "SKILLS" },
  { path: "/private/timeline", label: "TIMELINE" },
  { path: "/private/profile", label: "PROFILE" },
  { path: "/private/messages", label: "MESSAGES", badge: true },
  { path: "/private/media", label: "MEDIA" },
  { path: "/private/audit", label: "AUDIT" },
];

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [unread, setUnread] = useState(0);
  const location = useLocation();

  const refreshUnread = useCallback(() => {
    api.admin
      .messages({ status: "NEW" })
      .then((r) => setUnread(r.total))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api
      .me()
      .then((r) => {
        setUser(r.user);
        return api.csrf();
      })
      .then(() => {
        refreshUnread();
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, [refreshUnread]);

  useEffect(() => {
    document.title = "HARSH // CONTROL";
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: "100svh", display: "grid", placeItems: "center" }}>
        <span className="mono mono-dim">VERIFYING SESSION…</span>
      </div>
    );
  }

  if (!user) {
    return <Login onSuccess={(u) => { setUser(u); refreshUnread(); }} />;
  }

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  };

  return (
    <div className="admin-root">
      <aside className="admin-rail">
        <Link to="/" className="brand" style={{ fontSize: 13 }}>
          HARSH<b>//</b>CONTROL
        </Link>
        {NAV.map((n) => (
          <Link
            key={n.path}
            to={n.path}
            className={`admin-nav-item${(n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)) ? " active" : ""}`}
          >
            {n.label}
            {n.badge && unread > 0 && <span className="admin-unread">{unread}</span>}
          </Link>
        ))}
        <div className="admin-rail-foot">
          <span className="mono mono-dim" style={{ fontSize: 9 }}>{user.email}</span>
          <button className="btn btn-sm" onClick={logout}>LOG OUT</button>
          <Link className="btn btn-sm btn-ghost" to="/">← PUBLIC SITE</Link>
        </div>
      </aside>

      <main className="admin-main">
        <Routes>
          <Route index element={<Overview onUnreadChange={refreshUnread} />} />
          <Route path="projects" element={<ProjectsAdmin />} />
          <Route path="certificates" element={<CertificatesAdmin />} />
          <Route path="skills" element={<SkillsAdmin />} />
          <Route path="timeline" element={<TimelineAdmin />} />
          <Route path="profile" element={<ProfileAdmin />} />
          <Route path="messages" element={<MessagesAdmin onChange={refreshUnread} />} />
          <Route path="media" element={<MediaAdmin />} />
          <Route path="audit" element={<AuditAdmin />} />
          <Route path="*" element={<Navigate to="/private" replace />} />
        </Routes>
      </main>
    </div>
  );
}
