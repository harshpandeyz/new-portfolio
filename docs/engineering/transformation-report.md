# Transformation Report — World-Class Portfolio + Control Center

Date: 2026-09-29 · Working directory is the deliverable (no commits pushed).

## 0. Curation + editorial pass (2026-09-29, this session)

### Project-curation bug — fixed at the data-semantics layer (not CSS)
- New explicit source of truth `packages/shared/src/curation.ts`:
  `FLAGSHIP_SLUGS = [intelligent-surveillance-system, orchestraai]`,
  `SELECTED_SLUGS = [quantummind, skillmatch]`,
  `SIGNATURE_SLUGS = flagship + selected`,
  `ARCHIVE_ONLY_SLUGS = [intelligent-mob-surveillance-system, brainmatch-game]`.
  Helpers `resolveHomepageCuration()` / `resolveRecruiterProjects()` look up by
  slug via Map, preserve curation order, exclude drafts, never duplicate
  flagship entries in the secondary row, and can never promote archive-only
  slugs even if `featured`/`order` are mis-edited in future.
- Seed corrected (`apps/api/prisma/seed.ts`): CCTV-X order 1 featured,
  OrchestraAI order 2 featured, QuantumMind order 3 featured/secondary,
  SkillMatch order 4 featured/secondary, Mob order 5 legacy/non-featured,
  BrainMatch order 6 experiment/non-featured. Mob stays in `/projects` as its
  own Ethereum-anchored predecessor and never inherits CCTV-X screenshots,
  architecture, or flow (all visual helpers branch on exact slug equality).
- `Work.tsx` rewritten to consume `resolveHomepageCuration()` — deleted the
  fragile `featured[0]` / `featured.find(!= flagship1)` / `ordered.slice(0,2)`
  chain. `Recruiter.tsx` uses the same `resolveRecruiterProjects()`.
  Chat `projects_list` sorts by signature rank before slicing. Knowledge orders
  projects by `order asc`. Admin `ProjectsAdmin` shows HOMEPAGE·FLAGSHIP /
  HOMEPAGE·SELECTED / ARCHIVE ONLY badges + curation notice.
- Regression tests `apps/web/tests/curation.spec.ts` (5 tests): exact hierarchy,
  archive-only exclusion, order/featured-noise immunity, draft exclusion,
  recruiter parity. Web 21/21 pass. API 43/43 pass (local hp_os_test).

### Public site — premium editorial, restrained motion
- Hero rebuilt for WHO/WHAT/SPECIALTY/NEXT: location·availability kicker,
  44–76px name, role—positioning line (no headline duplication), concise brief,
  primary See-selected-work + View-résumé + tertiary recruiter link (no button
  overload), and a 3-column proof strip (Flagship CCTV-X / Runtime OrchestraAI /
  Also QuantumMind·SkillMatch). Typography-only, no WebGL, reduced-motion and
  mobile safe.
- Work cards now communicate title, category, short desc, stack, role dimension
  (`Full-stack · AI pipeline…` / codename fallback), status pill
  (active/complete/maintained/archived), and Case-Study + GitHub CTAs. Flagship
  pair visually dominates (CCTV-X photo spread vs OrchestraAI runtime canvas);
  secondaries use coherent 5-node mini system maps. Archive card routes the tail.
- Case studies: sticky reading-progress bar (rAF, hidden-tab paused,
  reduced-motion path), sticky auto-TOC from `h2.cs-sec-title` (excludes the
  link-only footer so no phantom "Section 6"), existing prev/next retained,
  lightweight SVG/CSS diagrams only, mobile single-column verified.
- Recruiter (`/recruiter`) redesigned as a 60-second briefing: compact Contact +
  View-résumé CTA (no oversized email button), 4-cell At-a-glance grid
  (availability/location/education/strongest), Signature-evidence list with
  01–04 numbering + FLAGSHIP/SELECTED tags + status, capabilities as chips (no
  dense paragraphs), experience + education placement fixed, contact card, print
  CSS retained and extended.
- Credentials/contact/chat/palette verified via fresh production screenshots
  (localhost:8080, rebuilt images): archive filterable, credential cards show
  issuer/title/date/category/ID with lazy images and viewer-only PDFs, contact
  panels + validated form, Ask/Interview tabs with suggestions/history/links/
  loading/failure/retry/grounded fallback, palette keyboard-accessible.

### Admin control center
- Nav regrouped to CONTENT / INBOX / AI / ANALYTICS / SECURITY / SYSTEM so the
  six operational domains are visually distinct (was Home/Content/Inbox/System).
- Projects admin already had tabs, validation, unsaved-change guard, preview,
  draft/publish, order field + sort, clone, archive status, and delete confirms;
  added signature/archive badges so curation is visible without code.

### Production / Oracle
- Rebuilt `api` + `web` images from the working tree; verified
  `GET /api/health` + `/health` (liveness, no DB) and `GET /api/ready` +
  `/ready` (DB SELECT 1, 503 when down) against the running stack.
  Compose keeps DB on `127.0.0.1:5432`, API on `127.0.0.1:4000`, resource
  limits + log rotation intact. No Netlify-specific behavior.
- Perf: no new deps; homepage still splits ProjectCase/ProjectArchive/
  CredentialArchive/ChatWidget + per-section admin chunks (index ~214kB,
  router ~180kB, gsap ~70kB, case ~54kB, admin ~42kB). Images lazy except
  CCTV-X hero (eager, sized), PDFs viewer-only, public GETs cached 60s + SWR.

### Visual QA (fresh, inspected — not just exit codes)
- Captured + inspected on the rebuilt production stack (1440px + 390px):
  home hero, home work (flagship pair correct), archive (01–06 order correct,
  mob legacy / brain experiment), all four signature case studies, credentials,
  recruiter + scrolled recruiter, contact, chat, palette, private login, mobile
  home/work/recruiter/case. No horizontal overflow, no overlapping controls,
  no desktop-inbox-on-phone (admin inbox is desktop list+detail with mobile
  overlay — retained), no giant decorations.

---

## Prior pass (retained below)

## 1. Major changes

### AI provider control (REQUIRED, new)
- New `AiProviderConfig` Prisma model + migration `20260929000000_ai_providers`
  (name unique, kind, baseUrl, model, apiKeyEnc, keyHint, temperature, maxTokens,
  timeoutMs, systemPrompt, enabled, priority, isFallback, health/latency/error).
- AES-256-GCM encryption at rest (`apps/api/src/modules/ai-providers/secrets.ts`,
  key from `AI_CONFIG_KEY` or `SESSION_SECRET`-derived SHA-256; format
  `iv:tag:cipher` base64). Masked display `****last4` only.
- Full CRUD API at `/api/ai-providers` (reads: `content:read`; writes/tests/
  rotate/delete: `ADMIN` + CSRF + rate limits). List/detail never return raw keys.
  `POST /:id/test` supports `connection` (`/models` → completion fallback) and
  `model` (minimal `/chat/completions`) probes with latency + health persistence.
  `POST /:id/rotate` replaces ciphertext explicitly. Env fallback
  (`LLM_PROVIDER/KEY/MODEL/BASE_URL`, now incl. `openrouter` + `nvidia`) remains
  when no DB provider is enabled.
- New admin UI `AiProvidersAdmin.tsx` (lazy chunk ~14 kB): add/edit, enable/disable,
  test connection/model, rotate, delete, priority + fallback flags, health/latency/
  error display, env-fallback card. Wired into nav (System → AI providers,
  ADMIN-only), command palette, titles, routes.
- Chat engine now uses `getLlmProviders()` → `completeWithFallback()` priority chain:
  DB providers (primary by priority, fallbacks last) → env → deterministic
  knowledge-base. Shared zod schemas `aiProviderCreate/UpdateSchema`.

### AI interview mode (new)
- Backend `POST /api/chat/interview` (`start|answer|end`, history ≤40, rate-limited,
  chat-toggle aware): LLM-grounded one-question-at-a-time when a provider exists
  (strict JSON `{reaction, question, done}`, grounded context, no scores), else a
  deterministic follow-up bank keyed to surveillance/RAG/backend/frontend/DevOps/
  experience/security + generic depth probes, auto-close after ~8 turns.
- Frontend `ChatWidget` tabs Ask | Interview: start, answer textarea, reaction +
  single question display, end, clear, focus-trap + Escape + aria. No scores or
  rankings anywhere (verified by test).

### Messages inbox (premium pass)
- Added Prev/Next toolbar with position (`k/j` + arrows, `e` archive, `a` read-toggle),
  `aria-activedescendant` preserved, retry-send button on reply failure, explicit
  "Sending… (do not close)" state, `.ctl-detail-nav` styling. Existing search,
  filter, sort, unread styling, bulk bar, pagination, reply history, confirmations,
  mobile list→detail overlay retained and verified.

### Public site
- Homepage now code-splits `ProjectCase`, `ProjectArchive`, `CredentialArchive`,
  `ChatWidget` (Suspense fallbacks); admin + recruiter were already split. Confirmed
  no Three.js/WebGL dependency (only GSAP `once:true` reveals, reduced-motion safe).
- Recruiter (`/recruiter`): key-facts row (availability pill, location, strongest
  skills), selected credentials section, retained 30–60s scan + print CSS.
- Resume viewer confirmed lazy (iframe only when open, fallback + mobile bar).
- About portrait already carries `width/height` + `loading=lazy` (CLS-safe).

### Performance
- Vite manual chunks: `gsap`, `router`, per-route admin chunks; prod build:
  index ~213 kB (React), router 180 kB, gsap 70 kB, case 52 kB, admin 41 kB, chat
  8.7 kB, AI admin 14 kB. Homepage avoids admin/case/chat payloads until needed.
- Backend: public content GETs `Cache-Control: public, max-age=60,
  stale-while-revalidate=120` + `Vary: Origin`; private routes (`auth/contact/
  stats/media/settings/chat/github/ai-providers/events`) stay `no-store`.
- No new dependencies. No fonts/third-party requests (system stack).

### Security
- `GET /api/ai-providers` requires `content:read`; all writes `ADMIN`-only,
  server-enforced (frontend hiding grants nothing). Audit `sanitizeMeta` extended
  (`apikeyenc`, `llm_api_key`, `resend_api_key`); provider audits log names/keys
  changed only, never key material. Probe errors truncated to 300 chars.
- Secrets: never in localStorage/sessionStorage/frontend env/client responses/logs/
  analytics/audit. `AI_CONFIG_KEY` documented in `.env.example`.
- Liveness `/api/health` + `/health` (cheap, no DB) vs readiness `/api/ready` +
  `/ready` (DB `SELECT 1`, 503 when down). Docker healthchecks use liveness.

### Deployment (Oracle-ready)
- `docker-compose.yml`: DB bound to `127.0.0.1:5432` (local dev/tests reachable,
  never LAN/internet-exposed); API bound to `127.0.0.1:4000` with proxy note;
  `POSTGRES_PASSWORD` + `AI_CONFIG_KEY` + `UPLOAD_DIR` wired; `deploy.resources`
  limits (api 1 CPU/512M, web 0.5 CPU/256M); `json-file` log rotation on all
  services. Reverse-proxy (NGINX/Caddy) + HTTPS notes retained.

## 2. Architecture changes
- `chat/llm.ts`: env-only → DB-first provider chain with `completeWithFallback`.
- New modules: `ai-providers/{secrets,store,routes}`, `chat/interview.ts`.
- `app.ts`: registers ai-providers, split health/ready, public-cache hook.
- Shared: `AiProvider`, `InterviewReply`, `aiProviderKindValues`,
  `aiProviderCreate/UpdateSchema`, `interviewSchema`.
- Web: `api.interview` + `api.admin.aiProviders*`, lazy heavy routes, chat tabs.

## 3. Performance improvements
- Route-level splitting for all heavy public routes + assistant; measured chunks above.
- 60s shared cache on public GETs reduces DB + TTFB behind proxy.
- GSAP stays reveal-only, `once:true`, reduced-motion bypass, no canvas loops.
- Images: portrait sized + lazy; PDF iframe only on open.

## 4. Security improvements
- ADMIN-only provider writes, masked keys, encrypted at rest, no secret logging.
- Health/ready split avoids DB load on liveness probes.
- DB/API loopback bindings; resource limits; log rotation.
- Interview input length-capped, injection-pattern sanitized via shared engine path.

## 5. AI architecture
- Browser → `POST /api/chat` or `/api/chat/interview` → backend only.
- Backend: knowledge (`buildKnowledge`, 30s cache) → retrieval → deterministic
  composer OR provider chain (DB priority → env) with grounded system prompt,
  injection stripping, UNKNOWN fallback, provider-failure degradation.
- Interview: transcript (last 12) + context → JSON reaction/question/done;
  deterministic bank fallback guarantees function with zero providers.

## 6. Admin improvements
- New AI providers section (see above) + palette entries.
- Messages: prev/next, position, keyboard (`j/k/e/a`), retry, sending state.
- Settings page copy now points at `/private/ai-providers` for keys (env-managed
  note retained for fallback).

## 7. Deployment changes
- Compose hardening (above); `.env.example` documents `AI_CONFIG_KEY` +
  OpenRouter/NVIDIA; `/health` + `/ready` for Oracle/NGINX probes.
- Migration `20260929000000_ai_providers` verified with `migrate deploy` locally.

## 8. Tests performed
- `npm run typecheck` — pass (shared/api/web).
- `npm run build` — pass; chunk inventory recorded above.
- API: 43/43 pass on local `hp_os_test` (incl. new `ai providers` masked-key/
  RBAC/rotate/disable/delete round-trip + `interview` start/answer no-scores;
  fixed `health` expectation for new `time` field, added `ready` test).
- Web: 16/16 pass. Lint = typecheck per repo scripts (pass).
- Manual code QA: no `any`, no debug code, no frontend key references outside
  `AiProvidersAdmin`, focus/keyboard/reduced-motion/mobile overlays reviewed.
- E2E (Playwright) not re-run here (requires full seeded stack + browsers);
  existing `e2e/` specs untouched; new API coverage added instead.

## 9. Remaining known limitations
- E2E/visual snapshots not re-executed in this pass — run `npm run e2e` against a
  seeded staging stack before release; verify `/recruiter` print + 320–1440px
  breakpoints manually.
- Production Supabase/remote DBs still need `prisma migrate deploy` for the new
  `AiProviderConfig` table (local dev/test DBs already migrated).
- `router` chunk (~180 kB) stays on the critical path (react-router-dom); further
  cuts would require router replacement — not justified.
- AI answers remain retrieval-grounded; without any provider configured the
  assistant is deterministic (by design, not a gap).
- `AI_CONFIG_KEY` rotation requires re-encrypting stored keys (decrypt with old,
  encrypt with new) — no automated rotation job yet.
