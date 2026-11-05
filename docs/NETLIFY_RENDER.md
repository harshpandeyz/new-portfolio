# Netlify (frontend) + Render (backend) deployment

The Docker/Caddy path in `docs/DEPLOYMENT.md` (Oracle VM) still works unchanged.
This file covers the managed-host alternative: static frontend on Netlify,
API + PostgreSQL on Render. No Oracle, Caddy, or Docker knowledge is required.

> **Branch requirement — read first.** Both platforms must build the **`main`**
> branch. The `world-class-oracle-ready` branch (tip `c4c7291`, Sep 2026) is
> stale and **cannot deploy**: it has no `render.yaml`, its Netlify config lacks
> the base dir, SPA fallback, Node pin and validation gates, its API build omits
> `prisma generate` (TypeScript fails on the stale generated client), and its API
> ignores the `PORT` env var (binds 4000 while Render probes `$PORT`). All of this
> is fixed on `main`. Do not ship `c4c7291`; switch both dashboards to `main`.

## 1. Render — API + database (Blueprint)

1. Push this repo to GitHub and choose **New → Blueprint** in Render,
   pointing at `render.yaml` in the repo root.
2. Render creates the `hp-os-api` web service and the `hp-os-db` PostgreSQL
   database. Review the prompted values before applying:
   - `APP_URL` — public origin of the Netlify site, e.g.
     `https://your-site.netlify.app` (no trailing slash). A comma-separated
     allow-list is accepted when a custom domain is added later.
     Also set `VITE_SITE_URL` on Render to the SAME origin — the pre-deploy
     validation gate requires both and that they match.
   - `DATABASE_URL` — wired automatically from `hp-os-db`.
   - `SESSION_SECRET`, `AI_CONFIG_KEY`, `TOTP_ENCRYPTION_KEY` — auto-generated
     64-hex values. Keep the three distinct; keep previous-key fields empty
     unless rotating.
   - `RESEND_API_KEY` + `EMAIL_FROM` + `CONTACT_NOTIFY_EMAIL` — Resend HTTPS
     mail (recommended on Render; SMTP ports are restricted). `EMAIL_FROM`
     must be a verified Resend sender identity.
   - `GITHUB_TOKEN`, `LLM_*` — optional, as in `.env.example`.
3. Defaults already set by the Blueprint: `RENDER=true`, `TRUST_PROXY=1`
   (Render's edge IPs are dynamic, so hop-count trust is correct here),
   `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` (required so admin
   session/CSRF cookies persist across the Netlify → Render origins),
   `NODE_ENV=production`, `NODE_VERSION=20`, health check `/api/health`.
4. Deploy. Render runs `preDeployCommand` (production-env validation gate,
   then `prisma migrate deploy`) before each release, then starts
   `node apps/api/dist/apps/api/src/server.js`. If the gate fails, the
   deploy stops BEFORE migrations run — fix the flagged variable and retry.

Notes:

- `PORT` is injected by Render and wins over `API_PORT` automatically.
- `UPLOAD_DIR` defaults to `apps/api/uploads`. Local disk is ephemeral on
  Render; the Blueprint attaches a 1 GB disk at that path (single instance).
  For durable multi-instance media, move to S3-compatible storage later —
  `STORAGE_DRIVER` is currently `local`-only by design.
- Never set `ADMIN_EMAIL`/`ADMIN_PASSWORD` on Render. Create the owner
  account once via the Render shell against the deployed service, or via the
  local `npm run admin:create` flow against the Render database URL.

## 2. Netlify — static frontend

1. **Add New site → Import from Git**, selecting this repo, production branch **`main`**.
   Netlify auto-detects `netlify.toml`: build
   `node scripts/validate-site-url.mjs "$VITE_SITE_URL" && npm run build --workspace @hp/shared && npm run build --workspace @hp/web`,
   publish `apps/web/dist`, `NODE_VERSION=20`. Keep **Base directory empty**
   (repo root — the build addresses workspaces from there) and do **not**
   override the build command with root `npm run build` (that also compiles the
   API and fails the deploy on API-only issues).
2. Set site environment variables (Site settings → Environment):
   - `VITE_SITE_URL` — the Netlify site origin, e.g.
     `https://your-site.netlify.app` (required; baked into
     canonical/og/sitemap at build time).
   - `VITE_API_URL` — the Render API origin, e.g.
     `https://hp-os-api.onrender.com` (no trailing slash). Leave empty only
     for same-origin proxy setups.
   - `VITE_WHATSAPP`, `VITE_WHATSAPP_MESSAGE` — optional WhatsApp channel.
3. Deploy. `netlify.toml` supplies the SPA fallback (`/* → /index.html`)
   and the same security headers as `apps/web/nginx.conf`.

`APP_URL` (Render) and `VITE_SITE_URL` (Netlify) must describe the same
frontend origin; rebuild the Netlify site after changing either.

## 3. Post-deploy checks

- `GET https://<api>/api/health` → `{"status":"ok",…}` (no DB needed).
- `GET https://<api>/api/ready` → `{"status":"ready",…}` (DB + migrations).
- Public pages load from the Netlify origin; `/api/*` calls reach Render
  (check `VITE_API_URL` when the homepage shows "temporarily unavailable").
- Admin login at `https://<site>/private` persists across refreshes
  (proves `SameSite=None; Secure` + CORS are correct).
- Contact form stores to the inbox; replies send only when Resend is
  configured (otherwise the UI reports `EMAIL_NOT_CONFIGURED`).

## 4. Backups on Render (managed PostgreSQL)

Render Starter databases include automatic daily backups (7-day retention)
plus manual snapshots from the dashboard — this replaces the Oracle path
(`systemd` timer + `age` + OCI Object Storage in `scripts/backup.sh`,
which cannot run on Render).

- **Database:** rely on Render automatic backups; take a manual snapshot
  before risky operations (migrations, bulk imports). Point-in-time recovery
  is a dashboard operation — no `CREATE ROLE` / `OWNER` grants needed (and
  none possible: managed PG forbids superuser).
- **Media:** the Blueprint attaches a 1 GB disk at the upload directory
  (single instance). Disk snapshots are manual via the dashboard. Without a
  disk, `UPLOAD_DIR` is ephemeral — redeploys wipe it. There is no automated
  media off-site copy yet; for multi-instance durability, media must move to
  S3-compatible storage (the `STORAGE_DRIVER` extension point).
- **What is NOT portable:** `scripts/backup.sh`, `restore.sh`,
  `copy-restored-db.sh`, `restore-media-volume.sh` and the `deploy/hp-os-backup.*`
  units are Oracle-VM-only (docker, `oci` CLI, `age`, local paths).

## 5. Account recovery (lockout / lost 2FA)

- The login throttle locks an account for 15 minutes after 10 failed
  attempts. Wait it out — or, from a host with the database URL:
  `psql "$DATABASE_URL" -c "UPDATE \"User\" SET \"failedLoginAttempts\"=0, \"lockedUntil\"=NULL;"`
- If the TOTP device is lost, sign in with one of the 10 recovery codes
  issued at 2FA enrollment (each is single-use), then regenerate codes in
  Security Center. Recovery codes keep working even if encryption keys were
  rotated, because they are stored as hashes.
