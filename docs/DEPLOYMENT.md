# Production deployment

The production stack is Docker Compose: NGINX serves the Vite build, Fastify
serves the API, and PostgreSQL is reachable only on the Compose network (with a
loopback port for host maintenance). Put TLS termination and the public DNS
record at the Oracle Cloud reverse proxy or load balancer.

## Required configuration

Create a host-only `.env` from `.env.example` and set:

- `POSTGRES_PASSWORD`: a unique database password.
- `SESSION_SECRET`: `openssl rand -hex 32` output.
- `APP_URL`: the public site origin, such as `https://portfolio.your-domain`.
- `VITE_SITE_URL`: the same public origin, used when building SEO metadata.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` only for the explicit first seed or admin
  bootstrap operation.
- `AI_CONFIG_KEY` (recommended): `openssl rand -hex 32` output for encrypted
  provider credentials. If omitted, the key is derived from `SESSION_SECRET`.

The optional LLM and email variables are listed in `.env.example`. Keep `.env`
out of source control and provide production values through the host's secret
management facilities.

## Release procedure

Run these commands from the repository checkout on the Oracle instance. The
API entrypoint does not run migrations or seeds; those are explicit release
operations.

```sh
docker compose build --no-cache
docker compose up -d db
docker compose run --rm api node /app/node_modules/.bin/prisma migrate deploy --schema /app/apps/api/prisma/schema.prisma
docker compose up -d
docker compose ps
docker compose logs --tail=100 api
curl --fail http://127.0.0.1:4000/api/health
curl --fail http://127.0.0.1:4000/api/ready
curl --fail http://127.0.0.1:8080/
```

On the first deployment only, seed explicitly after migrations and before the
API is started:

```sh
docker compose run --rm api node /app/node_modules/.bin/tsx /app/apps/api/prisma/seed.ts
```

Seeding is not part of routine releases. Back up PostgreSQL and the uploads
volume before schema or media changes. Do not use `docker compose down -v` on a
production host.

## Database and media

Prisma changes ship as checked-in migrations. Review the SQL, take a database
backup, then run `prisma migrate deploy` before restarting the API. Do not use
`prisma db push` in production. PostgreSQL data is stored in `hp_pgdata`; local
media currently uses the persistent `hp_uploads` volume. The storage driver is
local today, so Oracle Object Storage is not yet wired into the application.
