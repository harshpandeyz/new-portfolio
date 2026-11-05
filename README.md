# Harsh Pandey | Software Engineer

> **I build software that holds up beyond the demo.**

A full-stack developer portfolio engineered to showcase projects, technical expertise, credentials, and experience through a modern interface backed by a real API, database, and AI-powered assistant.

Beyond a personal website, this project demonstrates my approach to software architecture, security, testing, accessibility, and maintainable engineering.

## Overview

- **Project Case Studies** — Explore real projects through their architecture, technologies, and engineering decisions.
- **AI Portfolio Assistant** — Ask questions about my work and get answers grounded in verified portfolio data, with source citations.
- **Private Admin Dashboard** — Manage projects, skills, certificates, experience, media, and messages without modifying application code.
- **Recruiter Mode** — A streamlined, printable professional profile at `/recruiter`.
- **Security by Design** — Authentication, input validation, audit logging, and security-focused testing.
- **Accessible by Default** — Responsive layouts, keyboard navigation, command palette, and reduced-motion support.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | Fastify 5, TypeScript |
| Database & ORM | PostgreSQL 16, Prisma |
| Testing | Playwright, Unit Tests, API Tests |
| Infrastructure | Docker |
| AI | Retrieval-backed Portfolio Assistant |

## Architecture

```text
          User / Recruiter
                 │
                 ▼
       React + TypeScript
                 │
                 ▼
           Fastify API
                 │
                 ▼
         Prisma ORM
                 │
                 ▼
          PostgreSQL
                 │
                 ▼
     Portfolio Content & Data
```

The frontend communicates with a typed backend API, while Prisma manages database access. Portfolio content is stored persistently, allowing the public experience and admin dashboard to work from a shared data source.

## Getting Started

### Prerequisites

- Node.js and npm
- Docker with Docker Compose
- Git

### Installation

```bash
git clone https://github.com/harshpandeyz/new-portfolio.git
cd new-portfolio

npm ci
cp .env.example .env
# Fill in .env (see the per-variable reference in .env.example), then:
# strong secrets: openssl rand -hex 32  (SESSION_SECRET is mandatory)

npm run db:generate --workspace @hp/api
docker compose up -d db

npm run db:migrate
npm run db:seed
npm run dev
```

Configure the required environment variables in `.env` before starting the application.

Open **http://localhost:5173** to access the portfolio.

Two ways to run the full stack locally:

- **Dev flow (recommended):** `docker compose up -d db` for PostgreSQL only,
  then `npm run dev` (Vite on :5173 proxies `/api` + `/static` to the API on :4000).
- **Compose flow (production images):** plain `docker compose up -d` boots
  db + api + web. The api service is a production build and additionally needs
  `AI_CONFIG_KEY`, `TOTP_ENCRYPTION_KEY` (generate once with
  `openssl rand -hex 32`) and `COMPOSE_API_APP_URL` (https placeholder origin)
  in `.env`. The bundled nginx strips the browser `Origin` on the same-origin
  `/api/` proxy (CSRF double-submit still enforced), so admin login works from
  `localhost` in both flows.

## Admin Dashboard

Access the private admin interface at `/private` or use **Ctrl + Shift + H**.

Create an administrator account using:

```bash
npm run admin:create -- \
  --email you@domain.com \
  --password "your-password"
```

Use a strong password and keep credentials and environment secrets out of version control.

## Project Structure

```text
apps/
  web/          → React frontend
  api/          → Fastify backend

packages/
  shared/       → Shared types and schemas

e2e/            → End-to-end tests (Playwright)
docs/            → Deployment, operations and the audit report
deploy/         → Production Compose/Caddy assets and env templates
render.yaml     → Render Blueprint (API + managed PostgreSQL)
netlify.toml    → Netlify static frontend (SPA fallback + headers)
```

## Deployment

- **Netlify (frontend) + Render (API + PostgreSQL):** follow
  [`docs/NETLIFY_RENDER.md`](docs/NETLIFY_RENDER.md) — exact dashboard
  settings, environment variables, deploy sequence and post-deploy checks.
  `render.yaml` / `netlify.toml` are the source of truth for build commands.
- **Private Docker/Caddy host:** follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
  (includes backup/restore runbooks for that path).
- Full variable reference: [`.env.example`](.env.example).
- Audit findings and production-readiness status: [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md).

## Engineering Principles

**Built to demonstrate engineering, not just describe it.**

This project emphasizes clear separation of concerns, maintainable TypeScript, database-backed content, tested API boundaries, secure administration, and accessible user experiences.

The goal is simple: a portfolio should be more than a collection of projects. It should demonstrate how an engineer thinks, designs, builds, and delivers software.

---

**Built by Harsh Pandey**

[GitHub](https://github.com/harshpandeyz) · [Portfolio](https://github.com/harshpandeyz/new-portfolio)
