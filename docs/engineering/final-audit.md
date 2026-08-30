# Engineering Portfolio — Forensic Audit

## Executive Summary

This document captures the state of the repository at `/Users/harsh/Desktop/harsh_project/portfolio-idea` as a principal engineer, product designer, UX architect, accessibility engineer, performance engineer, and CTO. The portfolio is substantially redesigned but contains several implementation defects, design inconsistencies, and accessibility/performance risks that must be resolved before declaring the project "done."

**Overall status**: The build passes (typecheck, lint), existing E2E/web tests pass, but there are critical functional bugs, visual defects, and architectural debts that must be fixed.

---

## Dependency Map: route → page → components → hooks → API/data → styles

```
/                              → Home (Hero, Work, About, Capabilities, Journey, Credentials, Contact, Closing)
  ↘ /projects/:slug            → ProjectCase (case study with tabs, diagram, sections)
  ↘ /recruiter                  → Recruiter (printable résumé summary)
  ↘ /                          → Home (same as /)

Home → Hero (CoreScene 3D, hero-content) → Work → About → Capabilities → Journey → Credentials → Contact → Closing

Components involved:
- ui: Button, Badge, IconButton, EmptyState, StatusMessage, Skeleton, Icon, IconButton, IconExternal, IconArrowRight/Left, IconClose, IconDownload
- hud: CommandPalette, ChatWidget, PrivateAccess, AchievementToasts
- layout: TopBar, Footer
- features/home: Hero, Work, About, Capabilities, Journey, Credentials, Contact, ContactForm, ContactChannels, Closing
- features/projects: ProjectCard, ProjectMedia, ProjectCase, FlagshipProject
- features/admin: AdminApp, fields, login, media, overview, projects, skills, timeline, messages, certificates
- features/recruiter: Recruiter
- features/contact: Contact, ContactForm, ContactChannels
- features/credentials: CredentialViewer, CredentialCard
- lib: useData, api, format, seo, motion, device, achievements, scroll
- hooks: useFocusTrap, useKeyboardShortcut, useModal, useMediaQuery, useReducedMotion, useScrollLock
- styles: tokens.css, base.css, navigation.css, hud.css, sections.css, redesign.css, chat.css, admin.css
- three: CoreScene
- api: projectRoutes, contactRoutes, chatRoutes, mediaRoutes, etc.
- prisma schema: Profile, Project, Certificate, Skill, Education, TimelineItem, ContactMessage, etc.
```

---

## Dead Code

| File/Feature | Issue |
|---|---|
| `components/hud/PrivateAccess.tsx` | Private access modal - verify usage and necessity |
| `lib/motion.ts` + `lib/scroll.ts` | Motion/scroll triggers bound in App.tsx; verify they don't leak |
| `styles/hud.css` | Several keyframe animations (overlay-in, panel-in, chat-in, toast-in) — verify all are used |
| `styles/navigation.css` | `.nav-sheet` defined twice: once here and once in `redesign.css` — redesign.css overrides |
| `styles/chat.css` | Empty file — comment says "moved to hud.css", keep for import compatibility or remove |
| `apps/web/src/lib/api.ts` | Need to inspect — may have unused endpoints |

---

## Duplicated CSS

| Duplicated selector | Locations |
|---|---|
| `.nav-sheet` | `navigation.css:99-112` and `redesign.css:33-44` — redesign.css overrides with different `animation` |
| `.icon-btn` | `base.css:31-36` (button base) and `redesign.css:105-140` (icon-button specific) — base provides general button styles, redesign adds icon-btn specifics |
| `.section` + `.section-head` | `base.css:104-107` and `sections.css` — sections.css adds project-specific adaptations |
| `.dialog-overlay` + `.dialog-panel` | `redesign.css:69-95` and implicit base styles — redesign.css is the primary definition |
| `.capability-card` | `sections.css:502-518` and implicit base styles |
| `.vault-item` | `sections.css:647-665` and implicit base styles |

**Resolution**: Consolidate all CSS into a single coherent system. `redesign.css` should import from the token system and override only what's necessary, not duplicate base styles.

---

## Inconsistent Design Tokens

| Token | Issue |
|---|---|
| Color values | Generally consistent across tokens.css, but some are duplicated in redesign.css as hardcoded values |
| Radius values | Consistent scale in tokens.css (xs through 2xl + pill + circle) |
| Shadow values | Consistent layered shadow system in tokens.css |
| Breakpoints | Consistent scale in tokens.css (xs through 2xl) |
| Typography | Fluid type scale with clamp() in tokens.css, but some hardcoded values in sections.css |
| Spacing | 4px base unit scale in tokens.css, but some hardcoded values in sections.css |

**Resolution**: All components should consume tokens from the token system. Hardcoded values should be replaced with token references where safe.

---

## Brittle Data Structures

| Area | Issue |
|---|---|
| `lib/format.ts` | `formatTaxonomy` uses regex `split(/\s*[\/_]\s*/)` to parse taxonomy strings — fragile if the database format changes. Should use structured metadata where practical. |
| `Project.category` | String field in Prisma/schema — no enum constraint at DB level. Relies on `projectInputSchema` zod validation in API. |
| `Project.tier` | String field with values from `ProjectTier` type — validated via zod at API level only. |
| `Project.status` | String field with values from `ProjectStatus` — similar situation. |
| `Skill.level` | String enum: "core" | "working" | "exploring" | "experimental" — validated at API level. |
| `Skill.category` | String enum with 10 categories — validated at API level. |

**Resolution**: Where stable domain concepts exist, use appropriate enums/types. The Prisma schema and shared types are generally well-defined, but the regex-based taxonomy parsing in `formatTaxonomy` should be replaced with structured metadata.

---

## One-Off Styling

| Component | Issue |
|---|---|
| `.project-art` in sections.css | Complex hardcoded gradients and absolute-positioned pseudo-elements — should reference design tokens where possible |
| `.case-snapshot` in sections.css | Hardcoded grid layout that could benefit from token-based spacing |
| `.contact-channel` in sections.css | Hardcoded grid template with `auto 120px 1fr auto` — should use responsive tokens |
| `.evolution` in redesign.css | Hardcoded linear-gradient background — should use token-derived values |

---

## Accessibility Bugs

| Issue | Severity | Location |
|---|---|---|
| Duplicate Escape handling between Dialog/focus-trap/keyboard hooks | Medium | `Dialog.tsx` uses `useKeyboardShortcut`, `CommandPalette.tsx` has its own `keydown` listener |
| Image error state in ProjectMedia.tsx | High | `onError` sets `style.display = "none"` — hides image instead of showing fallback |
| Focus restoration in modals | Medium | `useModal.ts` restores focus via `openerRef.current?.focus?.()` but needs verification |
| CommandPalette icon `aria-hidden="true"` on base svg | Low | `icons.tsx` sets `"aria-hidden": true` by default — consumer must override |
| Missing `scope` attribute on fieldsets if used | Low | Check admin forms |
| Color contrast | Verify — tokens use `#1d1d1f` text on `#f5f5f7` bg (contrast ratio ~8.5:1, acceptable) |

---

## Interaction Bugs

| Issue | Location |
|---|---|
| ProjectMedia image onError hides instead of showing fallback | `ProjectMedia.tsx:32-34` |
| CommandPalette keyboard navigation may have focus trap issues | `CommandPalette.tsx:58-89` |
| Tab buttons in ProjectCase need correct active state styling | `sections.css:836-838` |

---

## Responsive Problems

| Breakpoint | Issue |
|---|---|
| `max-width: 720px` in base.css | Hides `.topbar-nav`, shows `.mobile-menu-btn` |
| `max-width: 620px` in base.css | Adjusts education layout |
| Multiple media queries across CSS files | Need to consolidate and ensure consistency |

---

## Visual QA Flaws

| Issue | Impact |
|---|---|
| Full-page screenshots can mislead when scroll-triggered content starts hidden | `visual-qa.spec.ts` uses `fullPage: true` with `animations: "disabled"` |
| Threshold `0.2` may be overly permissive | May hide real visual regressions |
| Deterministic testing not fully configured | Three.js animation not frozen, non-deterministic randomness in CoreScene |

---

## Performance Risks

| Risk | Impact |
|---|---|
| Three.js CoreScene renders on every page — not lazy-loaded for sub-pages | Initial JS bundle includes three.js regardless of page |
| GSAP reveals triggered on every home page load | May cause layout thrashing |
| Chat widget and command palette CSS always loaded | Not code-split for non-interactive pages |
| `fullPage: true` screenshots in visual-QA may capture large assets |  |

---

## Security/Configuration Risks

| Risk | Impact |
|---|---|
| Upload MIME types not signature-verified | `apps/api/src/modules/media/` — need to verify |
| IP/chat logs retention | `ChatQueryLog` model retains all queries |
| No rate-limiting on API root endpoints | Only contact and chat have rate limiting |
| Cookie-based auth sessions | Verify `sessions` model and expiry |

---

## Unnecessary Assets

| Asset | Issue |
|---|---|
| `CERTIFICATES/` directory at root | May contain duplicate generated artifacts |
| `test-results/` directory | Should be in `.gitignore` |
| `playwright.config.ts` not examined fully | Need to verify test setup |

---

## Recommended Fix Priority

### P0 (Critical - functional bugs)
1. **ProjectMedia image fallback** — `onError` hides instead of showing fallback
2. **Duplicate Escape handling** — consolidate between Dialog and CommandPalette

### P1 (High - visual/accessibility)
3. **CommandPalette icons** — replace string glyphs with shared icon system
4. **ProjectCase tab styling** — verify `.case-tab` active state
5. **Architecture diagram semantics** — ensure accessible data flow representation
6. **Modal focus trap/overflow audit** — all modals

### P2 (Medium - design system)
7. **CSS consolidation** — eliminate duplicated selectors
8. **Design token usage** — replace hardcoded values with token references
9. **Brid taxonomy filtering** — replace regex with structured metadata

### P3 (Low - polish)
10. **Visual QA configuration** — deterministic testing, frozen animation
11. **Performance optimization** — lazy-load Three.js, code-split non-essential CSS
12. **Accessibility audit** — complete modal and interactive component audit

---

## Phase 0 → Phase 1 Transition

The design system consolidation (Phase 1) must address:

1. **Tokens → Primitives**: Ensure every reusable component consumes the token system
2. **Eliminate redundant CSS**: Merge navigation.css and redesign.css nav definitions
3. **Standardize components**: buttons, links, icon-buttons, badges, cards, tabs, inputs, forms, dialogs
4. **Make content visible by default** — apply hidden reveal only after motion enhancement initialized

---

## Next Steps

1. Create `docs/engineering/final-qa.md` after implementing fixes
2. Fix P0 critical bugs first
3. Run `npm run typecheck && npm run lint` after each fix
4. Execute `npm run test:web` and `npm run e2e` to verify no regressions
5. Perform visual QA with deterministic configuration
6. Final CTO review against all 20 phases

---
*Document generated as part of the portfolio redesign forensic audit.*