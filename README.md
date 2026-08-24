# HP//OS — Harsh Pandey Engineering System

> *"I didn't just make a portfolio. I engineered an interactive software system that happens to be my portfolio."*

A cinematic, full-stack personal system: public experience, retrieval-backed AI assistant,
operator control center, verified certificate archive — backed by PostgreSQL and a hardened
Fastify API. Every fact on the site traces to the provided resume, the certificate documents,
or Harsh's public GitHub repositories.

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
npm install

# 2 — environment
cp .env.example .env
#   → set SESSION_SECRET (openssl rand -hex 32)
#   → set ADMIN_EMAIL / ADMIN_PASSWORD (used by seed + admin:create)

# 3 — database (PostgreSQL 16 + auto-created test DB)
docker compose up -d db

# 4 — schema + verified seed data
npm run db:migrate
npm run db:seed

# 5 — run (web on :5173, api on :4000)
npm run dev
```

Open **http://localhost:5173**. The seed loads the profile, 13 curated projects,
50 honestly-leveled skills, 20 mission-log entries and all **42 certificates**
(documents are ingested from `../CERTIFICATES` into `apps/api/uploads/`).

## Admin (operator) access

- Web: press **Ctrl+Shift+H** anywhere (or the subtle `LOCAL OPERATOR ACCESS` at the page end)
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

## The experience

```
BOOT → IDENTITY → CAPABILITIES → SYSTEMS → MISSION LOG → CREDENTIALS → COMMUNICATION → EXIT
```

- **Boot sequence** (2.5s, skippable, remembered per session, reduced-motion aware)
- **Engineering core (3D)** — a wireframe core + orbital rings that *transforms* per section
  (compact → split capabilities → project constellation → archive lattice → terminal collapse);
  three quality tiers with a pure-CSS fallback
- **Command palette** (⌘K / Ctrl+K) — every destination, resume, GitHub, AI, private access
- **Project constellation** — tiered (flagship / secondary / experiment / academic / legacy /
  internship); each opens a cinematic case study with architecture/dataflow diagrams drawn
  from the project's real pipeline, security posture and engineering decisions
- **Certificate archive** — searchable, categorized, paginated; evidence viewer with
  fullscreen + download and keyboard/focus handling
- **HARSH AI** — retrieval-backed assistant over the live database; cites sources,
  declares `VERIFIED / INFERRED / UNKNOWN`, and refuses to invent (salary? GPA? → "I don't
  have verified information about that…"). Works with **no LLM configured** (deterministic
  composer); plug in OpenAI/Groq via env for generative answers
- **Recruiter view** — `/recruiter`: compressed, factual, printable
- **Achievements & easter eggs** — 7 discovery achievements, terminal (`help`, `sudo`, …),
  Ctrl+Shift+H, all harmless; security is never hidden-only

## Content management

All public content is served from the database — edit it in **HARSH // CONTROL**
(`/private`) without touching source code: projects, certificates, skills, timeline,
profile, media library (images/PDF/video), message inbox with statuses, audit log,
and privacy-safe analytics.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, data model, chat pipeline
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Netlify/Vercel + Render/Railway, managed Postgres
- [`docs/SECURITY.md`](docs/SECURITY.md) — auth model, CSRF, rate limits, threat notes
