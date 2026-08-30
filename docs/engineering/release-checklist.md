# Release Checklist

## Pre-Release Verification

### Build & Type Safety
- [ ] `npm run typecheck` — 0 errors across shared, api, web
- [ ] `npm run lint` — 0 errors across all workspaces
- [ ] `npm run build` — clean production build (shared → api → web)

### Tests
- [ ] `npm run test` — all unit tests pass (web: 14, api: 31)
- [ ] `npm run e2e` — all 68 E2E tests pass (6 viewports × 8 routes + interactive surfaces)

### Security
- [ ] `SESSION_SECRET` is a strong random value (not placeholder)
- [ ] `ADMIN_PASSWORD` is at least 12 characters
- [ ] No secrets in `.env.example`
- [ ] `.env` is in `.gitignore`
- [ ] CSRF double-submit working (X-CSRF-Token header matches hp_csrf cookie)
- [ ] Session cookies are httpOnly + Secure in production
- [ ] Rate limiting active on login, contact, chat, analytics endpoints
- [ ] Honeypot field present in contact form
- [ ] Admin routes require authentication + CSRF

### Functionality
- [ ] Hero renders with name, tagline, CTAs
- [ ] All 7 home sections load and display correctly
- [ ] Project case studies open with tabs (overview, architecture, decisions, security, results)
- [ ] Certificate vault filters, searches, and opens viewer
- [ ] Chat widget opens, sends questions, receives answers, shows sources
- [ ] Command palette (Cmd+K) opens, searches, navigates
- [ ] Contact form validates, submits, shows success/error states
- [ ] Recruiter view renders at `/recruiter`
- [ ] Admin login works at `/private`
- [ ] Admin CRUD operations work for all entities

### Responsive Design
- [ ] Desktop (1440×900, 1280×800, 1024×768) — no horizontal overflow
- [ ] Tablet (768×1024) — proper layout adaptation
- [ ] Mobile (430×932, 390×844) — mobile nav, touch targets, no overflow

### Accessibility
- [ ] Skip link works
- [ ] All modals have focus trap + Escape + focus restoration
- [ ] All form fields have associated labels
- [ ] Error messages are associated with fields (aria-describedby)
- [ ] Reduced motion mode works (Three.js pauses, CSS animations disabled)
- [ ] Color contrast meets WCAG AA

### Performance
- [ ] Three.js is lazy-loaded
- [ ] Admin dashboard is code-split
- [ ] Recruiter page is lazy-loaded
- [ ] Images use lazy loading
- [ ] No layout shifts from deferred content

---

## Deployment

### Netlify (Web)
- Build: `npm run build --workspace @hp/web`
- Publish: `apps/web/dist`
- Redirects: `/* → /index.html` (SPA fallback)

### API Host (Render/Railway/Fly.io)
- Build: `npm ci && npm run db:generate && npm run build`
- Start: `node apps/api/dist/apps/api/src/server.js`
- Health check: `GET /api/health`
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `NODE_ENV=production`

### Database
- `npm run db:migrate` — apply pending migrations
- `npm run db:seed` — seed initial content
- `npm run admin:create` — create admin account

---

## Post-Release
- [ ] Verify production URL loads correctly
- [ ] Test admin login in production
- [ ] Verify contact form works end-to-end
- [ ] Check certificate images load
- [ ] Verify HTTPS + secure cookies
- [ ] Monitor error logs for first 24 hours
