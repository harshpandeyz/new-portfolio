# Portfolio — Security Model

## Principles

1. **Discovery is not access control.** The private entry (Ctrl+Shift+H, `/private`,
   the subtle exit-section link) only *reveals the login*. Every privileged request is
   authorized server-side, per request.
2. **No secrets in the frontend.** The SPA contains no credentials, tokens, or keys.
   Admin state is never derived from client-side storage.
3. **Fail closed, log everything.** Mutations require an authenticated ADMIN session +
   CSRF proof; every mutation and login attempt is written to the audit log.

## Authentication

- Passwords hashed with **bcrypt (12 rounds)**; hashes never leave the server
- Sessions are opaque 256-bit random tokens; **only the SHA-256 hash is stored** (`sessions.token_hash`)
- Cookie: `hp_session` — **HTTP-only**, `SameSite=None` + `Secure` in production (for credentialed requests from a separately hosted SPA), path-scoped, 7-day expiry
- Sliding `last_seen_at` refresh; expired sessions purged hourly
- Login responses are constant-shape (dummy bcrypt compare) to blunt user-enumeration timing
- Login rate limit: 8 attempts / 15 min / IP → `429` + `Retry-After`

## CSRF

Double-submit with HMAC binding: at login the API returns a token and sets a readable
`hp_csrf` cookie. An authenticated `/api/auth/csrf` refresh endpoint supports a
cross-origin SPA after a page reload. The token is `nonce.HMAC(nonce, SESSION_SECRET)`;
all authenticated mutating requests, including multipart media upload, must send
`x-csrf-token` matching the cookie and a valid signature (timing-safe compares).

## Authorization

`requireAdmin` resolves the session → loads the user → enforces `role === "ADMIN"` on
every admin route (projects, certificates, skills, timeline, education, profile,
messages, media, audit, analytics). There is no client-trusted role.

## Input handling

- Every payload validated with **zod** schemas shared between client and server
  (`@hp/shared`) → `400` with field-level issues
- Body limit 2 MB JSON; uploads capped by `MAX_UPLOAD_MB` (streamed, then re-verified by size)
- Upload allow-list: jpeg/png/webp/avif/gif/pdf/mp4/webm; filenames sanitized
  (`[^a-zA-Z0-9._-]` stripped, length-capped) and re-issued server-side
- Contact form: honeypot field (silent `202` for bots), 5 msgs / 10 min / IP,
  3 msgs / hour / email, stored emails lowercased

## Transport & headers

- `@fastify/helmet`: `X-Content-Type-Options: nosniff`, strict `Referrer-Policy`,
  cross-origin resource policy for static uploads
- CORS: explicit origin allow-list (from `APP_URL`), `credentials: true` — no wildcard
- `trustProxy` is configured as a **bounded hop count** (`TRUST_PROXY`, default `1`) so a
  direct client cannot spoof `X-Forwarded-For` to rotate its IP identity and bypass rate
  limits. Only the expected reverse-proxy hops are trusted; set `0`/`false` when the API is
  exposed directly, or pass a comma-separated IP/CIDR list to trust specific proxies.

## Rate limits (in-memory fixed window)

| Surface | Limit |
| --- | --- |
| Login | 8 / 15 min / IP |
| Contact | 5 / 10 min / IP (+3/h/email) |
| Chat | 12 / min / IP |
| Analytics events | 30 / min / IP |

Single-instance memory store; swap for Redis when scaling horizontally
(see `src/utils/rate-limit.ts`).

## Audit & observability

`audit_logs` records actor (operator email), action (`auth.login`,
`project.create`, `contact.received`, `media.upload`, …), entity, IP and timestamp.
Failed logins are audited too. Structured pino logging in production.

## Known limitations (honest)

- Rate limiting and session store are in-process → run one API instance or add Redis
- Uploads are content-type + size validated, not deep-scanned for malware
- No 2FA on the operator account (add TOTP before exposing publicly on a shared host)
- The chat honesty guard is heuristic (lexical); the strict no-hallucination system
  prompt + UNKNOWN fallback bound the failure mode, but no RAG system is perfect
