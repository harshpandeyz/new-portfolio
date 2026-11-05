# Portfolio Complete Audit, Repair & Production-Readiness Report

Date: 2026-11-06. Scope: entire repository, verified locally with Docker Compose.
Target production topology: **Netlify (frontend) + Render (API + managed PostgreSQL)**.
Prior Oracle/Caddy production path is preserved untouched (docs/DEPLOYMENT.md).

---

## 1. Executive summary

- Audited frontend, backend, database, security, infrastructure, dependencies and docs.
- Fixed **all CRITICAL and HIGH findings** that could be fixed safely without data loss or
  external credentials, plus most MEDIUM findings.
- The previously reported homepage failure (`Some content is temporarily unavailable`) is
  **resolved and root-caused** (dead DB container + missing roles + split-brain networks).
- **One self-inflicted data-loss incident occurred during this audit** (see §10): a
  `prisma migrate diff --shadow-database-url=<dev-db>` invocation emptied the local
  development database. It was recovered from a pre-existing snapshot database found in the
  same cluster, with small documented gaps. Guardrails were added so it cannot recur.
- Verified end state: `npm ci` from lockfile, typecheck, lint, 23 web + 66 API tests green,
  production builds within budget, compose stack healthy, `/api/public/home` 200 with real
  data, CORS/authz/rate-limit behavior verified, `npm audit` clean (0 vulnerabilities).
- E2E (Playwright) was **not executed**: no browsers installed in this environment, and the
  admin-acceptance spec mutates data. Unit + API integration coverage passes instead.

## 2. Architecture discovered (derived from source)

- `apps/web` — React 18 + Vite 6 + TypeScript SPA, react-router-dom 7. Same-origin-by-default
  API client (`VITE_API_URL` empty → Vite dev proxy / nginx `/api`+`/static` proxy; set for
  split origins). DB-driven content via `GET /api/public/home` + lazy `/api/timeline`.
  Code-split admin (`/private/*`), chat widget, SEO prerender plugin (`seo-routes.json` →
  per-route HTML, sitemap, robots).
- `apps/api` — Fastify 5 + TypeScript. Cookie-session auth (DB-backed, HMAC double-submit
  CSRF), TOTP 2FA with recovery codes, login challenges, per-IP/per-account rate limits in
  Postgres (no Redis), Resend-HTTPS or SMTP mail, local-disk media with magic-byte checks,
  retrieval-backed chat with pluggable AI providers (AES-256-GCM keys).
- `apps/api/prisma` — PostgreSQL 16 via Prisma 5. Single-tenant ADMIN model; least-privilege
  runtime roles (`hp_app`) + migrator role (`hp_migrator`) created by
  `deploy/postgres/create-app-roles.sql` (initdb or manual).
- `packages/shared` — zod schemas + types shared by both sides.
- Infra — `docker-compose.yml` (db/api/web/migrate, private `app_net`), Dockerfiles
  (node:24 / nginx:1.27), nginx reverse-proxy, Caddy + systemd + OCI backups on the
  Oracle host. New: `render.yaml` (API + managed PG), `netlify.toml` (static + SPA + headers).

## 3. All defects identified (severity at discovery)

### CRITICAL
1. **Dead database container** — `portfolio-db-1` exited 127 for 45h: stored bind-mount of
   `scripts/init-test-db.sql` (a path absent from current compose) collided with a stray
   **empty directory** of the same name on the host. API returned 500 on `/api/public/home`
   → homepage banner. (Also the exact prior incident.)
2. **Missing `hp_app`/`hp_migrator` roles + grants** — volume predates the roles script;
   API could not authenticate to Postgres after the container was recreated.
3. **Split-brain Docker networks** — `web` on stale `portfolio_default`, `api`/`db` on
   `portfolio_app_net` → nginx 502 on the browser path.
4. **No Render backup story** — `backup.sh`/`restore.sh`/systemd/OCI/`age` cannot run on
   Render (documented; Render automatic PG backups + snapshots are the replacement).

### HIGH
5. Analytics/audit/session-purge missing composite indexes; unbounded public lists.
6. Redundant `@@index` on `@unique` columns (User.email, Project.slug).
7. Migration history absent on the local DB (`_prisma_migrations` missing — schema created
   outside Migrate) → every `migrate deploy` failed P3005.
8. nginx immutable 1-year cache applied to **unhashed** files (favicon, case images, PDFs).
9. `seo-routes.json` missing flagship slugs `senseline` + `shopsphere` (no static page/SEO).
10. No per-page `og:image` in the static prerender (all pages shared one image, no dimensions).
11. `validate-production-env.mjs` not wired into Render pre-deploy; Netlify build skipped
    `validate-site-url.mjs`; validator didn't check SMTP completeness.
12. `COMPOSE_API_APP_URL`, `E2E_*`, volume/image naming vars undocumented.

### MEDIUM
13. Missing rate limits: `profile PATCH`, `ai-providers DELETE`/`rotate`; no uniform
    `retry-after` (only some routes set it).
14. Trust-proxy default derived from `COOKIE_SAMESITE` flag (network trust coupled to cookie mode).
15. `TEST_MODE=1` not refused in production images.
16. Honeypot returned a distinguishable 202 shape (bot oracle).
17. Reauth `code` length unbounded; provider rotate key length unbounded above.
18. `pruneExpiredVersions()` ran writes on media GET.
19. Console logging in background paths instead of request loggers.
20. nginx `/static/` proxy missing timeouts/buffering for large video.
21. Compose web build only forwarded `VITE_SITE_URL` (WhatsApp/split-API unbunnable locally).
22. Dead frontend files (`Badge`, `Skeleton`, `useMediaQuery`), dead timeline slice in `data.tsx`.
23. Command-palette combobox aria, static skill-tile `aria-label`, `window.open` noreferrer.
24. Credential PDF viewer: infinite spinner on failure, no retry.
25. Chat widget: 429 shown as generic error.
26. SEO baseline gaps: `og:site_name/locale/image:width/height/alt`, `twitter:image:alt`,
    theme-color mismatch (`#0a0a0f` vs `#F5F5F7`), sitemap without `lastmod`.
27. Docs claimed digest-pinned images + `platform: linux/arm64` (no longer true).
28. `.env.example` tracked a real personal email as example values.
29. `ADMIN_EMAIL` default suggested seeding (container never reads it).
30. E2E gaps (2FA enable, revoke-others/all, AI provider flows, split-origin, mail paths).
31. `STORAGE_DRIVER`/`CERTIFICATES_SOURCE_DIR`/`API_URL` documented-but-dead knobs.

### LOW (fixed or noted)
32. `ProjectArchive` nested-interactive claim — **false positive** (link is a sibling).
33. Console-error-prone patterns, TOC id races, skeleton inconsistency — reviewed, no change needed.
34. Unused `VITE_API_PORT` doc, `allowScripts` version skew, `qrcode` exact pins.

## 4. Exact files modified

- `apps/api/src/config.ts` — PORT fallback; trust-proxy decoupled from cookie flag (host
  signals only); TEST_MODE=1 refused under production; multi-origin APP_URL validation.
- `apps/api/src/utils/http.ts` — `rateLimited()` helper (retry-after in details).
- `apps/api/src/app.ts` — central `retry-after` header mapping; maintenance sweep also
  prunes media versions.
- `apps/api/src/modules/{skills,certificates,timeline,education,projects,settings,ai-providers,contact,media}/routes.ts`
  — 429s converted to `rateLimited()` (uniform backoff).
- `apps/api/src/modules/profile/routes.ts` — added missing write rate limit.
- `apps/api/src/modules/ai-providers/routes.ts` — DELETE/rotate rate limits; rotate key ≤500 chars.
- `apps/api/src/modules/contact/routes.ts` — honeypot returns exact success shape (201).
- `apps/api/src/modules/auth/routes.ts` — reauth code length guard.
- `apps/api/src/modules/auth/session.ts` — shared cookie options (already done previously).
- `apps/api/src/modules/media/routes.ts` — exported `pruneExpiredVersions()`; removed
  read-path pruning.
- `apps/api/prisma/schema.prisma` + `migrations/20261106000000_add_query_indexes/` —
  12 composite indexes; dropped 5 redundant indexes.
- `apps/api/tests/api.spec.ts` — honeypot contract updated; retry-after assertions added.
- `apps/web/vite.config.ts` — per-page `image` support + og:image tags; sitemap `<lastmod>`.
- `apps/web/index.html` — site_name/locale/image dimensions/alt tags.
- `apps/web/seo-routes.json` — added `senseline` + `shopsphere` (titles/descriptions from DB).
- `apps/web/nginx.conf` — immutable cache scoped to `/assets/`; 7-day revalidating cache for
  unhashed static files; `/static/` proxy timeouts/buffering.
- `apps/web/src/...` — deleted dead `Badge`/`Skeleton`/`useMediaQuery`; TechStack aria;
  CommandPalette combobox attrs; CredentialViewer PDF retry; ChatWidget 429 copy +
  `ApiError` import + noreferrer; App `noreferrer`; seo theme-color unified.
- `docker-compose.yml` — `COMPOSE_API_APP_URL` fallback for local production-image runs;
  web build args for all `VITE_*`.
- `scripts/prisma-cli.mjs` — **refuses `--shadow-database-url` pointing at :5432** (see §10).
- `scripts/validate-production-env.mjs` — Render-aware (DATABASE_URL instead of role
  passwords); SMTP completeness check; trust-proxy rule aligned with runtime.
- `deploy/postgres/create-app-roles.sql` — appended idempotent existing-object grants
  (tables/sequences/enum types) so any manual run fully converges permissions.
- `netlify.toml` — build gate `validate-site-url.mjs`.
- `render.yaml` — pre-deploy validation gate + `NODE_VERSION=20`.
- `.env.example`, `apps/web/.env.example` — full per-variable reference (consumer, required,
  example); real email replaced with placeholders; legacy `API_URL` note removed.
- `docs/NETLIFY_RENDER.md` — Render `VITE_SITE_URL` requirement, backup section, lockout recovery.
- `docs/DEPLOYMENT.md` — corrected digest/platform claim.
- `README.md` — dev vs compose flows, deployment pointers.
- `render.yaml`, `netlify.toml`, `docs/NETLIFY_RENDER.md` (previously added) — hardened.

## 5. Fixes implemented (behavioral summary)

Rate limiting is now uniform (429 + `retry-after` everywhere via one code path); missing
limits added; media pruning moved off the read path; honeypot indistinguishable; reauth/rotate
inputs bounded; TEST_MODE cannot weaken production; proxy trust no longer depends on cookie
mode; nginx caches hashed assets immutably and revalidates content files; all DB slugs have
static SEO pages with image meta; grants script converges fully on re-run.

## 6. Security findings

- No live secrets in tracked files (verified by grep; `.env` gitignored; 0 `npm audit`
  findings). Example emails replaced with `you@yourdomain.com` placeholders.
- AuthN/Z model verified: single ADMIN, all private routes guarded, sessions DB-backed
  (7d absolute, 24h idle, 10m step-up), TOTP with anti-replay counters + recovery codes,
  constant-time dummy hash on login, lockout 10 fails/15m.
- SSRF-safe provider fetcher (https-only, no redirects, DNS pinning, private-IP rejection);
  all raw SQL is parameterized; no exec/spawn; mailer strips CRLF.
- **Accepted risks (documented, not changed):** lockout-DoS on the single owner account
  (recovery: wait 15m or clear via psql — procedure in NETLIFY_RENDER.md §5); step-up not
  required for password-change/session-revoke (by design, current tests pin behavior);
  stored text fields are raw HTML (safe because the SPA never uses innerHTML — React
  escapes; documented contract); `/static/` inline PDFs under the API origin (CSRF cookie
  is readable but useless without the httpOnly session cookie).
- CORS restricted to `APP_URL` allow-list; forged origins get 403 (verified); unauth admin
  routes 401 (verified).

## 7. Database and migration findings

- `hp_os` is now Migrate-managed: baselined 15 historical migrations (drift-verified
  zero-diff first), deployed `20261106000000_add_query_indexes`.
- `partial unique Education_primary_idx` lives in SQL only (Prisma cannot express it) —
  enforced in code instead (create/update clears other primaries in-transaction).
- Least-privilege roles exist with converged grants (schema USAGE, tables, sequences,
  enum types, default privileges). Runtime verified as `hp_app` (least-privilege login).
- **Local DB `hp_os` was wiped and restored during this audit — see §10.**

## 8. Dependency changes

None. `npm ci` from the existing lockfile; `npm audit` (prod and full): **0 vulnerabilities**.
`npm run db:generate` refreshes the Prisma client (required after `npm ci`, per README flow).

## 9. Tests executed and actual results

- `npm ci` — clean install from lockfile (warnings only, allow-scripts notices).
- `npm run typecheck` (shared/api/web) — PASS (after `db:generate`; stale client was the
  only failure, fixed by the documented step).
- `npm run test:web` — **23/23 PASS**.
- `npm run test:api` (isolated `hp-os-test` DB + disposable volumes) — **66/66 PASS**
  (one initial failure from the intentional honeypot contract change; test updated).
- `npm run build` — PASS, web budget OK (117 KiB initial JS / 21.3 KiB CSS gzip).
- `prisma validate` + `migrate status` — clean, "up to date".
- Endpoint battery via nginx (browser path): `home/timeline/settings-public/projects/
  skills/github-overview` all 200 with real data; `settings` anon 401; forged-Origin
  login 403; bad-creds login 401.
- Docker: `docker compose build api/web` clean; `docker compose config` valid;
  `down` + plain `up -d` (no shell exports) → all three services healthy (durable config).
- E2E (Playwright): **NOT RUN** — no browsers installed; admin-acceptance spec also
  mutates data. Stated plainly per policy.

## 10. Data-loss incident during this audit (full disclosure)

- **Cause:** I ran `prisma migrate diff --shadow-database-url=postgresql://…@127.0.0.1:5432/hp_os`.
  Prisma uses the shadow database as scratch space and **deletes its contents** — this
  emptied the local dev database (schema replayed from migrations, all rows lost, grants
  reset with the schema). The earlier "mysterious" grant loss was the same event.
- **Recovery:** a pre-existing `hp_os_test` database in the same cluster (15 migrations,
  unknown provenance — likely an older snapshot/test artifact) held 16 projects, 42
  certificates, 50 skills, 1 education, 20 timeline items, 5 site settings, the ADMIN user
  (2FA off) and 1 E2E-test message. Restored via
  `ALTER DATABASE hp_os RENAME TO hp_os_wiped_20261105; ALTER DATABASE hp_os_test RENAME TO hp_os;`
  then re-applied converged grants and deployed the index migration (16/16). Verified:
  home 200 with full public data.
- **Known gaps vs the wiped state:** the AI provider config row (Sep 30) is gone —
  re-enter the key in `/private/ai-providers` (2-minute task); 2FA was ON, now OFF —
  **re-enroll promptly**; contact messages after ~Nov 3 are unrecoverable from any source
  found (the 1 restored message is E2E noise); audit/analytics/sessions are operational
  data and regenerate. Uploaded FILES survive untouched in the `portfolio_hp_uploads` volume.
- **Prevention:** `scripts/prisma-cli.mjs` now refuses `:5432` shadow URLs with an
  explanatory error (verified); this report documents the rule (never point scratch
  tooling at a database holding data).
- The empty `hp_os_wiped_20261105` database was intentionally retained for forensics.

## 11. Exact Netlify deployment settings

- **Site:** import repo → build command
  `node scripts/validate-site-url.mjs "$VITE_SITE_URL" && npm run build --workspace @hp/shared && npm run build --workspace @hp/web`
  (from `netlify.toml`), publish `apps/web/dist`, `NODE_VERSION=20`.
- **Env vars:** `VITE_SITE_URL=https://<your-site>.netlify.app` (required),
  `VITE_API_URL=https://<api>.onrender.com` (required for split),
  `VITE_WHATSAPP[_MESSAGE]` optional. Rebuild after any change.
- **Included:** SPA fallback `/* → /index.html 200`; security headers (CSP
  `connect-src 'self' https:`); immutable year-cache scoped to `/assets/*`.

## 12. Exact Render deployment settings

- **Blueprint** `render.yaml`: service `hp-os-api` (node, starter), build
  `npm ci && prisma generate && build shared && build api`; **preDeploy**
  `node scripts/validate-production-env.mjs && npm run db:migrate --workspace @hp/api`
  (gate fails fast before migrations); start `node apps/api/dist/apps/api/src/server.js`;
  health check `/api/health`.
- **Env:** `NODE_ENV=production`, `NODE_VERSION=20`, `RENDER=true`, `TRUST_PROXY=1`,
  `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`, `APP_URL` + `VITE_SITE_URL` = Netlify
  origin (must match), `DATABASE_URL` from `hp-os-db`, three distinct generated secrets,
  `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` + `CONTACT_NOTIFY_EMAIL`,
  optional `GITHUB_TOKEN`/`LLM_*`/`UPLOAD_DIR`. Never set `ADMIN_*` on the service.
- **Database:** `hp-os-db` (PG 16, starter). Backups = Render automatic + manual snapshots
  (see NETLIFY_RENDER.md §4). Restores via dashboard; managed PG forbids superuser/roles.
- **CORS** restricted to `APP_URL`; `PORT` injected wins automatically.

## 13. Remaining limitations and unresolved risks

1. E2E not executed (no browsers; specs also mutate data) — unit (23) + API (66) green.
2. Local compose admin writes from `localhost:5173` are origin-blocked (production image
   requires https `APP_URL`); use `npm run dev` for admin work. Documented in README.
3. `hp_os_test`-in-dev provenance unknown; wiped-state deltas listed in §10.
4. No multi-instance media story yet (`STORAGE_DRIVER=local` + 1 GB disk, single instance).
5. Oracle backup scripts intentionally left Oracle-only (Render uses platform backups).
6. Deliberately unchanged MEDIUMs: lockout-DoS (recovery documented), step-up scope,
   session-cap (bounded by login limits), stored-HTML contract, public/home cache policy.

## 14. Deployment-failure postmortem: c4c7291 on Netlify + Render (addendum)

Reported: Netlify build of `c4c7291` failed (exit 2); Render deploy of `c4c7291`
failed; published site still `863cae6`. Investigation found `c4c7291` is the tip
of the stale `world-class-oracle-ready` branch (Sep 2026) and an ancestor of `main`
— both platforms were building the wrong branch.

**Render — root causes reproduced locally (worktree at c4c7291):**
1. Build failure: the branch pipeline never runs `prisma generate`, so `tsc`
   fails on the stale generated client (`TS2694` missing `*WhereInput`/`ProjectSelect`
   plus cascading `TS7006`). Verified: `npm run build --workspace @hp/api` fails;
   after `prisma generate` it passes. `main` fixes this (`render.yaml` buildCommand
   generates first; pre-deploy validation gate fails fast with clear messages).
2. Startup failure: the branch API ignores the `PORT` env var and binds 4000
   (verified: boots on :4000, nothing on `$PORT=10000`), so Render health checks
   fail and the deploy is marked failed. `main` reads `PORT ?? API_PORT`.
3. No `render.yaml` on the branch: fully manual dashboard config, no pre-deploy
   migrate, no env validation; branch session cookies are lax-only (cross-origin
   admin broken regardless).

**Netlify — exit code 2:** the branch build command (`shared` + `web`) passes
cleanly in a faithful local reproduction (exit 0, no `VITE_*` set), so the failure
is a dashboard/build-environment mismatch, not branch code. Prime suspects, in
order: (a) UI build command overridden to root `npm run build`, which also compiles
the API and fails at the exact `tsc` breakage above; (b) Base directory set to
`apps/web`, which breaks the workspace-addressed build command; (c) Node version or
install-step mismatch. The branch `netlify.toml` additionally lacks base pin, SPA
fallback, `NODE_VERSION` and validation gates — a "successful" build of it would
still serve broken deep links. Exact correct settings are in `docs/NETLIFY_RENDER.md`.

**Resolution (no code changes to the stale branch — it is 2 months behind `main`,
missing security hardening):** switch both dashboards to production branch `main`
(`863cae6`, proven: currently published and verified here with the exact production
env — canonical `https://harshpandeyz.netlify.app/`, `VITE_API_URL` inlined, zero
localhost leaks, CORS allow-list = Netlify origin, `PORT`/SameSite/trust correct).
Required manual dashboard values: Netlify `VITE_SITE_URL` + `VITE_API_URL`
(`https://harsh-portfolio-lysq.onrender.com`); Render `APP_URL` + `VITE_SITE_URL`
(both = `https://harshpandeyz.netlify.app`), `DATABASE_URL` (from managed DB),
three generated secrets, Resend trio. Added a loud non-failing build warning when
`VITE_API_URL` is empty so the split-deploy misconfiguration is visible in logs.

## 15. Post-audit fix: local admin login 403 (addendum)

**Symptom:** admin login at `http://localhost:5173/private` showed "Invalid email or
password" for any credentials, with zero `AUTH_LOGIN_FAILURE` audit rows.
**Root cause:** the browser sends `Origin: http://localhost:5173`, but the production
API image requires a public-https `APP_URL` (`https://portfolio.invalid` locally), so
`assertAllowedOrigin` rejected the request with 403 before the password was ever checked —
and the login form mapped every non-429 error to the generic credential message.
**Fix (verified):** nginx now drops `Origin` on the same-origin `/api/` proxy (sound here:
same-origin traffic only; CSRF double-submit still enforced end-to-end; direct `:4000`
access keeps full origin checks), and the login form now distinguishes 401 (wrong
credentials) from 403 (server config) and network failures. Verified: proxied login with
browser Origin went from 403 `FORBIDDEN_ORIGIN` to 401 with the attempt audited.
If login still reports invalid credentials, the restored database carries an older
password hash — reset it with `npm run admin:set-password` (interactive, password never
stored in files).

## 17. Production deployment verification session (Netlify exit-2 + Render fail)

Context: Netlify site `harshpandeyz` failed building commit `863cae6` (exit 2);
Render service `harsh-portfolio` failed deploying (dep `dep-dbmgrk8473hc7396scig`).
Published frontend predates the failure. No dashboard access was available, so all
verification below is local reproduction + code/config inspection — no deploy-log
contents are claimed beyond what was reproduced.

**Netlify.** The branch build command (`shared` + `web`) was run in a pristine
checkout with no `VITE_*` set: `tsc` + `vite build` exit 0 — the code builds clean,
so exit 2 is not reproducible from the repo and points at build-environment or
dashboard configuration. Proven failure signatures (exact log lines): missing
`VITE_SITE_URL` → `[site-url] VITE_SITE_URL is required …` exit 1 before anything
compiles (the gate was introduced in `863cae6`, so this commit is the first that
fails loudly instead of shipping poisoned canonical/og URLs); placeholder or
localhost value → explicit rejection. With `VITE_SITE_URL=https://harshpandeyz.netlify.app`
+ `VITE_API_URL=https://harsh-portfolio-lysq.onrender.com`: full build exit 0,
canonical correct, API URL inlined in the bundle, zero `localhost` refs in HTML,
static per-route pages + sitemap with `<lastmod>` generated. Remaining suspects for
the exit-2 (dashboard-side, listed for the owner to check): production branch not
`main`, Base directory not empty, UI build command overridden to root
`npm run build` (compiles the API too — fails the site on API-only issues), or
Node/install drift. The `react-router` `http://localhost` strings and the
`RESEND_API_KEY` UI hint text found in bundles are library internals / help copy,
not config leaks or secrets.

**Render.** `render.yaml` Blueprint path verified step by step in a pristine checkout:
`npm ci` clean; `prisma generate` + shared + API `tsc` builds exit 0; start path
`apps/api/dist/apps/api/src/server.js` exists; preDeploy validation gate passes with a
complete Render-style env and names the exact missing/weak variable otherwise
(`DATABASE_URL`, `VITE_SITE_URL`, secrets, `TRUST_PROXY`, Resend pair, SMTP
completeness). Production boot simulation (`PORT=15500`, managed-proxy + split-cookie
settings, real local PG for the readiness path only): `/api/health` ok,
`/api/ready` ready, `/api/public/home` 200 with real data. All requested endpoints
exist (`/api/ready`, `/api/health`, `/api/public/home`, `/api/projects`,
`/api/timeline`, `/api/settings/public`). Migration history is `16/16` "up to date";
the index migration is non-destructive DDL. No production database was contacted;
no secrets leave the machines that hold them.

**Integration (live local stack + config proof for prod values).** CORS allow-list
echoes only listed origins (negative control: random origin gets no ACAO header);
forged-Origin login → 403 before auth; unauthenticated admin mutation → 401 with no
state change; invalid contact payload → 400 with structured issues (no write). Cookie
contract verified at config level (`SameSite=None; Secure`, host-only, 7d/24h/10m
windows). One probe row written to the *dev* inbox during CSRF probing was deleted
again (verified count 0) — dev data unchanged otherwise.

**Required manual dashboard values (names only).** Netlify:
`VITE_SITE_URL=https://harshpandeyz.netlify.app`,
`VITE_API_URL=https://harsh-portfolio-lysq.onrender.com` (+ optional `VITE_WHATSAPP*`).
Render: `APP_URL` + `VITE_SITE_URL` (both the Netlify origin), `DATABASE_URL` from
`hp-os-db`, existing `SESSION_SECRET`/`AI_CONFIG_KEY`/`TOTP_ENCRYPTION_KEY` (+ previous
keys untouched), `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` + `EMAIL_FROM` +
`CONTACT_NOTIFY_EMAIL`, optional `GITHUB_TOKEN`/`LLM_*`. Branch for both: `main`;
Netlify base dir empty, build/publish per `netlify.toml`.

## 18. Live-production probe session (no dashboard access)

Date: 2026-11-06. Available integrations: GitHub CLI only (`gh`, account
harshpandeyz; no Netlify/Render CLIs or API tokens in this environment, no CI
workflows in the repo). No dashboard could be opened, so all findings below are
from public endpoints + local reproduction. No production system was modified.

**Observed live state (all via public HTTPS):**
- Netlify `https://harshpandeyz.netlify.app/` → 200, but bakes
  `canonical http://localhost:5173/` and calls
  `https://new-portfolio-gp3p.onrender.com` (a different, older backend — not the
  target service). Conclusion: the published build came from a dashboard without
  `VITE_SITE_URL` on pre-gate code. It cannot work correctly.
- Old backend `new-portfolio-gp3p` → `/api/health` 200 (after ~22 s cold start),
  but `/api/public/home` → 500 `INTERNAL`. Boots, cannot serve data. Do not touch
  it; it is outside this plan's scope.
- Target backend `harsh-portfolio-lysq` → `/api/health` 500 `INTERNAL` while
  `/api/ready` and `/api/public/home` → 404 `Unknown route`. In every known code
  revision health+ready are registered together, so this signature means the
  running revision predates the readiness endpoints (ancient code whose health
  check hits the database, now unreachable) — i.e. the failed deploy left a
  stale broken release running. Redeploying `main` replaces it wholesale.
- Net consequence: the public site currently shows the "temporarily unavailable"
  banner (live frontend → 500 backend). Both dashboards need the fixes below.

**What could not be done without dashboard access (exact unblock):**
1. Confirm each service's connected branch (must be `main`), build/publish dirs,
   build & start commands, and health-check paths.
2. Read the failed deploy logs (`863cae6` Netlify exit 2; Render
   `dep-dbmgrk8473hc7396scig`) to match against the §6/§17 signature tables.
3. Set/verify non-secret env vars (lists in `docs/NETLIFY_RENDER.md`) and confirm
   secrets + `hp-os-db` linkage exist without displaying values.
4. Trigger the Render deploy first, then the Netlify clear-cache rebuild.
Needs: Netlify personal token (sites read+write) or the user clicking through
Site settings; Render API key (service read+deploy) or dashboard clicks. GitHub
alone cannot perform any of these — there are no workflows to dispatch.

## 19. Autonomous deployment attempt (no platform access)

Date: 2026-11-06. Authorized to use any authenticated integrations found.
Inventory: GitHub CLI authenticated (`harshpandeyz`, keyring) — works. No Netlify
CLI auth (`~/.netlify` absent, no tokens in env; `netlify login` needs an
interactive browser which is unavailable here). No Render CLI exists on npm and
no Render API key anywhere in the environment. No CI workflows in the repo to
dispatch, no repo webhooks, no commit statuses from either platform.
Conclusion: dashboards, env vars, and deploy triggers are reachable only by the
owner (dashboard clicks) or by providing a Netlify personal token (sites
read+write) / Render API key (service read+deploy) — GitHub access cannot
substitute for either.

Executed with the access available: pushed verified `main` to origin
(`42b445f..90db61b`, docs-only deltas) and polled both public surfaces for
~22 minutes. Neither service changed (Netlify still serves the stale
localhost-canonical bundle `index-fM4paHlw.js`; Render `harsh-portfolio-lysq`
still 500s `/api/health`): auto-deploy is off and/or both services are pinned
away from `main`. The push was safe (docs + Dockerfile warning only; no runtime
delta vs the already-verified `42b445f`).

Exact unblock for the owner: (1) Render dashboard → service → Settings: branch
`main`, confirm build/preDeploy/start/healthcheck per `render.yaml`; Environment:
`APP_URL` + `VITE_SITE_URL` = `https://harshpandeyz.netlify.app`,
`DATABASE_URL` from `hp-os-db`, existing secrets (verify present, never rotate),
Resend trio, `TRUST_PROXY=1`; Deploy → poll `/api/ready` until `ready`.
(2) Netlify dashboard → Site settings: branch `main`, base dir empty, build per
`netlify.toml` (never root `npm run build`); Environment: `VITE_SITE_URL` +
`VITE_API_URL=https://harsh-portfolio-lysq.onrender.com`; Clear cache + Deploy.
Expected post-deploy signatures are tabulated in `docs/NETLIFY_RENDER.md` §6 and
the curl checklist in §3.

## 20. Final production-readiness assessment

**READY, with noted follow-ups.** All critical/high defects fixed and verified; builds,
tests, migrations, containers and endpoints green; secrets out of source control; docs,
runbooks and exact dashboard settings in place. Before going live: set Render/Netlify env
per §§11–12, re-enter the AI provider key, re-enroll 2FA, take a Render snapshot, and run
the §3 post-deploy checks in `docs/NETLIFY_RENDER.md`.
