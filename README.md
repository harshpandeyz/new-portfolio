# Harsh Pandey — Software Engineer

> **I build software that holds up beyond the demo.**

A polished, full-stack portfolio for **Harsh Pandey**, showcasing selected work, technical capabilities, credentials, an AI-powered assistant, and a recruiter-friendly résumé experience.

The public experience is backed by **PostgreSQL** and a hardened **Fastify API**, while all portfolio content can be managed through a private admin dashboard.

---

## Project Structure

```text
portfolio/
├── apps/
│   ├── web/             # React 18 + Vite + TypeScript
│   │                    # Lazy-loaded public/admin routes
│   └── api/             # Fastify 5 + TypeScript + Prisma
│                        # PostgreSQL-backed REST API
│
├── packages/
│   └── shared/          # Domain types + Zod schemas
│                        # Single source of truth
│
├── e2e/                 # Playwright end-to-end tests
├── scripts/             # Database, testing, build & admin tooling
├── docs/                # Deployment & operating documentation
├── docker-compose.yml
└── .env.example
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Backend | Fastify 5, TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Validation | Zod |
| Testing | Playwright, API & unit tests |
| Authentication | Session-based auth + bcrypt |
| Infrastructure | Docker |
| AI | Retrieval-backed portfolio assistant |
| Architecture | Monorepo with shared domain types |

---

## Quick Start

### Prerequisites

- **Node.js ≥ 20**
- **Docker**
- **npm**

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment

```bash
cp .env.example .env
```

Configure the required variables in `.env`.

Generate a secure session secret:

```bash
openssl rand -hex 32
```

Set:

```env
SESSION_SECRET=your-generated-secret
ADMIN_EMAIL=you@domain.com
ADMIN_PASSWORD=your-secure-password
```

### 3. Generate the Prisma client

```bash
npm run db:generate --workspace @hp/api
```

### 4. Start PostgreSQL

```bash
docker compose up -d db
```

The project uses **PostgreSQL 16** with an automatically created test database.

### 5. Run migrations and seed data

```bash
npm run db:migrate
npm run db:seed
```

The verified seed loads:

- Profile information
- Selected projects
- Technical skills
- Career journey
- Certificates
- Certificate documents

Certificate documents are sourced from:

```text
apps/api/seed-assets/certificates/
```

and copied into the persistent runtime directory:

```text
apps/api/uploads/
```

### 6. Start the application

```bash
npm run dev
```

The development servers run at:

```text
Web: http://localhost:5173
API: http://localhost:4000
```

Open:

**http://localhost:5173**

---

## Admin Access

The private admin area can be accessed through:

```text
/private
```

or by pressing:

```text
Ctrl + Shift + H
```

on the website.

> **Security note:** The private route is not intended to provide security through obscurity. Every protected request is authorized server-side.

### Create or Reset Admin Account

```bash
npm run admin:create -- \
  --email you@domain.com \
  --password "a-long-random-passphrase"
```

Passwords are protected using **bcrypt with 12 rounds**.

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start web and API in development/watch mode |
| `npm run build` | Build all workspaces for production |
| `npm run typecheck` | Run strict TypeScript checks |
| `npm run lint` | Run linting across the monorepo |
| `npm run test` | Run frontend unit tests and API security tests |
| `npm run test:api` | Run the API test suite against the isolated test database |
| `npm run e2e` | Run Playwright end-to-end tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed verified portfolio data |
| `npm run admin:create` | Create or reset an admin operator |

> Run `npm run typecheck` before the production build to catch strict TypeScript errors early.

---

# Public Experience

The public portfolio follows a focused narrative:

```text
HERO
  ↓
ABOUT
  ↓
JOURNEY
  ↓
SELECTED WORK
  ↓
CAPABILITIES
  ↓
CREDENTIALS
  ↓
CONTACT
```

### Hero

A concise introduction focused on software engineering, technical depth, and real-world execution.

### About

A recruiter-friendly overview of Harsh's background, engineering interests, and technical approach.

### Journey

A chronological view of education, internships, projects, certifications, and important milestones.

### Selected Work

Projects are presented as real case studies rather than simple project cards.

The section includes:

- One flagship project
- Secondary projects
- Compact additional work
- Technical details
- Architecture
- Challenges
- Outcomes
- Project-specific case studies

Each case study is generated from the project's database content.

### Capabilities

A structured presentation of technical skills and engineering capabilities.

### Credentials

Certificates are:

- Featured prominently
- Searchable
- Categorized
- Keyboard accessible
- Viewable through a full document viewer

### Contact

A direct communication path for recruiters, collaborators, and visitors.

---

# Key Features

## Reduced Motion

The interface respects the visitor's system-level motion preferences.

Navigation, page transitions, reveal animations, and scrolling adapt automatically when reduced motion is enabled.

---

## Command Palette

Press:

```text
⌘ K
```

on macOS, or:

```text
Ctrl + K
```

on Windows/Linux.

The command palette provides quick access to:

- Portfolio sections
- Résumé
- Projects
- Credentials
- External links
- AI assistant
- Private admin access

---

## Ask Harsh

The portfolio includes a retrieval-backed AI assistant that answers questions using the live portfolio database.

The assistant:

- Retrieves relevant portfolio information
- Cites portfolio sources
- Distinguishes verified information from inference
- Avoids presenting guesses as facts
- Admits when information is unavailable
- Works without an external LLM through a deterministic response composer

This makes the assistant useful even when no AI provider is configured.

---

## Recruiter View

A dedicated recruiter experience is available at:

```text
/recruiter
```

It is designed to be:

- Fast
- Factual
- Compact
- Easy to scan
- Print-friendly

The recruiter view prioritizes:

- Technical skills
- Experience
- Projects
- Education
- Certifications
- Contact information
- Résumé content

---

## Content Management

Portfolio content is database-driven.

Changes can be made through the private admin dashboard without modifying source code.

Administrators can manage:

- Projects
- Certificates
- Skills
- Timeline / journey
- Profile information
- Images
- PDFs
- Videos
- Media assets
- Contact messages
- Message statuses
- Audit logs
- Privacy-safe analytics

---

# Architecture

```text
                    ┌─────────────────────┐
                    │     React Web App    │
                    │   Vite + TypeScript  │
                    └──────────┬──────────┘
                               │
                               │ HTTP / API
                               ▼
                    ┌─────────────────────┐
                    │     Fastify API     │
                    │   TypeScript + Zod  │
                    └──────────┬──────────┘
                               │
                               │ Prisma
                               ▼
                    ┌─────────────────────┐
                    │    PostgreSQL 16    │
                    └─────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Portfolio Content   │
                    │ Projects / Skills   │
                    │ Credentials / etc.  │
                    └─────────────────────┘
```

Shared domain contracts live in:

```text
packages/shared/
```

This provides a single source of truth for types and validation schemas across the application.

---

# Security

Security is treated as a core part of the application rather than an afterthought.

Key measures include:

- Server-side authorization
- Session-based authentication
- bcrypt password hashing
- Secure session secrets
- Zod request validation
- Prisma parameterized database access
- API security tests
- Audit logging
- Privacy-safe analytics
- Protected administrative endpoints
- Separate test database
- Environment-based secrets

The `/private` route itself is **not** considered a security boundary. Authorization happens on the server for every protected operation.

---

# Testing

The project includes multiple levels of automated testing.

### Unit / API Tests

```bash
npm run test
```

### API Security Suite

```bash
npm run test:api
```

The API tests use an isolated:

```text
hp_os_test
```

database.

### End-to-End Tests

```bash
npm run e2e
```

End-to-end browser workflows are powered by **Playwright**.

### Type Safety

```bash
npm run typecheck
```

Strict TypeScript checking is enabled across the monorepo.

---

# Database

The application uses:

```text
PostgreSQL 16
        +
      Prisma
```

Database workflow:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

The seed process is designed to be verified and repeatable, providing a consistent development environment.

---

# Environment Variables

Copy the example configuration:

```bash
cp .env.example .env
```

At minimum, configure:

```env
SESSION_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Never commit `.env` or production secrets to the repository.

---

# Documentation

Deployment and operational documentation is available in:

```text
docs/
```

### Deployment Guide

```text
docs/DEPLOYMENT.md
```

The deployment documentation covers the Oracle Cloud deployment architecture, release workflow, environment configuration, and operational procedures.

---

# Philosophy

This portfolio is designed around a simple principle:

> **The portfolio should demonstrate the same engineering quality as the software it showcases.**

That means the application is not just a collection of animations and project screenshots.

It is a production-oriented system with:

- A real backend
- Persistent data
- Authentication
- Database-backed content
- Automated testing
- Type-safe contracts
- Administrative tooling
- Security controls
- Retrieval-backed AI
- Recruiter-focused UX
- Deployment documentation

**Built by Harsh Pandey — Software Engineer.**
