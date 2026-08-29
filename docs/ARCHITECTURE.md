# Harsh Pandey Portfolio — Architecture

## System overview

```
┌───────────────────────────────  Browser  ────────────────────────────────┐
│  React 18 SPA (Vite)                                                     │
│  ├── Public experience  /            GSAP ScrollTrigger choreography      │
│  ├── Case studies       /projects/:slug                          │
│  ├── Recruiter mode     /recruiter   code-split, printable                 │
│  ├── Ask Harsh widget                lazy-mounted, uses /api/chat         │
│  └── Private admin area  /private     code-split admin app (own chunk)     │
└──────────────┬──────────────────────────────┬────────────────────────────┘
               │ /api (JSON, credentials)     │ /static (uploads)
┌──────────────▼──────────────────────────────▼────────────────────────────┐
│  Fastify 5 API                                                           │
│  modules: auth · profile · projects · certificates · skills · timeline   │
│           education · contact · chat · media · analytics · github · stats │
│  middleware: session cookie auth → role check → CSRF (mutations)         │
│  cross-cutting: zod validation · rate limiting · audit log · helmet·CORS  │
└──────────────┬──────────────────────────────┬────────────────────────────┘
               │ Prisma                       │ LLM provider (optional)
┌──────────────▼──────────────┐   ┌───────────▼───────────────────────────┐
│  PostgreSQL 16              │   │ LLMProvider abstraction               │
│  users · sessions · profile │   │ openai | groq | custom | none         │
│  projects · certificates    │   │ (none = deterministic composer,       │
│  skills · education ·       │   │  zero external calls by default)      │
│  timeline · messages ·      │   └───────────────────────────────────────┘
│  media · audit · analytics  │
└─────────────────────────────┘
```

## Data model (Prisma)

Content tables (`projects`, `certificates`, `skills`, `education`, `timeline_items`,
`profile` + `social_links`) carry the public site. Operational tables: `users` +
`sessions` (auth), `contact_messages`, `media_assets`, `site_settings`, `audit_logs`,
`analytics_events`, `chat_query_logs`. String-list columns (stack, decisions, dataFlow,
gallery, usedIn, relatedConcepts) are Postgres text arrays with defaults — indexed on
slug/tier/featured/category/createdAt as appropriate.

## Frontend architecture

- `lib/` — API client (auto-CSRF and optional cross-origin base URL), data provider
  (single fetch fan-out + refresh), device tiering (`high | medium | low`), achievements
  store (localStorage + pub/sub), scroll tracking, and GSAP reveal utilities
- `components/navigation/` — public floating navigation
- `components/hud/` — intentionally hidden advanced surfaces: command palette,
  terminal, achievements, and private-access modal
- `components/three/CoreScene` — R3F canvas, mode-driven (`hero|core|projects|
  credentials|contact`) parameter lerping; lazy-loaded, tier-scaled, CSS fallback
- `features/` — sections, chat, recruiter, admin (own lazy chunk)

Performance: three.js/gsap/admin are separate chunks (three ≈ 220 KB gzip loads only
when WebGL renders; the site is fully usable without it). Reveals use `once: true`
triggers; timelines are killed on unmount.

## Media ownership

- Frontend-owned files live in `apps/web/public/files` and are referenced as
  `/files/...` (résumé and portrait). They stay on the web origin even when the
  API is deployed separately.
- API-owned uploads live under `apps/api/uploads` and are referenced as
  `/static/...`. The canonical `resolveMediaUrl` helper maps these paths to
  `VITE_API_URL` when needed.
- Real certificate source files are tracked under
  `apps/api/seed-assets/certificates`; seeding copies them to the persistent
  upload volume and creates matching database records.

## Chat pipeline

```
question
  → buildKnowledge()        (30s-cached corpus from every content table)
  → retrieve()              lexical scoring w/ field boosts (swap-in ready for vectors)
  → sensitiveUnknown()      honesty guard (salary/phone/… → UNKNOWN)
  → LLM configured?
        yes → grounded prompt (strict system rules) → INFERRED + sources
        no  → deterministic composer (intent + top docs) → VERIFIED + sources
  → low confidence / no hits → "I don't have verified information…"
```

Every reply carries `confidence` (VERIFIED/INFERRED/UNKNOWN), `sources[]` and deep
links into the site. The retrieval interface (`retrieve(query, docs, topK)`) matches a
future vector-store implementation — embeddings can be added without touching the
route or UI contract. Queries are logged (`chat_query_logs`) for the admin dashboard.

## Certificate ingestion

`npm run db:seed` scans `CERTIFICATES_SOURCE_DIR` (default
`apps/api/seed-assets/certificates`), copies each document into
`apps/api/uploads/certificates/` with sanitized names, and creates records from the verified metadata table in `prisma/seed.ts`
(issuers/dates were extracted from the documents themselves; unknown dates are null).
Admins can correct or enrich any record later — the seed never overwrites manual edits
unless `SEED_FORCE=1`.
