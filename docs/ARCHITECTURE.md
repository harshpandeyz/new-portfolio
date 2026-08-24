# HP//OS — Architecture

## System overview

```
┌───────────────────────────────  Browser  ────────────────────────────────┐
│  React 18 SPA (Vite)                                                     │
│  ├── Public experience  /            GSAP ScrollTrigger choreography      │
│  ├── Case studies       /projects/:slug                          │
│  ├── Recruiter mode     /recruiter   code-split, printable                 │
│  ├── HARSH AI widget                 lazy-mounted, streams from /api/chat │
│  └── HARSH // CONTROL   /private     code-split admin app (own chunk)     │
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

- `lib/` — api client (auto-CSRF), data provider (single fetch fan-out + refresh),
  device tiering (`high | medium | low`), achievements store (localStorage + pub/sub),
  GSAP utilities (`bindReveals`, `splitReveal`) with strict cleanup
- `components/hud/` — boot, topbar, status rail, command palette, cursor, terminal,
  toasts, private-access modal
- `components/three/CoreScene` — R3F canvas, mode-driven (`hero|core|projects|
  credentials|contact`) parameter lerping; lazy-loaded, tier-scaled, CSS fallback
- `features/` — sections, chat, recruiter, admin (own lazy chunk)

Performance: three.js/gsap/admin are separate chunks (three ≈ 220 KB gzip loads only
when WebGL renders; the site is fully usable without it). Reveals use `once: true`
triggers; timelines are killed on unmount.

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

`npm run db:seed` scans `CERTIFICATES_SOURCE_DIR` (default `../../CERTIFICATES` outside
the repo), copies each document into `apps/api/uploads/certificates/` with sanitized
names, and creates records from the verified metadata table in `prisma/seed.ts`
(issuers/dates were extracted from the documents themselves; unknown dates are null).
Admins can correct or enrich any record later — the seed never overwrites manual edits
unless `SEED_FORCE=1`.
