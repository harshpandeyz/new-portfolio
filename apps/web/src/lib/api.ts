import type {
  Profile, Project, Certificate, Skill, Education, TimelineItem,
  SystemStats, ChatReply, GithubOverview, AuditLogEntry, ContactMessage, MediaAsset,
} from "@hp/shared";

// Keep same-origin as the default, while allowing the static site and API to
// live on separate production origins without changing the API surface.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

const DEFAULT_TIMEOUT = 15_000;
const CHAT_TIMEOUT = 60_000;

/** Resolve frontend-owned and API-owned media from one place. */
export function resolveMediaUrl(url?: string | null, apiOrigin = BASE): string {
  if (!url) return "";
  if (/^(?:[a-z]+:|data:|blob:)/i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return path.startsWith("/api/") || path.startsWith("/static/") ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }

  get isAborted(): boolean {
    return this.code === "ABORTED";
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500 && this.status !== 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get retryable(): boolean {
    return this.isNetwork || this.isAborted || this.status === 429 || this.isServerError;
  }
}

let csrfToken = "";

function getCsrfToken(): string {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|;\s*)hp_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : "";
}

export interface RequestInitWithJson extends RequestInit {
  json?: unknown;
  /** Timeout in ms. Set to 0 to disable. */
  timeout?: number;
}

async function request<T>(path: string, init?: RequestInitWithJson): Promise<T> {
  const { json, timeout = DEFAULT_TIMEOUT, signal: callerSignal, ...rest } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";
  const headers: Record<string, string> = {
    ...(json !== undefined ? { "content-type": "application/json" } : {}),
    ...(mutating && getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
    ...((rest.headers as Record<string, string>) ?? {}),
  };

  const controller = new AbortController();
  const internalSignal = controller.signal;

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timeout > 0) {
    timer = setTimeout(() => controller.abort(), timeout);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      credentials: "include",
      headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      signal: internalSignal,
    });
  } catch (err) {
    if (timer !== undefined) clearTimeout(timer);
    if (internalSignal.aborted && !callerSignal?.aborted) {
      throw new ApiError(0, "TIMEOUT", "Request timed out. Please try again.");
    }
    if (internalSignal.aborted) {
      throw new ApiError(0, "ABORTED", "Request was cancelled.");
    }
    throw new ApiError(0, "NETWORK", "Network error. Please check your connection and try again.");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (typeof (data as { csrfToken?: unknown }).csrfToken === "string") {
    csrfToken = (data as { csrfToken: string }).csrfToken;
  }
  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data as { error?: string }).error ?? "ERROR",
      (data as { message?: string }).message ?? res.statusText,
      (data as { details?: unknown }).details,
    );
  }
  return data as T;
}

export const api = {
  // public
  profile: (signal?: AbortSignal) =>
    request<{ profile: Profile }>("/api/profile", { signal }),
  projects: (params?: { tier?: string; featured?: boolean }, signal?: AbortSignal) =>
    request<{ projects: Project[] }>(
      `/api/projects?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`,
      { signal },
    ),
  project: (slug: string, signal?: AbortSignal) =>
    request<{ project: Project }>(`/api/projects/${slug}`, { signal }),
  certificates: (params?: { category?: string; search?: string; page?: number }, signal?: AbortSignal) =>
    request<{ certificates: Certificate[]; total: number; page: number }>(
      `/api/certificates?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`,
      { signal },
    ),
  skills: (signal?: AbortSignal) =>
    request<{ skills: Skill[] }>("/api/skills", { signal }),
  education: (signal?: AbortSignal) =>
    request<{ items: Education[] }>("/api/education", { signal }),
  timeline: (signal?: AbortSignal) =>
    request<{ items: TimelineItem[] }>("/api/timeline", { signal }),
  stats: (signal?: AbortSignal) =>
    request<SystemStats>("/api/stats", { signal }),
  chat: (message: string, signal?: AbortSignal) =>
    request<ChatReply>("/api/chat", { method: "POST", json: { message }, signal, timeout: CHAT_TIMEOUT }),
  chatSuggestions: (signal?: AbortSignal) =>
    request<{ suggestions: string[] }>("/api/chat/suggestions", { signal }),
  github: (signal?: AbortSignal) =>
    request<GithubOverview & { error?: string }>("/api/github/overview", { signal }),
  track: (type: string, ref?: string) =>
    request("/api/events", { method: "POST", json: { type, ref }, timeout: 5_000 }).catch(() => undefined),
  contact: (input: { name: string; email: string; subject?: string; message: string; company?: string }) =>
    request<{ ok: boolean }>("/api/contact", { method: "POST", json: input }),

  // auth (password step may return 202 + challenge when 2FA is enabled)
  login: (email: string, password: string) =>
    request<{ ok: boolean; csrfToken?: string; requires2FA?: boolean; challenge?: string; user?: { email: string; role: string; totpEnabled?: boolean } }>("/api/auth/login", { method: "POST", json: { email, password } }),
  login2fa: (challenge: string, code: string) =>
    request<{ ok: boolean; csrfToken: string; user: { email: string; role: string } }>("/api/auth/login/2fa", { method: "POST", json: { challenge, code } }),
  me: () => request<{ user: { id: string; email: string; role: string; displayName: string | null; totpEnabled: boolean } }>("/api/auth/me"),
  csrf: () => request<{ csrfToken: string }>("/api/auth/csrf"),
  logout: async () => {
    const result = await request<{ ok: boolean }>("/api/auth/logout", { method: "POST", json: {} });
    csrfToken = "";
    return result;
  },
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>("/api/auth/change-password", { method: "POST", json: { currentPassword, newPassword } }),
  reauth: (password: string, code?: string) =>
    request<{ ok: boolean; reauthAt: string }>("/api/auth/reauth", { method: "POST", json: { password, code } }),
  sessions: () =>
    request<{ sessions: { id: string; current: boolean; ip: string | null; userAgent: string | null; device: string; createdAt: string; lastSeenAt: string; expiresAt: string; revoked: boolean }[] }>("/api/auth/sessions"),
  revokeSession: (id: string) => request<{ ok: boolean }>(`/api/auth/sessions/${id}`, { method: "DELETE" }),
  revokeOtherSessions: () => request<{ ok: boolean }>("/api/auth/sessions/revoke-others", { method: "POST", json: {} }),
  revokeAllSessions: () => request<{ ok: boolean }>("/api/auth/sessions/revoke-all", { method: "POST", json: {} }),
  twofaStatus: () => request<{ enabled: boolean; enabledAt: string | null; recoveryRemaining: number }>("/api/auth/2fa/status"),
  twofaSetup: () => request<{ secret: string; otpauthUrl: string; qrDataUrl: string | null }>("/api/auth/2fa/setup", { method: "POST", json: {} }),
  twofaEnable: (code: string) => request<{ ok: boolean; recoveryCodes: string[] }>("/api/auth/2fa/enable", { method: "POST", json: { code } }),
  twofaDisable: () => request<{ ok: boolean }>("/api/auth/2fa/disable", { method: "POST", json: {} }),
  twofaRegenCodes: () => request<{ ok: boolean; recoveryCodes: string[] }>("/api/auth/2fa/recovery/regenerate", { method: "POST", json: {} }),
  securityOverview: () =>
    request<{ email: string; role: string; displayName: string | null; passwordChangedAt: string | null; totpEnabled: boolean; totpEnabledAt: string | null; recoveryCodesRemaining: number; activeSessions: number; lastLoginAt: string | null }>("/api/auth/security/overview"),

  // admin CRUD
  admin: {
    projects: () => request<{ projects: Project[] }>("/api/projects"),
    createProject: (input: unknown) => request<{ project: Project }>("/api/projects", { method: "POST", json: input }),
    updateProject: (id: string, input: unknown) => request<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", json: input }),
    deleteProject: (id: string) => request(`/api/projects/${id}`, { method: "DELETE" }),

    certificates: (params?: { search?: string; category?: string; page?: number }) =>
      request<{ certificates: Certificate[]; total: number }>(`/api/certificates?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`),
    createCertificate: (input: unknown) => request<{ certificate: Certificate }>("/api/certificates", { method: "POST", json: input }),
    updateCertificate: (id: string, input: unknown) => request<{ certificate: Certificate }>(`/api/certificates/${id}`, { method: "PATCH", json: input }),
    deleteCertificate: (id: string) => request(`/api/certificates/${id}`, { method: "DELETE" }),

    skills: () => request<{ skills: Skill[] }>("/api/skills"),
    createSkill: (input: unknown) => request<{ skill: Skill }>("/api/skills", { method: "POST", json: input }),
    updateSkill: (id: string, input: unknown) => request<{ skill: Skill }>(`/api/skills/${id}`, { method: "PATCH", json: input }),
    deleteSkill: (id: string) => request(`/api/skills/${id}`, { method: "DELETE" }),

    timeline: () => request<{ items: TimelineItem[] }>("/api/timeline"),
    createTimeline: (input: unknown) => request<{ item: TimelineItem }>("/api/timeline", { method: "POST", json: input }),
    updateTimeline: (id: string, input: unknown) => request<{ item: TimelineItem }>(`/api/timeline/${id}`, { method: "PATCH", json: input }),
    deleteTimeline: (id: string) => request(`/api/timeline/${id}`, { method: "DELETE" }),

    education: () => request<{ items: Education[] }>("/api/education"),
    createEducation: (input: unknown) => request<{ item: Education }>("/api/education", { method: "POST", json: input }),
    updateEducation: (id: string, input: unknown) => request<{ item: Education }>(`/api/education/${id}`, { method: "PATCH", json: input }),
    deleteEducation: (id: string) => request(`/api/education/${id}`, { method: "DELETE" }),

    profile: () => request<{ profile: Profile }>("/api/profile"),
    updateProfile: (input: unknown) => request<{ profile: Profile }>("/api/profile", { method: "PATCH", json: input }),

    messages: (params?: { status?: string; page?: number; q?: string; sort?: string }) =>
      request<{ messages: ContactMessage[]; total: number; unread: number; page: number; pageSize: number }>(`/api/contact?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`),
    message: (id: string) => request<{ message: ContactMessage }>(`/api/contact/${id}`),
    setMessageStatus: (id: string, status: string) => request(`/api/contact/${id}/status`, { method: "PATCH", json: { status } }),
    bulkMessageStatus: (ids: string[], status: string) => request<{ ok: boolean; count: number }>("/api/contact/bulk/status", { method: "POST", json: { ids, status } }),
    bulkMessageDelete: (ids: string[]) => request<{ ok: boolean; count: number }>("/api/contact/bulk/delete", { method: "POST", json: { ids } }),
    deleteMessage: (id: string) => request(`/api/contact/${id}`, { method: "DELETE" }),

    media: () => request<{ assets: MediaAsset[] }>("/api/media"),
    uploadMedia: async (file: File, onProgress?: (pct: number) => void): Promise<MediaAsset> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const form = new FormData();
        form.append("file", file);
        xhr.open("POST", `${BASE}/api/media`);
        xhr.withCredentials = true;
        const token = getCsrfToken();
        if (token) xhr.setRequestHeader("x-csrf-token", token);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (typeof data.csrfToken === "string") csrfToken = data.csrfToken;
            if (xhr.status >= 200 && xhr.status < 300) resolve(data.asset);
            else reject(new ApiError(xhr.status, data.error, data.message));
          } catch {
            reject(new ApiError(xhr.status, "PARSE", "Unexpected response"));
          }
        };
        xhr.onerror = () => reject(new ApiError(0, "NETWORK", "Upload failed"));
        xhr.send(form);
      });
    },
    deleteMedia: (id: string) => request(`/api/media/${id}`, { method: "DELETE" }),

    audit: (params?: { page?: number; pageSize?: number; q?: string; action?: string; entity?: string; sort?: string }) =>
      request<{ logs: AuditLogEntry[]; total: number; page: number; pageSize: number }>(`/api/stats/audit?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`),
    securityEvents: () => request<{ logs: AuditLogEntry[] }>("/api/stats/security-events"),
    overview: () => request<{ recentMessages: ContactMessage[]; recentAudit: AuditLogEntry[] }>("/api/stats/overview"),
    analytics: () => request<{ last30Days: { type: string; count: number }[]; daily: { day: string; count: number }[] }>("/api/events/summary"),
  },
};
