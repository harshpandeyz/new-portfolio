# Release Readiness — HP//OS Portfolio

> **Correction (2026-08-30):** the previous "READY" verdict was withdrawn because
> the `e2e/visual-qa.spec.ts-snapshots/` suite was **silently untrustworthy**.
> Read "Defect Found & Fixed" below before trusting any visual regression gate
> recorded here.

## Defect Found & Fixed

**What was actually broken:** `apps/web/src/lib/motion.ts` `bindReveals()` gates
every `[data-reveal]` element at `opacity: 0` and reveals it only when a
`ScrollTrigger` `once: true` crossing fires (start `"top 88%"`). That is
intentional scroll-reveal behavior — but `e2e/visual-qa.spec.ts` took each
`fullPage` screenshot at `scrollY: 0` without ever scrolling, so every section
below the first viewport was captured as a **fully blank, background-only gap**. The
suites "passed" because `--update-snapshots` happily wrote those blank frames as
the new baseline. The visual-regression gate therefore proved nothing about the
rendered layout.

**How it was fixed (in order):**

1. **`e2e/visual-qa.spec.ts`** — added `settleReveals()`: for every route in
   `ROUTES` (not just `/`), the test now drives real scroll physics before each
   capture — `page.mouse.wheel()` down in 7 steps so every `once: true` trigger
   crosses and fires, waits ~900ms for the GSAP tweens to settle, then jumps
   back to the top with `behavior: "instant"` and captures. Reveals are
   one-shot, so content stays visible in the full-page frame.
2. **`apps/web/src/lib/motion.ts`** — `bindReveals()` now schedules a deferred
   `ScrollTrigger.refresh()` after binding. `refresh()` recomputes trigger
   positions against final paint and fires `onEnter` for anything already past
   its start, so an element is never stuck at `opacity: 0` because its crossing
   happened before its trigger existed.
3. **`apps/web/src/App.tsx`** — the reveal effect now refreshes ScrollTrigger
   again once `window.load`, `document.fonts.ready`, and all lazy
   `img[loading=lazy]` resolve (async content can shift layout after the initial
   bind). Verified empirically that a post-settle sweep of all 50 `[data-reveal]`
   elements reports `opacity: 1` (0 hidden).
4. **Deep-link navigation** — fresh loads of `/#work`, `/#credentials`, `/#contact`
   etc. were NOT scrolling to the section (a real bug for shareable URLs). App now
   handles `location.hash` after content loads (waiting for fonts to settle, since
   scrolling against pre-settle geometry stopped short), retries/verifies the
   scroll landed, and falls back to an instant jump. Verified: every `/#…` route
   lands with the section top at ~96px (scroll-margin) and its reveals already fired.
5. **Second defect found while re-verifying (WebGL never settles)** — the hero's
   live `CoreScene` canvases run a continuous `frameloop="always"` rAF/WebGL loop.
   Playwright's `animations:"disabled"` only freezes CSS animations, so on desktop
   viewports where the canvas mounts, `toHaveScreenshot` timed out on
   "two consecutive stable screenshots" (the canvas is always changing). Fixed in
   `CoreScene.tsx`: the loop(s) now honor `data-qa-static` on `<html>` (set by the
   visual-qa spec) — `frameloop="never"` + `paused` when set — freezing the core at
   its current frame so a full-page capture can stabilize.
6. **Snapshots** — deleted the broken frames and regenerated with `--update-snapshots`
   under the final capture flow (54/54), then verified **twice** with clean runs
   (no `--update`) to certify the baselines don't depend on timing. Before accepting,
   `home-desktop-lg`, `work`, and `credentials` were inspected: every section renders
   real content (see "Snapshot Inspection" below).

## Final Gate Results (post-correction)

```
npm run typecheck   → ✓ 0 errors (shared, api, web)
npm run lint        → ✓ 0 errors (shared, api, web) — NOTE: lint = tsc --noEmit, NOT ESLint
npm run test        → ✓ 45/45 pass (14 web + 31 API)
npm run build       → ✓ clean production build (1.6s)
npm run e2e         → ✓ 68/68 pass (incl. visual-qa with scroll-settled captures)
```

---

## Exact Commands Executed

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✓ 0 errors |
| `npm run lint` | ✓ 0 errors |
| `npm run test` | ✓ 45/45 pass |
| `npm run build` | ✓ built in 1.6s |
| `npm run e2e` | ✓ 68/68 pass |
| `npx playwright test e2e/visual-qa.spec.ts --update-snapshots` | ✓ 54/54 pass (shell deleted broken blank frames first; regenerated with scroll-settled captures) |

---

## Files Changed (This Session)

### Visual QA / Reveal Reliability Fix (root cause: blank below-fold snapshots)
| File | Change |
|------|--------|
| `e2e/visual-qa.spec.ts` | Added `settleReveals()` — drives real scroll physics (re-measured steps to the bottom, nudge loop until 0 hidden `[data-reveal]`) before every fullPage capture, then returns to top; sets `data-qa-static` to freeze WebGL core canvases; applied to every route in `ROUTES` |
| `apps/web/src/lib/motion.ts` | `bindReveals()` schedules a deferred `ScrollTrigger.refresh()` after binding so positions track final paint and in-view elements are revealed via refresh, not fragile crossing timing |
| `apps/web/src/App.tsx` | Reveal effect re-refreshes ScrollTrigger after `load`/`fonts.ready`/lazy-image settle; added `location.hash` deep-link scrolling on fresh load (waits for fonts, verifies landing, instant-jump fallback) so `/#work` etc. are shareable |
| `apps/web/src/components/three/CoreScene.tsx` | WebGL hero/core canvases honor `data-qa-static`: `frameloop="never"` + `paused` so the continuous rAF loop can be frozen for screenshot stability |
| `apps/web/src/styles/surface.css` | Added `#main section[id] { scroll-margin-top: 96px }` so deep links and nav land clear of the floating topbar |
| `e2e/visual-qa.spec.ts-snapshots/` | **Deleted broken blank frames, regenerated 54/54** with scroll-settled captures |

### Bug Fixes
| File | Change |
|------|--------|
| `apps/web/src/features/projects/ProjectMedia.tsx` | `useRef` → `useState` for error state; added `hidden` attr on errored img |
| `apps/web/src/components/ui/Button.tsx` | Added default `type="button"` |
| `apps/web/src/components/ui/Dialog.tsx` | Moved `role="dialog"` + `aria-modal` from overlay to panel |
| `apps/web/src/lib/data.tsx` | Used `useRef` for stable `load` reference in context |
| `apps/web/src/features/contact/ContactForm.tsx` | Added field-level errors with `aria-describedby`, `aria-required` |
| `apps/web/src/features/projects/ProjectCase.tsx` | Added h1 for loading/not-found states; fixed empty alt text |
| `apps/web/src/components/ErrorBoundary.tsx` | Added `role="alert"` for screen readers |
| `apps/web/src/features/admin/AdminApp.tsx` | Added `aria-current="page"` to active nav links |
| `apps/web/src/components/navigation/TopBar.tsx` | Added close button to mobile nav sheet |
| `apps/web/src/features/home/Work.tsx` | Fixed heading hierarchy (h3→h2 for archive section) |

### Accessibility
| File | Change |
|------|--------|
| `apps/web/src/components/hud/CommandPalette.tsx` | Removed deprecated `role="document"`; added combobox ARIA pattern |
| `apps/web/src/components/three/CoreScene.tsx` | Added `reducedMotion` prop, pauses all animations when true |
| `apps/web/src/features/home/Hero.tsx` | Passes `reducedMotion` to CoreScene |
| `apps/web/src/components/document/ResumeViewer.tsx` | Added `sandbox` attribute to iframe |
| `apps/web/src/styles/redesign.css` | Added `.chat-panel` to reduced-motion query; added `.nav-sheet-close` styles |

### Security
| File | Change |
|------|--------|
| `apps/api/src/modules/contact/routes.ts` | Added existence checks before update/delete |
| `apps/api/src/modules/chat/engine.ts` | Added prompt injection sanitization; added LLM error logging |
| `apps/api/src/utils/http.ts` | Added `console.error` for audit write failures |
| `apps/api/src/config.ts` | Added production SESSION_SECRET placeholder rejection |

### CSS
| File | Change |
|------|--------|
| `apps/web/src/styles/main.css` | Removed dead `chat.css` import |
| `apps/web/src/styles/base.css` | Added `.input-err` and `.field-error` error state styles |

### Documentation
| File | Change |
|------|--------|
| `docs/engineering/production-audit.md` | Created comprehensive audit document |
| `docs/engineering/release-checklist.md` | Created pre-release verification guide |
| `docs/engineering/final-qa.md` | Created test results and bug fix record |

### Visual Regression
| File | Change |
|------|--------|
| `e2e/visual-qa.spec.ts-snapshots/` | Regenerated 54/54 from the final capture flow (WebGL frozen + scroll-settled); certified by two consecutive clean runs — prior baselines were blank below the fold and unstable (see "Defect Found & Fixed") |

### Snapshot Inspection (home-desktop-lg, 1280×800, full page 11171px)
Before accepting the new baseline, non-white pixel analysis of `home-desktop-lg-darwin.png` confirmed real content in every section:

| Section (y range) | Avg non-white pixels | Observation |
|------|------|------|
| hero (0–800) | 31.5% | Title block, nav, dark core-display panel |
| work (800–3245) | 5.6% | Section header, flagship card, spec-sheet project art, index-led archive rows |
| about (3245–4881) | 13.8% | Bio copy + stat/evidence chips |
| capabilities (4881–6007) | 3.8% | Skill gauges + colored group rails |
| journey (6007–7833) | 4.4% | Timeline rows |
| credentials (7833–9309) | 11.0% | Certificate cards |
| contact (9309–10338) | 11.5% | Form fields |
| exit (10338–11005) | 99.2% | Dark terminal band |

The only near-blank rows in the page are the five 200px seams *between* sections
(design whitespace) plus the empty center of the white spec-sheet art panels —
**no blank gap exists inside any section's content area**. A post-settle DOM sweep
confirms all 50 `[data-reveal]` elements report `opacity: 1` and the
`.secondary-projects` cards + `.project-art` frames are present at y=1741–2460.
The visual-qa gate now runs twice green in a row against these baselines.
(`work` and `credentials` route snapshots render the identical page; deep-link
tests additionally assert the URL scroll lands on-section.)

---

## Tooling Truthfulness

| Script | What It Actually Executes | Is It Accurate? |
|--------|--------------------------|-----------------|
| `npm run typecheck` | `tsc --noEmit` across shared, api, web | ✓ TypeScript type-checking |
| `npm run lint` | `tsc --noEmit` across shared, api, web | ⚠ Identical to typecheck — NOT ESLint |
| `npm run test` | `vitest run` (web: 3 files, api: 1 file) | ✓ Unit + API tests |
| `npm run build` | `tsc` (shared, api) + `tsc && vite build` (web) | ✓ Production build |
| `npm run e2e` | `tsc` (shared) + `playwright test` | ✓ Browser E2E tests |

**Note:** There is no ESLint or other linter configured in this project. `npm run lint` is TypeScript type-checking only. This is honest and sufficient for a strict-ts codebase with `noUncheckedIndexedAccess`.

---

## Repository Hygiene

| Check | Status |
|-------|--------|
| `.env` not tracked in git | ✓ |
| `node_modules/` not tracked | ✓ |
| `dist/` not tracked | ✓ |
| `test-results/` not tracked | ✓ |
| `.DS_Store` not tracked | ✓ |
| `__MACOSX` artifacts | ✓ None found |
| `.gitignore` correct | ✓ |
| `.dockerignore` correct | ✓ |
| `package-lock.json` tracked | ✓ |
| No duplicate assets | ✓ (resume/photo exist in `public/files/` for SPA serving) |
| Dead `chat.css` import removed | ✓ |

---

## Security Posture

| Control | Status | Notes |
|---------|--------|-------|
| Session tokens | ✓ | SHA-256 hashed, httpOnly, 7-day expiry |
| CSRF | ✓ | Double-submit with HMAC, timing-safe compare |
| Password hashing | ✓ | bcrypt, 12 rounds |
| Login rate limiting | ✓ | 8 attempts / 15 min / IP |
| Contact rate limiting | ✓ | 5 / 10 min / IP + 3 / hour / email |
| Chat rate limiting | ✓ | 12 / min / IP |
| Honeypot | ✓ | Contact form anti-bot field |
| Admin authorization | ✓ | `requireAdmin` hook on all admin routes |
| Input validation | ✓ | Zod schemas via `@hp/shared` |
| Upload validation | ✓ | MIME whitelist, size limit, filename sanitization |
| Error leakage | ✓ | 500 handler returns generic message, no stack traces |
| CORS | ✓ | Explicit origin allowlist |
| Helmet headers | ✓ | `X-Content-Type-Options`, `Referrer-Policy` |
| Production secret validation | ✓ | Rejects placeholder `SESSION_SECRET` values |
| Prompt injection defense | ✓ | Sanitizes user input before LLM prompt |

---

## Production Build Characteristics

| Chunk | Size (gzip) |
|-------|-------------|
| index.css | 13.7 KB |
| index.js (main) | 54.4 KB |
| three.js (lazy) | 220.2 KB |
| gsap.js (lazy) | 27.7 KB |
| admin.js (lazy) | 59.1 KB |
| AdminApp.js (lazy) | 8.8 KB |
| CoreScene.js (lazy) | 1.8 KB |
| Recruiter.js (lazy) | 1.5 KB |

---

## Remaining Non-Critical Issues

| Severity | Issue | Rationale for Not Fixing |
|----------|-------|--------------------------|
| Low | `tokens.css` has ~16 unused tokens | Dead code, not harmful, no runtime cost |
| Low | Hardcoded color/spacing values in `sections.css` | Cosmetic, not functional, would require CSS cascade changes |
| Low | `.DS_Store` files in working directory | In `.gitignore`, will not be committed |
| Low | `chat.css` file still exists on disk | Import removed from `main.css`, file is inert |
| Low | iOS Safari scroll-through on modals | Known platform bug, requires `touchmove` prevention — high effort, low impact for portfolio |
| Low | Login rate limit is IP-only | Acceptable for single-user admin panel |

---

## Local Startup Procedure (Clean Clone)

```bash
# Prerequisites: Node ≥ 20, Docker
git clone <repo-url> && cd portfolio
npm ci
cp .env.example .env
# Edit .env: set SESSION_SECRET=$(openssl rand -hex 32), ADMIN_PASSWORD
docker compose up -d db
npm run db:generate --workspace @hp/api
npm run db:migrate
npm run db:seed
npm run admin:create -- --email admin@harshpandey.dev --password "your-secure-password"
npm run dev
# → Web: http://localhost:5173
# → API: http://localhost:4000
```

---

## Final Release Readiness

**READY (post-correction)**

Preceded by a render-integrity regression that was found and fixed — the
visual-qa baseline previously captured blank below-fold sections (see "Defect
Found & Fixed"). That gate is now trustworthy. The application:
- Builds cleanly
- Passes all 45 unit/API tests
- Passes all 68 E2E tests (6 viewports × 8 routes + interactive surfaces), with
  scroll-settled visual captures verified to render real content in every section
- Has no type errors
- Has correct git hygiene
- Has documented security model
- Has accessible keyboard/focus/ARIA patterns
- Has reduced-motion support
- Has production secret validation
- Can be cloned and installed cleanly

---

*Generated: $(date -u "+%Y-%m-%d %H:%M UTC")*
