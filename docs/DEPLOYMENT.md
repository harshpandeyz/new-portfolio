# HP//OS — Deployment

## Topology

| Piece | Host | Notes |
| --- | --- | --- |
| Web (static SPA) | Netlify / Vercel / any static host | `apps/web/dist` |
| API | Render / Railway / Fly.io | `apps/api` (node, `npm run start` after build) |
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

Set `VITE_`-free config: the SPA calls the API via absolute URLs — set the API origin
by serving the web app from the same domain behind a proxy, **or** adjust
`apps/web/src/lib/api.ts` `BASE` to the API URL (e.g. `https://api.harshpandey.dev`).
CORS on the API already accepts a configurable `APP_URL` origin list with credentials.

## API (Render example)

- Root directory: `apps/api`
- Build: `npm install && npx prisma generate && npm run build`
- Start: `node dist/server.js`
- Health check: `/api/health`
- Env: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`, optional
  `LLM_*`, `SMTP_*`, `GITHUB_TOKEN`, `MAX_UPLOAD_MB`
- Attach a persistent disk mounted at `apps/api/uploads` (or switch `STORAGE_DRIVER`
  to an S3-compatible adapter in `src/modules/media`)

## Database

```bash
# against the production DATABASE_URL
npm run db:migrate          # prisma migrate deploy
npm run db:seed             # verified content (idempotent; SEED_FORCE=1 to reset)
npm run admin:create -- --email you@domain.com --password "long-random-passphrase"
```

Migrations live in `apps/api/prisma/migrations` and are applied verbatim — no
`db push` in production.

## Production checklist

- [ ] `SESSION_SECRET` is a fresh 32-byte random hex string
- [ ] `ADMIN_PASSWORD` changed from the seed value (run `admin:create`)
- [ ] `APP_URL` matches the deployed web origin (CORS + cookies)
- [ ] HTTPS terminated at the platform (cookies flip to `secure` when `NODE_ENV=production`)
- [ ] `SMTP_*` configured if email notifications are wanted (messages always persist)
- [ ] `LLM_PROVIDER` left `none` unless a key is configured (chat works either way)
- [ ] Uploads disk mounted / storage driver chosen
- [ ] Backups scheduled on Postgres
