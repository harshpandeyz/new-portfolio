import type { FastifyReply, FastifyRequest } from "fastify";

import { HttpError } from "../../utils/http.js";
import { resolveSessionUser, type AuthenticatedUser } from "./session.js";

export type AdminRole = "ADMIN";

// Route labels remain explicit at call sites, while the production model has
// one principal: the owner administrator. Legacy database role values grant
// no permissions and are not admitted by resolveSessionUser.
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

export function normalizeRole(role: string): AdminRole | null {
  return role === "ADMIN" ? "ADMIN" : null;
}

export function hasPermission(role: string, _permission: Permission): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function permissionsFor(role: string): Permission[] {
  if (normalizeRole(role) !== "ADMIN") return [];
  return [
    "content:read", "content:write", "messages:read", "messages:write", "messages:delete",
    "media:read", "media:write", "audit:read", "security:manage", "users:manage",
  ];
}

async function resolveAdmin(req: FastifyRequest): Promise<AuthenticatedUser> {
  const user = await resolveSessionUser(req);
  if (!user) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
  req.admin = user;
  return user;
}

export function requirePermission(_permission: Permission) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    await resolveAdmin(req);
  };
}

export const requireViewer = requirePermission("content:read");
export const requireEditor = requirePermission("content:write");

export async function requireAdminRole(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await resolveAdmin(req);
  if (normalizeRole(user.role) !== "ADMIN") {
    throw new HttpError(403, "FORBIDDEN", "Administrator role required");
  }
}
