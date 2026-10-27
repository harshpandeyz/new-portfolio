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

npm run db:generate --workspace @hp/api
docker compose up -d db

npm run db:migrate
npm run db:seed
npm run dev
```

Configure the required environment variables in `.env` before starting the application.

Open **http://localhost:5173** to access the portfolio.

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

e2e/            → End-to-end tests
docs/            → Deployment and operations
```

## Engineering Principles

**Built to demonstrate engineering, not just describe it.**

This project emphasizes clear separation of concerns, maintainable TypeScript, database-backed content, tested API boundaries, secure administration, and accessible user experiences.

The goal is simple: a portfolio should be more than a collection of projects. It should demonstrate how an engineer thinks, designs, builds, and delivers software.

---

**Built by Harsh Pandey**

[GitHub](https://github.com/harshpandeyz) · [Portfolio](https://github.com/harshpandeyz/new-portfolio)
