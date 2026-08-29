# Harsh Pandey Portfolio — Deployment

## Topology

| Piece | Host | Notes |
| --- | --- | --- |
| Web (static SPA) | Netlify / Vercel / any static host | `apps/web/dist` |
| API | Render / Railway / Fly.io | Monorepo Node service, `node apps/api/dist/apps/api/src/server.js` |
| PostgreSQL | Managed (Neon / Supabase / Render) | `DATABASE_URL` |
| Uploads | Persistent disk or S3-compatible | local driver by default |

## Web (Netlify example)

Build command: `npm run build --workspace @hp/web` · Publish dir: `apps/web/dist`

`netlify.toml`:
```toml
[build]
  command = "npm run build --workspace @hp/web"
  publish = "apps/web/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Set the optional web build variable `VITE_API_URL` to the API origin when the static
site and API are on different origins. Leave it empty when a same-origin reverse
proxy serves `/api` and `/static`. Frontend-owned `/files/*` assets stay on the web
origin; API-owned `/static/*` assets use the API origin. CORS on the API accepts the
configured `APP_URL` origin list with credentials.

## API (managed host)

- Root directory: repository root
- Build: `npm ci && npm run db:generate --workspace @hp/api && npm run build`
- Start: `node apps/api/dist/apps/api/src/server.js`
- Health check: `/api/health`
- Env: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`, optional
  `LLM_*`, `SMTP_*`, `GITHUB_TOKEN`, `MAX_UPLOAD_MB`, `TRUST_PROXY` (default `1`,
  see `docs/SECURITY.md`)
- Attach a persistent disk mounted at `apps/api/uploads` (or switch `STORAGE_DRIVER`
  to an S3-compatible adapter in `src/modules/media`)

Run migrations and seed as explicit release operations; API startup never resets
content:

```bash
npm run db:migrate
npm run db:seed
```

## Database

```bash
# against the production DATABASE_URL
npm run db:migrate          # prisma migrate deploy
npm run db:seed             # verified content (idempotent; SEED_FORCE=1 to reset)
npm run admin:create -- --email you@domain.com --password "long-random-passphrase"
```

Migrations live in `apps/api/prisma/migrations` and are applied verbatim — no
`db push` in production.

## Docker Compose (same-origin production shape)

The repository includes a complete stack: Postgres on the internal `db` network,
Fastify on `api:4000`, and nginx serving the built SPA on port 8080 while proxying
`/api/*` and `/static/*` to the API. This keeps cookies and media same-origin.

```bash
export SESSION_SECRET="$(openssl rand -hex 32)"
export ADMIN_PASSWORD="use-a-strong-password-at-least-12-chars"
docker compose build
docker compose run --rm api npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
docker compose run --rm -e ADMIN_PASSWORD="$ADMIN_PASSWORD" api npm run db:seed --workspace @hp/api
docker compose up -d
```

Open `http://localhost:8080`. The `hp_uploads` volume is the source of truth for
runtime media; back it up alongside Postgres.

## Production checklist

- [ ] `SESSION_SECRET` is a fresh 32-byte random hex string
- [ ] `ADMIN_PASSWORD` supplied only for the initial seed, then managed with `admin:create`
- [ ] `APP_URL` matches the deployed web origin (CORS + cookies)
- [ ] `VITE_API_URL` is set on the web build only when the API is cross-origin
- [ ] HTTPS terminated at the platform (cookies flip to `secure` when `NODE_ENV=production`)
- [ ] `SMTP_*` configured if email notifications are wanted (messages always persist)
- [ ] `LLM_PROVIDER` left `none` unless a key is configured (chat works either way)
- [ ] Uploads disk mounted / storage driver chosen
- [ ] Backups scheduled on Postgres
