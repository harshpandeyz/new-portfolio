# Harsh Pandey — Software Engineer

> *"I build software that holds up beyond the demo."*

A polished, full-stack portfolio for Harsh Pandey: selected work, capabilities, credentials,
an AI assistant, and a recruiter-friendly résumé view. The public experience is backed by
PostgreSQL and a hardened Fastify API, while content remains editable through the private
admin area.

```
portfolio/
├── apps/
│   ├── web/        React 18 + Vite + TS · GSAP ScrollTrigger · React Three Fiber
│   └── api/        Fastify 5 + TS · Prisma · PostgreSQL
├── packages/
│   └── shared/     Domain types + zod schemas (single source of truth)
├── e2e/            Playwright end-to-end specs
├── scripts/        admin-create, docker init SQL
├── docs/           ARCHITECTURE · DEPLOYMENT · SECURITY
├── docker-compose.yml
└── .env.example
```

---

## Quick start (local)

Prerequisites: **Node ≥ 20**, **Docker**.

```bash
# 1 — install
npm ci

# 2 — environment
cp .env.example .env
#   → set SESSION_SECRET (openssl rand -hex 32)
#   → set ADMIN_EMAIL / ADMIN_PASSWORD (used by seed + admin:create)

# 3 — generate the database client
npm run db:generate --workspace @hp/api

# 4 — database (PostgreSQL 16 + auto-created test DB)
docker compose up -d db

# 5 — schema + verified seed data
npm run db:migrate
npm run db:seed

# 6 — run (web on :5173, api on :4000)
npm run dev
```

Open **http://localhost:5173**. The seed loads the profile, curated projects,
skills, journey entries and certificates. Real certificate documents are seeded
from the tracked `apps/api/seed-assets/certificates/` directory into the
persistent `apps/api/uploads/` runtime directory.

## Admin (operator) access

- Web: press **Ctrl+Shift+H** anywhere
- Or open `/private` directly — discovery is *not* security; every request is authorized server-side

```bash
# create / reset the operator account (bcrypt, 12 rounds)
npm run admin:create -- --email you@domain.com --password "a-long-random-passphrase"
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | web + api in watch mode |
| `npm run build` | typecheck + production build (all workspaces) |
| `npm run typecheck` / `lint` | strict TS across the monorepo |
| `npm run test` | web unit tests + API security suite |
| `npm run test:api` | API suite only (needs `TEST_DATABASE_URL`, provided by compose) |
| `npm run e2e` | Playwright browser tests |
| `npm run db:migrate` / `db:seed` | Prisma migrate deploy / verified seed |
| `npm run admin:create` | create or reset the admin operator |

## The public experience

```
HERO → ABOUT → SELECTED WORK → CAPABILITIES → JOURNEY → CREDENTIALS → CONTACT
```

- **Quiet 3D atmosphere** — a low-contrast, tiered React Three Fiber scene that supports the
  hero without competing with the content; it pauses when the page is hidden
- **Command palette** (⌘K / Ctrl+K) — an advanced shortcut for destinations, résumé, links,
  AI, and private access
- **Selected work** — one flagship project, secondary work, and compact additional entries;
  each opens a case study built from the project's real data
- **Credentials** — featured first, with a searchable, categorized gallery and keyboard-safe
  viewer for the full collection
- **Ask Harsh** — a retrieval-backed assistant over the live database. It cites relevant
  portfolio sources, distinguishes verified and inferred answers, and admits when information
  is unavailable. It works without an LLM configured through the deterministic composer
- **Recruiter view** — `/recruiter`: compressed, factual, printable
- **Advanced details** — private access, achievements, and easter eggs remain
  discoverable without defining the public visual language

## Content management

All public content is served from the database — edit it in the private admin area
(`/private`) without touching source code: projects, certificates, skills, timeline,
profile, media library (images/PDF/video), message inbox with statuses, audit log,
and privacy-safe analytics.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, data model, chat pipeline
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Netlify/Vercel + Render/Railway, managed Postgres
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth model, CSRF, rate limits, threat notes
