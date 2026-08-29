import type {
  Profile, Project, Certificate, Skill, Education, TimelineItem,
  SystemStats, ChatReply, GithubOverview, AuditLogEntry, ContactMessage, MediaAsset,
} from "@hp/shared";

// Keep same-origin as the default, while allowing the static site and API to
// live on separate production origins without changing the API surface.
const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

/** Resolve frontend-owned and API-owned media from one place. */
export function resolveMediaUrl(url?: string | null, apiOrigin = BASE): string {
  if (!url) return "";
  if (/^(?:[a-z]+:|data:|blob:)/i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return path.startsWith("/api/") || path.startsWith("/static/") ? `${apiOrigin.replace(/\/$/, "")}${path}` : path;
}

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

let csrfToken = "";

function getCsrfToken(): string {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(?:^|;\s*)hp_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]!) : "";
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const method = (rest.method ?? "GET").toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";
  const headers: Record<string, string> = {
    ...(json !== undefined ? { "content-type": "application/json" } : {}),
    ...(mutating && getCsrfToken() ? { "x-csrf-token": getCsrfToken() } : {}),
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = await res.json().catch(() => ({}));
  if (typeof (data as { csrfToken?: unknown }).csrfToken === "string") {
    csrfToken = (data as { csrfToken: string }).csrfToken;
  }
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? "ERROR", (data as { message?: string }).message ?? res.statusText, (data as { details?: unknown }).details);
  }
  return data as T;
}

export const api = {
  // public
  profile: () => request<{ profile: Profile }>("/api/profile"),
  projects: (params?: { tier?: string; featured?: boolean }) =>
    request<{ projects: Project[] }>(`/api/projects?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`),
  project: (slug: string) => request<{ project: Project }>(`/api/projects/${slug}`),
  certificates: (params?: { category?: string; search?: string; page?: number }) =>
    request<{ certificates: Certificate[]; total: number; page: number }>(`/api/certificates?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]))}`),
  skills: () => request<{ skills: Skill[] }>("/api/skills"),
  education: () => request<{ items: Education[] }>("/api/education"),
  timeline: () => request<{ items: TimelineItem[] }>("/api/timeline"),
  stats: () => request<SystemStats>("/api/stats"),
  chat: (message: string) => request<ChatReply>("/api/chat", { method: "POST", json: { message } }),
  chatSuggestions: () => request<{ suggestions: string[] }>("/api/chat/suggestions"),
  github: () => request<GithubOverview & { error?: string }>("/api/github/overview"),
  track: (type: string, ref?: string) =>
    request("/api/events", { method: "POST", json: { type, ref } }).catch(() => undefined),
  contact: (input: { name: string; email: string; subject?: string; message: string; company?: string }) =>
    request<{ ok: boolean }>("/api/contact", { method: "POST", json: input }),

  // auth
  login: (email: string, password: string) =>
    request<{ ok: boolean; csrfToken: string; user: { email: string; role: string } }>("/api/auth/login", { method: "POST", json: { email, password } }),
  me: () => request<{ user: { id: string; email: string; role: string; displayName: string | null } }>("/api/auth/me"),
  csrf: () => request<{ csrfToken: string }>("/api/auth/csrf"),
  logout: async () => {
    const result = await request<{ ok: boolean }>("/api/auth/logout", { method: "POST", json: {} });
    csrfToken = "";
    return result;
  },

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

    messages: (params?: { status?: string; page?: number }) =>
      request<{ messages: ContactMessage[]; total: number; unread: number }>(`/api/contact?${new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))}`),
    setMessageStatus: (id: string, status: string) => request(`/api/contact/${id}/status`, { method: "PATCH", json: { status } }),
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

    audit: (page = 1) => request<{ logs: AuditLogEntry[]; total: number }>(`/api/stats/audit?page=${page}`),
    analytics: () => request<{ last30Days: { type: string; count: number }[]; daily: { day: string; count: number }[] }>("/api/events/summary"),
  },
};

export { ApiError };
