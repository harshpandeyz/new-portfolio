import type { FastifyReply, FastifyRequest } from "fastify";

import { HttpError } from "../../utils/http.js";
import { resolveSessionUser, type AuthenticatedUser } from "./session.js";

export type AdminRole = "ADMIN" | "EDITOR" | "VIEWER";

export type Permission =
  | "content:read"
  | "content:write"
  | "messages:read"
  | "messages:write"
  | "messages:delete"
  | "media:read"
  | "media:write"
  | "audit:read"
  | "security:manage"
  | "users:manage";

/**
 * Explicit permission matrix. Server is the source of truth — the frontend
 * hiding links grants nothing.
 *
 * ADMIN  — everything
 * EDITOR — content management (projects, certs, skills, timeline, education,
 *          profile, media, message triage). No user management, no message
 *          hard-delete, no permission changes.
 * VIEWER — read-only admin access (lists, detail, audit read).
 */
const ROLE_PERMISSIONS: Record<AdminRole, Set<Permission>> = {
  ADMIN: new Set<Permission>([
    "content:read",
    "content:write",
    "messages:read",
    "messages:write",
    "messages:delete",
    "media:read",
    "media:write",
    "audit:read",
    "security:manage",
    "users:manage",
  ]),
  EDITOR: new Set<Permission>([
    "content:read",
    "content:write",
    "messages:read",
    "messages:write",
    "media:read",
    "media:write",
    "audit:read",
    "security:manage",
  ]),
  VIEWER: new Set<Permission>(["content:read", "messages:read", "media:read", "audit:read", "security:manage"]),
};

function normalizeRole(role: string): AdminRole {
  if (role === "ADMIN" || role === "EDITOR" || role === "VIEWER") return role;
  return "VIEWER";
}

export function hasPermission(role: string, permission: Permission): boolean {
  return ROLE_PERMISSIONS[normalizeRole(role)]?.has(permission) ?? false;
}

export function permissionsFor(role: string): Permission[] {
  return [...(ROLE_PERMISSIONS[normalizeRole(role)] ?? [])];
}

async function resolveAdmin(req: FastifyRequest): Promise<AuthenticatedUser> {
  const user = await resolveSessionUser(req);
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  req.admin = user;
  return user;
}

export function requirePermission(permission: Permission) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = await resolveAdmin(req);
    if (!hasPermission(user.role, permission)) {
      throw new HttpError(403, "FORBIDDEN", "Insufficient permissions");
    }
  };
}

/** Any authenticated admin user (ADMIN | EDITOR | VIEWER). */
export const requireViewer = requirePermission("content:read");
/** Content editors and admins. */
export const requireEditor = requirePermission("content:write");
/** Admins only. */
export async function requireAdminRole(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveAdmin(req);
  if (normalizeRole(user.role) !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Administrator role required");
  }
}

export { normalizeRole };
