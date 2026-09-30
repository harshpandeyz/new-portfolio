import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import type { AiProvider, Profile, SystemStats } from "@hp/shared";
import { api } from "../../lib/api";
import { AdminIcon } from "./Icon";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHead,
  formatTimeAgo,
  friendlyError,
  isTestMessage,
} from "./ui";

const RANGE_OPTIONS = ["7", "30", "90"] as const;
type Range = (typeof RANGE_OPTIONS)[number];

interface AnalyticsSummary {
  days: number;
  since: string;
  eventCounts: { type: string; count: number }[];
  previousEventCounts: { type: string; count: number }[];
  daily: { day: string; count: number }[];
  projectPerformance: { slug: string; title: string; count: number }[];
}

type WorkspaceData = Awaited<ReturnType<typeof api.admin.overview>>;
type SecurityData = Awaited<ReturnType<typeof api.securityOverview>>;
type ProviderData = Awaited<ReturnType<typeof api.admin.aiProviders>>;

function countOf(events: { type: string; count: number }[] | undefined, type: string) {
  return events?.find((event) => event.type === type)?.count ?? 0;
}

function deltaLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "No activity in either period" : "New activity; no prior baseline";
  const delta = Math.round(((current - previous) / previous) * 100);
  return `${delta > 0 ? "+" : ""}${delta}% vs previous period`;
}

function humanizeAction(action: string, entity: string) {
  const known: Record<string, string> = {
    AUTH_LOGIN_SUCCESS: "Signed in",
    AUTH_LOGIN_FAILURE: "Sign-in attempt failed",
    AUTH_LOGOUT: "Signed out",
    AUTH_SESSION_CREATED: "Session created",
    AUTH_SESSION_REVOKED: "Session revoked",
    AUTH_2FA_ENABLED: "Two-factor authentication enabled",
    AUTH_2FA_DISABLED: "Two-factor authentication disabled",
    AUTH_PASSWORD_CHANGED: "Password changed",
    SETTINGS_UPDATED: "Site settings updated",
    MESSAGE_STATUS_CHANGED: "Message status changed",
    MESSAGE_REPLIED: "Replied to a message",
    MESSAGE_DELETED: "Message deleted",
    MEDIA_UPLOADED: "Media uploaded",
    MEDIA_REPLACED: "Media replaced",
    MEDIA_DELETED: "Media deleted",
    CONTENT_CREATED: `Created ${entity.replaceAll("_", " ")}`,
    CONTENT_UPDATED: `Updated ${entity.replaceAll("_", " ")}`,
    CONTENT_DELETED: `Deleted ${entity.replaceAll("_", " ")}`,
  };
  return known[action] ?? action.toLowerCase().replaceAll("_", " ");
}

function TrafficChart({ days, data }: { days: number; data: { day: string; count: number }[] }) {
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(0, ...data.map((row) => row.count));
  const points = data.map((row, index) => {
    const x = data.length < 2 ? 500 : (index / (data.length - 1)) * 1000;
    const y = max === 0 ? 138 : 138 - (row.count / max) * 104;
    return { ...row, x, y };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const area = points.length ? `${line} L1000 148 L0 148 Z` : "";
  const labels = [points[0], points[Math.floor((points.length - 1) / 2)], points.at(-1)].filter((point, i, list) => point && list.findIndex((candidate) => candidate?.day === point.day) === i);
  const period = `${days} days`;

  if (total === 0) {
    return <EmptyState title="No page views in this range" desc={`Page views will appear here when analytics events are recorded for the last ${period}.`} />;
  }

  return (
    <div>
      <svg className="ctl-chart" viewBox="0 0 1000 160" role="img" aria-label={`${total} page views in the last ${period}. The chart shows daily page views.`} preserveAspectRatio="none">
        <title>Daily page views for the last {period}</title>
        <defs>
          <linearGradient id="ctl-chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ctl-blue)" stopOpacity=".18" />
            <stop offset="100%" stopColor="var(--ctl-blue)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[34, 86, 138].map((y) => <line key={y} className="ctl-chart-grid" x1="0" x2="1000" y1={y} y2={y} />)}
        <path className="ctl-chart-area" d={area} />
        <path className="ctl-chart-line" d={line} />
        {points.filter((_, index) => index === 0 || index === points.length - 1 || (data.length <= 14 && index % 2 === 0)).map((point) => (
          <circle key={point.day} className="ctl-chart-point" cx={point.x} cy={point.y} r="3.5">
            <title>{new Date(`${point.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}: {point.count} page views</title>
          </circle>
        ))}
      </svg>
      <div className="ctl-chart-labels" aria-hidden="true">
        {labels.map((point) => point && <span key={point.day}>{new Date(`${point.day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" })}</span>)}
      </div>
      <table className="sr-only">
        <caption>Daily page views for the last {period}</caption>
        <tbody>{data.map((row) => <tr key={row.day}><th scope="row">{row.day}</th><td>{row.count}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Widget({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ctl-card ctl-widget" aria-label={title}>
      <div className="ctl-widget-head"><h3>{title}</h3>{action}</div>
      {children}
    </section>
  );
}

export function Overview({ onUnreadChange }: { onUnreadChange: () => void }) {
  const [range, setRange] = useState<Range>("30");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providers, setProviders] = useState<ProviderData | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const loadStats = useCallback(async (signal: AbortSignal) => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const result = await api.stats(signal);
      if (!signal.aborted) setStats(result);
    } catch (error) {
      if (!signal.aborted) setStatsError(friendlyError(error, "Couldn't load portfolio counts."));
    } finally {
      if (!signal.aborted) setStatsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (signal: AbortSignal) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const result = await api.admin.analytics(Number(range) as 7 | 30 | 90, signal);
      if (!signal.aborted) setAnalytics(result);
    } catch (error) {
      if (!signal.aborted) setAnalyticsError(friendlyError(error, "Couldn't load traffic activity."));
    } finally {
      if (!signal.aborted) setAnalyticsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStats(controller.signal);
    return () => controller.abort();
  }, [loadStats]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  useEffect(() => {
    const controller = new AbortController();
    setWorkspaceError(null);
    void Promise.allSettled([
      api.admin.overview(controller.signal),
      api.securityOverview(controller.signal),
      api.profile(controller.signal),
      api.admin.aiProviders(controller.signal),
    ]).then((results) => {
      if (controller.signal.aborted) return;
      const [activity, secure, publicProfile, ai] = results;
      if (activity.status === "fulfilled") {
        setWorkspace(activity.value);
        onUnreadChange();
      } else setWorkspaceError(friendlyError(activity.reason, "Couldn't load recent activity."));
      if (secure.status === "fulfilled") setSecurity(secure.value);
      if (publicProfile.status === "fulfilled") setProfile(publicProfile.value.profile);
      if (ai.status === "fulfilled") setProviders(ai.value);
    });
    return () => controller.abort();
  }, [onUnreadChange]);

  const rangeDays = Number(range);
  const currentAnalytics = analytics?.days === rangeDays ? analytics : null;
  const events = currentAnalytics?.eventCounts;
  const previous = currentAnalytics?.previousEventCounts;
  const pageViews = countOf(events, "page_view");
  const projectViews = countOf(events, "project_view");
  const contactSubmissions = countOf(events, "contact_submit");
  const unread = stats?.unreadMessages ?? 0;
  const visibleMessages = (workspace?.recentMessages ?? []).filter((message) => !isTestMessage(message));
  const recentActivity = workspace?.recentAudit ?? [];
  const activeProviders = providers?.providers.filter((provider) => provider.enabled) ?? [];
  const providerErrors = activeProviders.filter((provider) => provider.health === "error");

  const profileItems = useMemo(() => {
    if (!profile) return null;
    const checks = [
      Boolean(profile.name?.trim()), Boolean(profile.headline?.trim()), Boolean(profile.bio?.trim()),
      Boolean(profile.location?.trim()), Boolean(profile.email?.trim()), Boolean(profile.avatarUrl),
      Boolean(profile.resumeUrl), (profile.socials?.length ?? 0) > 0,
    ];
    return { done: checks.filter(Boolean).length, total: checks.length, percent: Math.round((checks.filter(Boolean).length / checks.length) * 100) };
  }, [profile]);

  if (statsError && !stats) {
    return <><PageHead title="Overview" desc="What is happening, what changed, and what needs attention." /><ErrorState message={statsError} onRetry={() => { const controller = new AbortController(); void loadStats(controller.signal); }} /></>;
  }

  const rangeLabel = `${range}d`;
  const eventLabels: Record<string, string> = {
    page_view: "Page views", project_view: "Project views", certificate_view: "Certificate views",
    contact_submit: "Contact submissions", recruiter_view: "Recruiter briefings", resume_download: "Résumé downloads",
    resume_view: "Résumé views", chat_query: "Assistant questions", interview_turn: "Interview turns",
  };
  const breakdown = (events ?? []).filter((event) => event.count > 0).sort((a, b) => b.count - a.count);

  return (
    <>
      <PageHead
        title="Overview"
        desc="What is happening, what changed, and what needs attention."
        actions={<Link className="ctl-btn ctl-btn--primary" to="/private/projects?new=1"><AdminIcon name="plus" size={16} />New project</Link>}
      />

      {(unread > 0 || (security && !security.totpEnabled) || providerErrors.length > 0) ? (
        <div className="ctl-attention-list" aria-label="Needs attention">
          {unread > 0 && <Link to="/private/messages?status=NEW" className="ctl-attention"><span className="ctl-attention-count">{unread > 99 ? "99+" : unread}</span><div><b>{unread} unread message{unread === 1 ? "" : "s"}</b><span>Review the inbox and reply when needed.</span></div></Link>}
          {security && !security.totpEnabled && <Link to="/private/security" className="ctl-attention ctl-attention--warn"><AdminIcon name="alert" /><div><b>Two-factor authentication is off</b><span>Enable it from the Security Center.</span></div></Link>}
          {providerErrors.length > 0 && <Link to="/private/ai-providers" className="ctl-attention ctl-attention--warn"><AdminIcon name="alert" /><div><b>{providerErrors.length} enabled provider{providerErrors.length === 1 ? " has" : "s have"} a reported error</b><span>Open AI providers to inspect the latest health check.</span></div></Link>}
        </div>
      ) : security ? (
        <div className="ctl-attention ctl-attention--clear" role="status"><AdminIcon name="check" /><div><b>Nothing needs immediate attention.</b><span>Security and configured AI providers are available below.</span></div></div>
      ) : null}

      <div className="ctl-grid-4" aria-busy={statsLoading || analyticsLoading}>
        <Link className="ctl-card ctl-stat" to="/private/messages"><span>UNREAD MESSAGES</span><b>{statsLoading ? "—" : unread}</b><small>{stats ? `${stats.contactMessages} total in inbox` : "Inbox status"}</small><span className="ctl-stat-link">Open inbox</span></Link>
        <div className="ctl-card ctl-stat"><span>PAGE VIEWS · {rangeLabel}</span><b>{analyticsLoading && !currentAnalytics ? "—" : pageViews.toLocaleString()}</b><small>{currentAnalytics ? deltaLabel(pageViews, countOf(previous, "page_view")) : "Selected period"}</small></div>
        <div className="ctl-card ctl-stat"><span>PROJECT VIEWS · {rangeLabel}</span><b>{analyticsLoading && !currentAnalytics ? "—" : projectViews.toLocaleString()}</b><small>{currentAnalytics ? deltaLabel(projectViews, countOf(previous, "project_view")) : "Selected period"}</small></div>
        <div className="ctl-card ctl-stat"><span>CONTACT SUBMISSIONS · {rangeLabel}</span><b>{analyticsLoading && !currentAnalytics ? "—" : contactSubmissions.toLocaleString()}</b><small>{currentAnalytics ? deltaLabel(contactSubmissions, countOf(previous, "contact_submit")) : "Selected period"}</small></div>
      </div>

      <div className="ctl-grid-2">
        <Widget title="Page views" action={<div className="ctl-segment" role="group" aria-label="Traffic date range">{RANGE_OPTIONS.map((value) => <button key={value} type="button" className={`ctl-seg-btn${range === value ? " active" : ""}`} aria-pressed={range === value} onClick={() => setRange(value)}>{value} days</button>)}</div>}>
          {analyticsLoading && !currentAnalytics ? <div className="ctl-skeleton"><span /><span /><span /></div> : analyticsError ? <ErrorState message={analyticsError} onRetry={() => { const controller = new AbortController(); void loadAnalytics(controller.signal); }} /> : currentAnalytics ? <TrafficChart days={rangeDays} data={currentAnalytics.daily} /> : null}
        </Widget>
        <Widget title="Recorded activity" action={<span className="ctl-hint">Last {rangeDays} days</span>}>
          {analyticsLoading && !currentAnalytics ? <div className="ctl-skeleton"><span /><span /><span /></div> : analyticsError ? <p className="ctl-muted">Activity breakdown unavailable.</p> : breakdown.length ? <div className="ctl-event-breakdown">{breakdown.map((event) => <div className="ctl-event-item" key={event.type}><span>{eventLabels[event.type] ?? event.type.replaceAll("_", " ")}</span><b>{event.count.toLocaleString()}</b></div>)}</div> : <EmptyState title="No events yet" desc="Privacy-conscious events appear here when visitors use the portfolio." />}
        </Widget>
      </div>

      <div className="ctl-grid-2 ctl-overview-section">
        <Widget title="Project performance · views" action={<Link to="/private/projects" className="ctl-stat-link">Manage projects</Link>}>
          {analyticsLoading && !currentAnalytics ? <div className="ctl-skeleton"><span /><span /><span /></div> : currentAnalytics?.projectPerformance.length ? <div className="ctl-project-performance">{currentAnalytics.projectPerformance.map((project) => {
            const max = currentAnalytics.projectPerformance[0]?.count || 1;
            return <Link key={project.slug} to="/private/projects"><b>{project.title}</b><span>{project.count.toLocaleString()} views</span><div className="ctl-performance-bar" aria-hidden="true"><i style={{ width: `${Math.round((project.count / max) * 100)}%` }} /></div></Link>;
          })}</div> : <EmptyState title="No project views in this range" desc="Project detail views are recorded by the public portfolio." />}
        </Widget>

        <Widget title="Recent messages" action={<Link to="/private/messages" className="ctl-stat-link">Open inbox</Link>}>
          {workspace ? visibleMessages.length ? <div className="ctl-activity-list">{visibleMessages.slice(0, 5).map((message) => <Link className="ctl-activity-row" key={message.id} to={`/private/messages?open=${message.id}`}><div><b>{message.subject?.trim() || "New contact message"}</b><span>{message.name}</span></div><time dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{formatTimeAgo(message.createdAt)}</time></Link>)}</div> : <EmptyState title="No recent messages" desc="New contact submissions will appear here." /> : workspaceError ? <ErrorState message={workspaceError} /> : <div className="ctl-skeleton"><span /><span /><span /></div>}
        </Widget>
      </div>

      <div className="ctl-grid-2 ctl-overview-section">
        <Widget title="Recent activity" action={<Link to="/private/audit" className="ctl-stat-link">Full audit log</Link>}>
          {workspace ? recentActivity.length ? <div className="ctl-activity-list">{recentActivity.slice(0, 6).map((entry) => <div className="ctl-activity-row" key={entry.id}><div><b>{humanizeAction(entry.action, entry.entity)}</b><span>{entry.entity.replaceAll("_", " ")}{entry.actor && entry.actor !== "system" ? ` · ${entry.actor}` : ""}</span></div><time dateTime={entry.createdAt} title={new Date(entry.createdAt).toLocaleString()}>{formatTimeAgo(entry.createdAt)}</time></div>)}</div> : <EmptyState title="No activity yet" desc="Content edits and security events will appear here." /> : workspaceError ? <ErrorState message={workspaceError} /> : <div className="ctl-skeleton"><span /><span /><span /></div>}
        </Widget>

        <Widget title="Portfolio health" action={<Link to="/private/security" className="ctl-stat-link">Security center</Link>}>
          <div className="ctl-health-list">
            <div className="ctl-health-row"><span><AdminIcon name="profile" size={16} />Profile completeness</span>{profileItems ? <Link to="/private/profile"><b>{profileItems.percent}%</b><span className="ctl-profile-progress"><i style={{ width: `${profileItems.percent}%` }} /></span></Link> : <span className="ctl-hint">Not available</span>}</div>
            <div className="ctl-health-row"><span><AdminIcon name="security" size={16} />Account security</span>{security ? <Link to="/private/security"><Badge tone={security.totpEnabled ? "green" : "amber"}>{security.totpEnabled ? "2FA enabled" : "2FA off"}</Badge><small>{security.activeSessions} active session{security.activeSessions === 1 ? "" : "s"}</small></Link> : <span className="ctl-hint">Not available</span>}</div>
            <div className="ctl-health-row"><span><AdminIcon name="ai" size={16} />Assistant providers</span>{providers ? <Link to="/private/ai-providers"><Badge tone={providerErrors.length ? "red" : activeProviders.length ? "green" : "neutral"}>{providerErrors.length ? "Needs review" : activeProviders.length ? `${activeProviders.length} enabled` : "Knowledge base only"}</Badge><small>{providers.envFallback.configured ? "Environment fallback configured" : "No environment fallback"}</small></Link> : <span className="ctl-hint">Not configured or unavailable</span>}</div>
          </div>
        </Widget>
      </div>

      <div className="ctl-quickactions" aria-label="Quick actions">
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/certificates?new=1"><AdminIcon name="plus" size={15} />Certificate</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/timeline?new=1"><AdminIcon name="plus" size={15} />Timeline entry</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/education?new=1"><AdminIcon name="plus" size={15} />Education</Link>
        <Link className="ctl-btn ctl-btn--ghost ctl-btn--sm" to="/private/media"><AdminIcon name="upload" size={15} />Upload media</Link>
      </div>
    </>
  );
}
