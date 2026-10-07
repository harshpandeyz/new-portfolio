# Harsh Pandey — Software Engineer

> **I build software that holds up beyond the demo.**

A production-ready full-stack portfolio showcasing my **projects, engineering skills, credentials, and experience** — with an AI assistant and private content management system.

### Tech Stack

**Frontend:** React 18 · Vite · TypeScript  
**Backend:** Fastify 5 · TypeScript · Prisma  
**Database:** PostgreSQL 16  
**Testing:** Playwright · Unit & API Tests  
**Infrastructure:** Docker  
**AI:** Retrieval-backed Portfolio Assistant

### Highlights

- **Case-study driven portfolio** — projects presented with real technical details.
- **AI Assistant** — answers questions using verified portfolio data and cites its sources.
- **Admin Dashboard** — manage projects, certificates, skills, timeline, media, and messages without changing code.
- **Recruiter View** — fast, factual, printable résumé experience at `/recruiter`.
- **Production-minded** — authentication, validation, audit logs, security testing, and database-backed content.
- **Accessible UX** — keyboard navigation, command palette, responsive design, and reduced-motion support.

### Architecture

```text
React + TypeScript
        ↓
   Fastify API
        ↓
 Prisma + PostgreSQL
        ↓
Portfolio Content
```

### Quick Start

```bash
npm ci
cp .env.example .env
npm run db:generate --workspace @hp/api
docker compose up -d db
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:5173**

### Admin

```text
/private
```

or press **Ctrl + Shift + H**.

Create an admin account:

```bash
npm run admin:create -- --email you@domain.com --password "your-password"
```

### Project Structure

```text
apps/web       → React frontend
apps/api       → Fastify backend
packages/shared → Shared types & schemas
e2e            → Playwright tests
docs           → Deployment & operations
```

### Philosophy

> **A portfolio shouldn't just talk about engineering quality — it should demonstrate it.**

**Built by Harsh Pandey.**
