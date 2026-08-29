/**
 * HP//OS database seed — loads Harsh's verified profile data.
 *
 * Every fact in this file comes from the provided resume, the certificate
 * documents in apps/api/seed-assets/certificates, or the public GitHub
 * repositories. Certificate files are versioned so a clean clone can
 * reproduce the site's real media.
 * Nothing is invented. Metadata that could not be verified is left null.
 *
 * Run: npm run db:seed
 */
import { cpSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import "../src/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const CERT_SOURCE_DIR = process.env.CERTIFICATES_SOURCE_DIR
  ? path.resolve(process.env.CERTIFICATES_SOURCE_DIR)
  : path.resolve(__dirname, "../seed-assets/certificates");
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(__dirname, "..", process.env.UPLOAD_DIR) // relative to apps/api
  : path.resolve(__dirname, "../uploads");

// ─────────────────────────────────────────────────────────────
// Certificates — verified metadata extracted from the documents.
// issuedOn left null where the document does not state a date.
// ─────────────────────────────────────────────────────────────
interface CertSeed {
  file: string;
  title: string;
  issuer: string;
  issuedOn: string | null;
  category: string;
  credentialId?: string;
  featured?: boolean;
  order: number;
  description?: string;
}

const CERTIFICATES: CertSeed[] = [
  // ── Backend ──
  { file: "Coursera backend developement and api creation.pdf", title: "Backend Development and API Creation", issuer: "Packt · Coursera", issuedOn: "2026-04-10", category: "BACKEND", featured: true, order: 1 },
  { file: "Coursera backend.pdf", title: "Developing Back-End Apps with Node.js and Express", issuer: "IBM · Coursera", issuedOn: "2026-02-27", category: "BACKEND", featured: true, order: 2 },
  { file: "Nodejs & MongoDB Developing Backend-couresera.pdf", title: "Node.js & MongoDB: Developing Back-end Database Applications", issuer: "IBM · Coursera", issuedOn: "2026-04-24", category: "BACKEND", order: 3 },
  { file: "mongodb java developer harsh pandey.pdf", title: "MongoDB Java Developer Path", issuer: "MongoDB University", issuedOn: "2024-09-08", category: "DATABASE", credentialId: "MDB9mfxbechpm", featured: true, order: 4 },
  // ── Database / Data ──
  { file: "infosys Database Management System - Science Graduates.pdf", title: "Database Management System — Science Graduates", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "DATABASE", order: 10 },
  { file: "infosys Introduction to Entity Relationship ER Modeling.pdf", title: "Introduction to Entity Relationship (ER) Modeling", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "DATABASE", order: 11 },
  { file: "infosys Multidimensional Data Modeling.pdf", title: "Multidimensional Data Modeling", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "DATABASE", order: 12 },
  { file: "sql-spoken tutorial certificate.pdf", title: "PHP & MySQL — Spoken Tutorial Test", issuer: "Spoken Tutorial · IIT Bombay", issuedOn: "2025-11-14", category: "DATABASE", credentialId: "4343225VJM", order: 13 },
  { file: "tableau fundamental certificate.jpg", title: "Tableau Fundamentals", issuer: "Salesforce · Tableau eLearning", issuedOn: "2025-02-21", category: "DATA", credentialId: "7bt4y97435rr", order: 20 },
  { file: "infosys Learning Microsoft Power BI.pdf", title: "Learning Microsoft Power BI", issuer: "Infosys Springboard", issuedOn: "2025-06-10", category: "DATA", order: 21 },
  { file: "infosys Hands-On Data Visualization with Microsoft Power BI.pdf", title: "Hands-On Data Visualization with Microsoft Power BI", issuer: "Infosys Springboard", issuedOn: "2025-06-13", category: "DATA", order: 22 },
  { file: "infosys Power BI Training.pdf", title: "Power BI Training", issuer: "Infosys Springboard", issuedOn: "2025-06-13", category: "DATA", order: 23 },
  { file: "infosys Power BI for Business Professionals.pdf", title: "Power BI for Business Professionals", issuer: "Infosys Springboard", issuedOn: "2025-06-13", category: "DATA", order: 24 },
  { file: "infosys introduction to business intelligence.pdf", title: "Introduction to Business Intelligence", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "DATA", order: 25 },
  // ── AI ──
  { file: "ibm.png", title: "Ethical Considerations for Generative AI", issuer: "IBM SkillsBuild", issuedOn: null, category: "AI", featured: true, order: 30 },
  { file: "infosys data science.pdf", title: "Data Science", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "AI", order: 31 },
  // ── Cloud ──
  { file: "infosys Cloud Technologies.pdf", title: "Cloud Technologies", issuer: "Infosys Springboard", issuedOn: "2025-06-09", category: "CLOUD", featured: true, order: 40 },
  { file: "infosys Big Data.pdf", title: "Big Data", issuer: "Infosys Springboard", issuedOn: "2025-06-09", category: "CLOUD", order: 41 },
  // ── Development ──
  { file: "infosys Software Engineering and Agile software development.pdf", title: "Software Engineering and Agile Software Development", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "DEVELOPMENT", featured: true, order: 50 },
  { file: "infosys Agile Scrum in Practice.pdf", title: "Agile Scrum in Practice", issuer: "Infosys Springboard", issuedOn: "2025-06-08", category: "DEVELOPMENT", order: 51 },
  { file: "HARSH-PANDEY-Participant-Certificate python.pdf", title: "Python 3.4.3 — Spoken Tutorial Test", issuer: "Spoken Tutorial · IIT Bombay", issuedOn: "2024-05-09", category: "DEVELOPMENT", credentialId: "35457778I1", order: 52 },
  { file: "java-spoken tutorial certificate.pdf", title: "Java — Spoken Tutorial Test", issuer: "Spoken Tutorial · IIT Bombay", issuedOn: "2025-05-15", category: "DEVELOPMENT", credentialId: "43432253NV", order: 53 },
  { file: "git-spoken tutorial certificate.pdf", title: "Git — Spoken Tutorial Test", issuer: "Spoken Tutorial · IIT Bombay", issuedOn: "2026-04-30", category: "DEVELOPMENT", credentialId: "434322580A", order: 54 },
  { file: "INTRODUCTION TO C++.pdf", title: "Introduction to C++", issuer: "Sololearn", issuedOn: "2024-11-19", category: "DEVELOPMENT", credentialId: "CC-TNASXONH", order: 55 },
  { file: "c intermediate harsh.pdf", title: "C Intermediate", issuer: "Sololearn", issuedOn: "2024-11-19", category: "DEVELOPMENT", credentialId: "CC-TNASXONH", order: 56 },
  { file: "c introduction harsh.pdf", title: "Introduction to C", issuer: "Sololearn", issuedOn: "2024-11-19", category: "DEVELOPMENT", credentialId: "CC-YNEN20AR", order: 57 },
  { file: "Coursera  certificate web design.pdf", title: "Web Design: Wireframes to Prototypes", issuer: "California Institute of the Arts · Coursera", issuedOn: "2026-01-02", category: "DEVELOPMENT", order: 58 },
  { file: "Coursera certificate harsh pandey.pdf", title: "Computational Thinking for Problem Solving", issuer: "University of Pennsylvania · Coursera", issuedOn: "2023-12-08", category: "DEVELOPMENT", order: 59 },
  // ── Testing / Quality ──
  { file: "Coursera Selenium Automation and Testing Frameworks.pdf", title: "Selenium Automation and Testing Frameworks", issuer: "Packt · Coursera", issuedOn: "2026-04-27", category: "DEVELOPMENT", order: 60 },
  { file: "Coursera selenium harsh.pdf", title: "Introduction to Selenium", issuer: "Coursera", issuedOn: "2026-02-26", category: "DEVELOPMENT", order: 61 },
  // ── Security / Networks ──
  { file: "Networking_Basics_certificate.pdf", title: "Networking Basics", issuer: "Cisco Networking Academy · MIT-ADT University", issuedOn: null, category: "SECURITY", order: 70 },
  // ── Design / Professional ──
  { file: "Coursera Create a High-Fidelity Prototype with Figma.pdf", title: "Create a High-Fidelity Prototype with Figma", issuer: "Coursera Project Network", issuedOn: "2026-04-17", category: "OTHER", order: 80 },
  { file: "Coursera Create a Product Design Brainstorming with Miro.pdf", title: "Create a Product Design Brainstorming with Miro", issuer: "Coursera Project Network", issuedOn: "2026-04-17", category: "OTHER", order: 81 },
  { file: "infosys excel.pdf", title: "Excel", issuer: "Infosys Springboard", issuedOn: "2025-06-09", category: "OTHER", order: 82 },
  { file: "infosys email writing skill.pdf", title: "Email Writing Skills", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "OTHER", order: 83 },
  { file: "infosys high impact presentation.pdf", title: "High Impact Presentations", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "OTHER", order: 84 },
  { file: "infosys Time Management.pdf", title: "Time Management", issuer: "Infosys Springboard", issuedOn: "2025-06-07", category: "OTHER", order: 85 },
  { file: "Harsh Pandey  lingua skills.pdf", title: "Lingua Skill Test — English (CEFR A2 Listening)", issuer: "Lingua Skills", issuedOn: "2024-03-19", category: "OTHER", order: 86 },
  // ── Achievements ──
  { file: "pbl certificate ideaspark.jpg", title: 'IdeaSpark 2K24 — Winner, "Best Idea" Award', issuer: "MIT-ADT University · School of Computing", issuedOn: "2024-09-02", category: "OTHER", featured: true, order: 90, description: "Winner of the Best Idea Award at IdeaSpark 2K24, held at MIT-ADT University's School of Computing, Loni Kalbhor, Pune." },
  { file: "SIH CERTYIFICATE.jpg", title: "Internal Hackathon SIH 2024 — Certificate of Appreciation", issuer: "MIT-ADT University · Smart India Hackathon Cell", issuedOn: "2024-09-10", category: "OTHER", featured: true, order: 91, description: "Appreciation for contribution and participation in the Internal Smart India Hackathon SIH 2024 at MIT-ADT University, Pune." },
  { file: "amcat.png", title: "AMCAT Certified — Aptitude & Technical Assessment", issuer: "SHL · AMCAT", issuedOn: "2026-03-09", category: "OTHER", featured: true, order: 92, description: "Computer Science 99/100 · Automata Fix 100/100 · Automata 95/100 · English 88/100 · Computer Programming 83/100 · Quantitative Ability 83/100 · Logical Ability 74/100." },
  { file: "Bharati Vidyapeeth certificate.pdf", title: "Certificate of Participation — Project Presentation", issuer: "Bharati Vidyapeeth · College of Engineering, Pune", issuedOn: null, category: "OTHER", order: 93, description: 'Presented the project "Intelligent Mob Surveillance System" representing MIT ADT University.' },
];

// ─────────────────────────────────────────────────────────────
// Projects — curated from the public GitHub repositories.
// Tiers: featured / secondary / experiment / academic / legacy / internship
// ─────────────────────────────────────────────────────────────
const PROJECTS = [
  {
    slug: "intelligent-surveillance-system",
    title: "Intelligent Surveillance System",
    codename: "CCTV-X",
    shortDescription: "Microservices security-operations platform: real-time YOLOv8 detection, evidence chain-of-custody and an investigation copilot.",
    longDescription:
      "The evolved successor of the mob-surveillance capstone — a production-oriented security operations platform. It fuses real-time YOLOv8n person detection over RTSP streams, webcams and uploaded video with investigation tooling: centroid/IoU tracking, heuristic fight-detection with an escalation ladder (possible → suspicious → confirmed), crowd/mob/stampede analytics, a read-only Investigation Copilot for querying records, and court-exportable evidence bundles whose integrity is anchored to an append-only hash ledger with OpenTimestamps Bitcoin attestation.",
    category: "AI / COMPUTER VISION / SECURITY",
    tier: "featured",
    status: "active",
    featured: true,
    year: "2025—2026",
    order: 1,
    problem:
      "CCTV evidence is easy to dispute: who held the footage, when was it captured, and was it altered? Public-facing surveillance also needs honest operational limits — a heuristic is not a trained violence model.",
    solution:
      "A dockerized pipeline where every artifact is encrypted (AES-GCM), hashed (SHA-256) and chained into an append-only ledger (entry_hash = H(seq|prev|payload|type|id)). Evidence bundles can be verified offline and anchored to Bitcoin via OpenTimestamps, making tampering mathematically detectable.",
    architecture:
      "FastAPI API service + separate AI service (YOLOv8n inference, tracking, analytics) + MongoDB + React investigation UI, deployed with Docker Compose behind a Caddy reverse proxy providing automatic HTTPS. JWT auth uses httpOnly cookies with CSRF double-submit protection, rate limiting and a strict CSP. Pytest suites cover the API and evidence pipeline.",
    decisions: [
      "Separate AI service from the API so GPU-bound inference cannot starve request handling",
      "Append-only hash ledger instead of a database-only audit trail — any mutation breaks the chain",
      "OpenTimestamps anchoring for externally verifiable timestamps without running a blockchain node",
      "Heuristic fight detection labelled honestly as an MVP with documented limitations",
      "Caddy over nginx for automatic ACME TLS on the deployment VM",
    ],
    challenges: "Streaming detection over live RTSP input without frame drops, keeping the evidence chain consistent across services, and making bundles verifiable by a third party without access to the internal system.",
    results: "Actively developed flagship — the most mature system in the repository, with documented honest-limitations sections and an offline verifier script (verify_bundle.py).",
    securityNotes: "AES-GCM evidence encryption · SHA-256 hash chaining · JWT in httpOnly cookies · CSRF double-submit · rate limiting · CSP · endpoint pinning in the copilot against SSRF",
    dataFlow: [
      "RTSP / webcam / upload → frame ingestion",
      "YOLOv8n person detection + centroid/IoU tracking",
      "Event escalation → evidence clip extraction",
      "AES-GCM encryption → SHA-256 digest",
      "Append-only hash ledger → chain-of-custody record",
      "OpenTimestamps Bitcoin anchoring (~24h) → court-exportable bundle",
    ],
    stack: ["Python", "FastAPI", "YOLOv8", "OpenCV", "MongoDB", "React", "Docker Compose", "Caddy", "OpenTimestamps", "JWT", "Pytest"],
    githubUrl: "https://github.com/harshpandeyz/intelligent-surveillance-system",
  },
  {
    slug: "intelligent-mob-surveillance-system",
    title: "Intelligent Mob Surveillance System",
    codename: null,
    shortDescription: "AI CCTV system that detects mob activity in real time and anchors video evidence to Ethereum for tamper-proof verification.",
    longDescription:
      "An AI-powered CCTV framework that detects suspicious mob/crowd activity in real time, automatically extracts evidence clips on detection, encrypts them with AES-256, hashes them with SHA-256 and logs the hashes immutably on an Ethereum blockchain via Solidity smart contracts — so footage integrity can be proven, not promised. Includes an authenticated monitoring dashboard.",
    category: "AI / COMPUTER VISION / SECURITY / BLOCKCHAIN",
    tier: "featured",
    status: "complete",
    featured: true,
    year: "2024—2025",
    order: 2,
    problem:
      "During mob gatherings, manual monitoring fails at scale and recorded evidence is vulnerable to tampering challenges in legal contexts.",
    solution:
      "Real-time detection pipeline (YOLOv8 + OpenCV + MediaPipe) wired to an evidence pipeline: clip extraction → AES-256 encryption → SHA-256 hash → on-chain anchoring through Solidity + Web3.py against a local Ethereum node (Ganache in development).",
    architecture:
      "Python detection service exposed through FastAPI, MongoDB for detections and metadata, JWT-protected React + Vite dashboard, all packaged as Docker microservices with a Jenkins CI/CD pipeline; deployed to a cloud VM with Docker Compose and HTTPS via Caddy.",
    decisions: [
      "Blockchain anchoring chosen over a trusted third party for evidence integrity",
      "AES-256 + SHA-256 applied before any storage so at-rest artifacts are self-verifying",
      "FastAPI chosen over Flask for async inference endpoints and automatic OpenAPI docs",
      "Jenkins pipeline for automated build/test/deploy of the microservice images",
    ],
    challenges: "Synchronizing on-chain writes with offline evidence storage, and keeping detection latency acceptable on consumer hardware.",
    results: "Presented at an inter-collegiate event (Bharati Vidyapeeth CE Pune participation certificate on record). Foundation for the CCTV-X successor system.",
    securityNotes: "AES-256 evidence encryption · SHA-256 integrity hashing · Ethereum + Solidity anchoring via Web3.py · JWT dashboard auth",
    dataFlow: [
      "CCTV feed → YOLOv8 + OpenCV + MediaPipe detection",
      "Mob event → evidence clip extraction",
      "AES-256 encryption → SHA-256 hash",
      "Web3.py → Solidity smart contract (hash logged on Ethereum)",
      "FastAPI → MongoDB (detections + metadata) → React dashboard",
    ],
    stack: ["Python", "YOLOv8", "OpenCV", "MediaPipe", "FastAPI", "MongoDB", "Solidity", "Web3.py", "Ethereum", "Docker", "Jenkins", "React", "Vite"],
    githubUrl: "https://github.com/harshpandeyz/Intelligent-Mob-Surveillance-System",
  },
  {
    slug: "quantummind",
    title: "QuantumMind",
    codename: "AI Research Intelligence Platform",
    shortDescription: "Multimodal RAG platform — semantic search over research PDFs, streamed multi-turn chat and vision analysis of quantum circuits.",
    longDescription:
      "An AI-assisted research platform that answers questions grounded in stored documents using retrieval-augmented generation. Users upload research PDFs, search them semantically, chat with multi-turn conversations streamed token-by-token over Server-Sent Events, and can submit quantum-circuit images for vision-model analysis. An analytics dashboard tracks usage.",
    category: "AI / RAG / SEARCH / MULTIMODAL",
    tier: "featured",
    status: "complete",
    featured: true,
    year: "2025—2026",
    order: 3,
    problem: "LLMs answer confidently but hallucinate; research questions demand grounded, source-linked answers over private document sets.",
    solution:
      "Documents are chunked, embedded with sentence-transformers and indexed in FAISS. At query time the AI service retrieves the most similar chunks and grounds the LLM answer (Groq / OpenAI / Sarvam providers) in them — the model elaborates, the vector store cites.",
    architecture:
      "Four coordinated containers via Docker Compose: Spring Boot (Java 17) API on :8080, FastAPI AI service on :8000, React 18 + Vite frontend behind nginx on :80, PostgreSQL 16 for persistence. JWT authentication with role-based access control across both backends.",
    decisions: [
      "Polyglot split — Spring Boot for transactional API concerns, FastAPI for the AI/ML path",
      "FAISS + sentence-transformers for local, dependency-light vector search",
      "SSE over WebSockets for streamed answers — simpler, HTTP-native, proxy-friendly",
      "Pluggable LLM providers (Groq default, OpenAI for vision, Sarvam) behind one interface",
    ],
    challenges: "Keeping chunk context coherent across the Spring Boot ↔ FastAPI boundary, and streaming tokens through two backends without buffering the entire response.",
    results: "Complete v1 with a documented REST surface, docker quick-start, troubleshooting guide and test suites (Maven + pytest).",
    securityNotes: "JWT authentication · role-based access control · provider keys kept server-side",
    dataFlow: [
      "PDF upload → chunking → sentence-transformers embeddings → FAISS index",
      "Question → embedding → FAISS similarity search → top-k chunks",
      "Chunks + question → LLM (Groq/OpenAI) → streamed answer via SSE",
      "Spring Boot ↔ FastAPI REST integration · PostgreSQL persistence · React UI",
    ],
    stack: ["Java 17", "Spring Boot", "FastAPI", "Python", "React 18", "Vite", "PostgreSQL", "FAISS", "sentence-transformers", "Docker Compose", "nginx", "JWT", "SSE"],
    githubUrl: "https://github.com/harshpandeyz/QuantumMind",
  },
  {
    slug: "skillmatch",
    title: "SkillMatch",
    codename: null,
    shortDescription: "Full-stack learning-recommendation system — ranked skill paths from category match, role relevance and difficulty progression.",
    longDescription:
      "A full-stack application that suggests what a learner should study next based on the skills they already have and the role they target. Learners register, declare known skills and a goal role, and receive ranked recommendations; admins manage the skill catalogue through protected CRUD endpoints.",
    category: "FULL-STACK / RECOMMENDATION / BACKEND",
    tier: "featured",
    status: "complete",
    featured: true,
    year: "2025",
    order: 4,
    problem: "Learners drown in unordered course catalogues; what to learn next should be computed from what they already know.",
    solution:
      "A transparent scoring engine: candidate skills are ranked by category match with the learner's profile, keyword relevance to the target role, and difficulty progression — producing a progressive learning path instead of a flat list.",
    architecture:
      "Node.js + Express MVC backend with EJS server-side rendering, MySQL schema (users, skills, categories, user_skills) with parameterized queries throughout, express-session auth backed by MySQL session storage, bcrypt password hashing, and role-based access separating learner and admin capabilities.",
    decisions: [
      "Explainable scoring heuristics over an opaque ML model — recommendations must be auditable",
      "Server-side rendering for fast first paint on a catalogue-style product",
      "Defense-in-depth HTTP practices: helmet, compression, rate limiting, MySQL-backed session store",
    ],
    challenges: "Designing a difficulty-progression model that feels helpful rather than patronizing, and keeping recommendation queries fast on normalized SQL.",
    results: "Complete, with documented REST endpoints, npm test / npm run check scripts and production-ready practices.",
    securityNotes: "bcrypt hashing · parameterized SQL · session-based auth · RBAC · rate limiting · helmet",
    dataFlow: [
      "Registration → skill declaration → target role selection",
      "Recommendation engine → scored, ranked learning path",
      "Admin RBAC → skill/category CRUD → REST API → MySQL",
    ],
    stack: ["Node.js", "Express.js", "MySQL", "EJS", "bcrypt", "REST APIs", "RBAC", "MVC"],
    githubUrl: "https://github.com/harshpandeyz/SkillMatch",
  },
  {
    slug: "brainmatch-game",
    title: "BrainMatch",
    codename: "iOS memory game",
    shortDescription: "Native iOS memory-matching game — flip cards, find pairs, beat your best time, resume mid-game.",
    longDescription:
      "A native iOS memory-matching game built entirely in Swift and UIKit: card-flip animations, matched-pair tracking, an in-app rules screen, and state persistence with UserDefaults so a player can close the app mid-game and resume later.",
    category: "MOBILE / iOS / GAME",
    tier: "featured",
    status: "complete",
    featured: true,
    year: "2026",
    order: 5,
    problem: "A deliberate exercise in learning a third mobile ecosystem (after Android/Kotlin) well enough to ship something complete.",
    solution: "Self-taught Swift/UIKit to a shipped artifact: game state machine, flip animations, persistence and UX polish in a small, honest scope.",
    architecture: "Single-target UIKit app; view code and game logic separated; UserDefaults for game-state persistence.",
    decisions: ["UIKit over SwiftUI to learn the underlying imperative framework first", "Small scope, fully finished over large scope, abandoned"],
    challenges: "Idiomatic iOS patterns (delegation, view lifecycle) coming from JVM and web backgrounds.",
    results: "Complete mini-app with screenshot-documented UI.",
    securityNotes: null,
    dataFlow: null,
    stack: ["Swift", "UIKit", "Xcode", "UserDefaults"],
    githubUrl: "https://github.com/harshpandeyz/brainmatch-game",
  },
  {
    slug: "studentlink",
    title: "StudentLink",
    codename: "Social network for students",
    shortDescription: "Spring Boot social platform with JWT security, email flows and a deployed frontend.",
    longDescription:
      "A social/student networking application built on Spring Boot 3.5 (Java 17) with Spring Data JPA over MySQL, Spring Security with JWT authentication, and transactional email flows via Mailjet. Deployed to Railway with a separate JavaScript frontend.",
    category: "FULL-STACK / SPRING BOOT",
    tier: "secondary",
    status: "complete",
    featured: false,
    year: "2025—2026",
    order: 6,
    problem: null,
    solution: "Classic Spring Boot monolith with a decoupled JS frontend, deployed end to end.",
    architecture: "Spring Boot 3.5 · Spring Data JPA + MySQL · Spring Security + JWT (jjwt) · Mailjet + spring-boot-starter-mail · Lombok · Maven wrapper · separate frontend directory.",
    decisions: ["JWT stateless auth over server sessions for the deployed environment", "Managed Railway hosting for zero-ops deployment"],
    challenges: null,
    results: "Deployed and reachable in production (Railway backend + custom frontend domain).",
    securityNotes: "Spring Security · JWT authentication · email verification flows",
    dataFlow: null,
    stack: ["Java 17", "Spring Boot 3.5", "Spring Security", "JPA", "MySQL", "JWT", "Mailjet", "Railway"],
    githubUrl: "https://github.com/harshpandeyz/SOCIAL-MEDIA-APP",
    liveUrl: "https://social-media-app-production-1392.up.railway.app/",
  },
  {
    slug: "gamehub-cicd",
    title: "GameHub CI/CD",
    codename: null,
    shortDescription: "DevOps exercise: a React app shipped through a full Jenkins → Docker → container-deploy pipeline.",
    longDescription:
      "A hands-on CI/CD exercise wrapping a React application in a complete delivery pipeline: a Jenkinsfile that checks out, installs, builds, builds a Docker image, then swaps the running container; plus Dockerfile, docker-compose and GitHub Actions workflows.",
    category: "DEVOPS / CI-CD",
    tier: "secondary",
    status: "complete",
    featured: false,
    year: "2026",
    order: 7,
    problem: null,
    solution: "Automate everything from commit to running container — no manual deploy steps.",
    architecture: "Jenkins pipeline (checkout → npm install → build → docker build → stop/remove old → docker run -p 3000:3000) · Dockerfile · docker-compose · GitHub Actions · gh-pages.",
    decisions: ["Blue-green-ish container swap (stop old, run new) as a simple zero-tooling rollback story"],
    challenges: null,
    results: "Working pipeline demonstrated on a real React 19 app.",
    securityNotes: null,
    dataFlow: null,
    stack: ["React 19", "Jenkins", "Docker", "Docker Compose", "GitHub Actions", "react-router", "Bootstrap"],
    githubUrl: "https://github.com/harshpandeyz/DEVOPS-REACT",
  },
  {
    slug: "flask-api-docker-demo",
    title: "Flask API + Docker Demo",
    codename: null,
    shortDescription: "Minimal containerized Flask REST API — the 'hello world' of shipping Python services properly.",
    longDescription: "A deliberately tiny Flask REST API (JSON endpoints, configurable host/port) packaged in a Docker image — a clean reference for containerizing Python backends.",
    category: "BACKEND / DOCKER",
    tier: "experiment",
    status: "complete",
    featured: false,
    year: "2026",
    order: 8,
    problem: null, solution: null, architecture: "Flask app + Dockerfile, configurable via environment variables.",
    decisions: null, challenges: null,
    results: null, securityNotes: null, dataFlow: null,
    stack: ["Python", "Flask", "Docker"],
    githubUrl: "https://github.com/harshpandeyz/flask-api-docker-demo",
  },
  {
    slug: "mlops-lifecycle",
    title: "MLOps Lifecycle Blueprint",
    codename: null,
    shortDescription: "Documentation-stage design of a full MLOps lifecycle and branching strategy — concept before code.",
    longDescription:
      "An explicit design document covering the complete MLOps lifecycle — data collection, validation, versioning, preprocessing, training, experiment tracking, model validation, packaging, deployment, monitoring, drift detection and retraining — plus a Git branching strategy. Intentionally documentation-only at this stage; implementation is planned.",
    category: "MLOPS / INFRASTRUCTURE",
    tier: "experiment",
    status: "archived",
    featured: false,
    year: "2026",
    order: 9,
    problem: null,
    solution: "Write the operating manual before writing the pipeline.",
    architecture: "Documentation repository — no implementation committed yet (stated honestly).",
    decisions: null, challenges: null,
    results: "Concept artifact; implementation pending.",
    securityNotes: null, dataFlow: null,
    stack: ["MLOps", "Git", "Documentation"],
    githubUrl: "https://github.com/harshpandeyz/mlops",
  },
  {
    slug: "mit-java-qualifier",
    title: "Bajaj Finserv Health Qualifier (Java)",
    codename: null,
    shortDescription: "Spring Boot hiring-challenge solution: webhook handshake, JWT-authenticated submission, automated SQL answer flow.",
    longDescription:
      "A Spring Boot solution for the Bajaj Finserv Health Qualifier 1 hiring challenge. On startup the app POSTs to generateWebhook, selects the correct SQL answer by parity of the registration number, then submits the final query to the returned webhook using the returned JWT — writing an audit file with the submission result.",
    category: "ACADEMIC / SPRING BOOT",
    tier: "academic",
    status: "complete",
    featured: false,
    year: "2026",
    order: 10,
    problem: null,
    solution: "A deterministic startup-runner flow (QualifierFlowRunner) driven entirely by environment-provided identity values.",
    architecture: "Spring Boot + RestTemplate startup runner · env-driven QUALIFIER_* config · Maven wrapper · MySQL schema/solution SQL · prebuilt artifact.",
    decisions: null, challenges: null,
    results: "Complete submission flow.",
    securityNotes: null, dataFlow: null,
    stack: ["Java", "Spring Boot", "RestTemplate", "MySQL", "Maven"],
    githubUrl: "https://github.com/harshpandeyz/mit-java-qualifier",
  },
  {
    slug: "skillnexus",
    title: "SkillNexus",
    codename: null,
    shortDescription: "Responsive learning-platform website — an early front-end build with cart and demo auth.",
    longDescription:
      "A responsive student-project learning-platform website: home/about/contact/cart/register/login pages, an ad slider, client-side cart and demo authentication stored in localStorage. An early front-end exercise, kept for the record.",
    category: "FRONTEND / STATIC",
    tier: "legacy",
    status: "archived",
    featured: false,
    year: "2024—2025",
    order: 11,
    problem: null, solution: null,
    architecture: "HTML5 · CSS3 · vanilla JavaScript · Bootstrap 5.3 · deployed to Netlify.",
    decisions: null, challenges: null,
    results: "Live on Netlify.",
    securityNotes: null, dataFlow: null,
    stack: ["HTML5", "CSS3", "JavaScript", "Bootstrap"],
    githubUrl: "https://github.com/harshpandeyz/skillnexus",
    liveUrl: "https://skillnexus-harsh.netlify.app/",
  },
  {
    slug: "coffeeshop",
    title: "CoffeeShop Landing Page",
    codename: null,
    shortDescription: "Static landing-page experiment for a local coffee shop concept.",
    longDescription: "A single-page static site experiment (hero, menu, gallery, contact) for a coffee-shop concept. Early HTML/CSS work.",
    category: "FRONTEND / STATIC",
    tier: "legacy",
    status: "archived",
    featured: false,
    year: "2024",
    order: 12,
    problem: null, solution: null, architecture: "Single index.html + assets.",
    decisions: null, challenges: null, results: null, securityNotes: null, dataFlow: null,
    stack: ["HTML", "CSS", "JavaScript"],
    githubUrl: "https://github.com/harshpandeyz/coffeeshop",
    liveUrl: "https://coffeeshop-dun.vercel.app/",
  },
  {
    slug: "codsoft-tasks",
    title: "CodSoft Internship Tasks",
    codename: null,
    shortDescription: "Web-development internship submission: portfolio site, landing page and calculator.",
    longDescription:
      "The Level-1 submission archive for the CodSoft virtual web-development internship (June–July 2025): Task 1 — a personal portfolio site; Task 2 — a landing page; Task 3 — a basic calculator with full arithmetic, decimals and clear/equals.",
    category: "INTERNSHIP / FRONTEND",
    tier: "internship",
    status: "complete",
    featured: false,
    year: "2025",
    order: 13,
    problem: null, solution: null,
    architecture: "HTML/CSS/JS only — deliberately framework-free internship tasks.",
    decisions: null, challenges: null,
    results: "Internship completed; certificate on record.",
    securityNotes: null, dataFlow: null,
    stack: ["HTML", "CSS", "JavaScript"],
    githubUrl: "https://github.com/harshpandeyz/CODSOFT",
  },
];

// ─────────────────────────────────────────────────────────────
// Skills — honest levels only: core / working / exploring / experimental
// ─────────────────────────────────────────────────────────────
interface SkillSeed {
  name: string;
  category: string;
  level: "core" | "working" | "exploring" | "experimental";
  description?: string;
  usedIn?: string[];
  relatedConcepts?: string[];
  featured?: boolean;
}

const SKILLS: SkillSeed[] = [
  // LANGUAGES
  { name: "Java", category: "LANGUAGES", level: "core", featured: true, usedIn: ["QuantumMind", "StudentLink", "MIT Java Qualifier"], relatedConcepts: ["OOP", "Spring ecosystem", "JVM"] },
  { name: "Python", category: "LANGUAGES", level: "core", featured: true, usedIn: ["Surveillance systems", "QuantumMind AI service", "Flask demo"], relatedConcepts: ["FastAPI", "Flask", "async services"] },
  { name: "JavaScript", category: "LANGUAGES", level: "core", usedIn: ["React frontends", "Node.js services"], relatedConcepts: ["ES2022+", "async/await"] },
  { name: "TypeScript", category: "LANGUAGES", level: "working", usedIn: ["This portfolio system"], relatedConcepts: ["Type-safe APIs", "Zod validation"] },
  { name: "SQL", category: "LANGUAGES", level: "core", usedIn: ["SkillMatch", "QuantumMind schema design"], relatedConcepts: ["Joins", "Indexing", "Normalization"] },
  { name: "C++", category: "LANGUAGES", level: "working", usedIn: ["Sololearn C/C++ track"], relatedConcepts: ["Memory model", "OOP"] },
  { name: "Swift", category: "LANGUAGES", level: "exploring", usedIn: ["BrainMatch iOS game"], relatedConcepts: ["UIKit", "iOS lifecycle"] },
  { name: "Kotlin", category: "LANGUAGES", level: "exploring", relatedConcepts: ["Android development"] },
  { name: "Solidity", category: "LANGUAGES", level: "exploring", usedIn: ["Mob Surveillance evidence contracts"], relatedConcepts: ["Ethereum", "Smart contracts"] },
  // FRONTEND
  { name: "React.js", category: "FRONTEND", level: "core", featured: true, usedIn: ["Surveillance dashboards", "QuantumMind", "This portfolio"], relatedConcepts: ["Hooks", "Component architecture", "Vite"] },
  { name: "HTML5 / CSS3", category: "FRONTEND", level: "core", relatedConcepts: ["Semantic markup", "Responsive design"] },
  { name: "Vite", category: "FRONTEND", level: "working", usedIn: ["QuantumMind", "Surveillance UI"], relatedConcepts: ["Build tooling", "Code splitting"] },
  // BACKEND
  { name: "Node.js", category: "BACKEND", level: "core", featured: true, usedIn: ["SkillMatch", "CodSoft projects"], relatedConcepts: ["Event loop", "Express"] },
  { name: "Express.js", category: "BACKEND", level: "core", usedIn: ["SkillMatch"], relatedConcepts: ["Middleware", "Routing", "MVC"] },
  { name: "Spring Boot", category: "BACKEND", level: "working", featured: true, usedIn: ["QuantumMind", "StudentLink", "MIT Qualifier"], relatedConcepts: ["Dependency injection", "Spring Data JPA", "Spring Security"] },
  { name: "FastAPI", category: "BACKEND", level: "working", featured: true, usedIn: ["Surveillance systems", "QuantumMind AI service"], relatedConcepts: ["Async Python", "Pydantic", "OpenAPI"] },
  { name: "REST API design", category: "BACKEND", level: "core", usedIn: ["Every project"], relatedConcepts: ["Resource modeling", "Status codes", "Versioning"] },
  { name: "Authentication & JWT", category: "BACKEND", level: "working", usedIn: ["Surveillance systems", "QuantumMind", "StudentLink"], relatedConcepts: ["httpOnly cookies", "CSRF", "Session management"] },
  { name: "RBAC", category: "BACKEND", level: "working", usedIn: ["SkillMatch", "QuantumMind"], relatedConcepts: ["Roles", "Authorization middleware"] },
  { name: "MVC architecture", category: "BACKEND", level: "working", usedIn: ["SkillMatch"], relatedConcepts: ["Separation of concerns"] },
  // DATABASES
  { name: "MySQL", category: "DATABASES", level: "core", usedIn: ["SkillMatch", "StudentLink"], relatedConcepts: ["Schema design", "Parameterized queries"] },
  { name: "PostgreSQL", category: "DATABASES", level: "working", usedIn: ["QuantumMind", "This portfolio"], relatedConcepts: ["Indexes", "Migrations"] },
  { name: "MongoDB", category: "DATABASES", level: "working", featured: true, usedIn: ["Surveillance systems"], relatedConcepts: ["Document modeling", "MongoDB Java driver"] },
  { name: "Firebase", category: "DATABASES", level: "exploring", relatedConcepts: ["Auth", "Firestore"] },
  { name: "Database design", category: "DATABASES", level: "core", usedIn: ["QuantumMind schema", "SkillMatch"], relatedConcepts: ["ER modeling", "Normalization", "Foreign keys"] },
  // AI / ML
  { name: "Computer Vision", category: "AI_ML", level: "working", featured: true, usedIn: ["Both surveillance systems"], relatedConcepts: ["Object detection", "Tracking"] },
  { name: "YOLOv8", category: "AI_ML", level: "working", featured: true, usedIn: ["Mob Surveillance", "CCTV-X"], relatedConcepts: ["Real-time inference", "Model training"] },
  { name: "OpenCV", category: "AI_ML", level: "working", usedIn: ["Surveillance pipelines"], relatedConcepts: ["Frame processing", "Video I/O"] },
  { name: "MediaPipe", category: "AI_ML", level: "exploring", usedIn: ["Mob Surveillance"], relatedConcepts: ["Pose/landmark estimation"] },
  { name: "RAG", category: "AI_ML", level: "exploring", featured: true, usedIn: ["QuantumMind", "This portfolio's chatbot"], relatedConcepts: ["Grounded generation", "Chunking", "Citations"] },
  { name: "FAISS / vector search", category: "AI_ML", level: "exploring", usedIn: ["QuantumMind"], relatedConcepts: ["Embeddings", "Similarity search", "sentence-transformers"] },
  { name: "LLM API integration", category: "AI_ML", level: "working", usedIn: ["QuantumMind (Groq/OpenAI/Sarvam)", "This portfolio"], relatedConcepts: ["Prompt engineering", "Streaming (SSE)", "Provider abstraction"] },
  { name: "Machine Learning fundamentals", category: "AI_ML", level: "working", relatedConcepts: ["Supervised learning", "Evaluation"] },
  // CLOUD / DEVOPS
  { name: "Docker & Compose", category: "CLOUD_DEVOPS", level: "working", featured: true, usedIn: ["Surveillance systems", "QuantumMind", "Flask demo"], relatedConcepts: ["Multi-container orchestration", "Images", "Volumes"] },
  { name: "Jenkins", category: "CLOUD_DEVOPS", level: "exploring", usedIn: ["Mob Surveillance CI/CD", "GameHub pipeline"], relatedConcepts: ["Pipelines", "Automated builds"] },
  { name: "CI/CD", category: "CLOUD_DEVOPS", level: "working", usedIn: ["GameHub", "Surveillance deployments"], relatedConcepts: ["GitHub Actions", "Pipeline design"] },
  { name: "Git / GitHub", category: "CLOUD_DEVOPS", level: "core", relatedConcepts: ["Branching strategy", "Code review"] },
  { name: "Caddy", category: "CLOUD_DEVOPS", level: "exploring", usedIn: ["Surveillance deployments"], relatedConcepts: ["Automatic HTTPS", "ACME", "Reverse proxy"] },
  { name: "Cloud fundamentals", category: "CLOUD_DEVOPS", level: "exploring", usedIn: ["Cloud VM deployment of surveillance stack"], relatedConcepts: ["VMs", "Cloud Technologies certification"] },
  { name: "Postman", category: "CLOUD_DEVOPS", level: "core", relatedConcepts: ["API testing"] },
  // SECURITY
  { name: "Evidence integrity (AES/SHA-256)", category: "SECURITY", level: "working", featured: true, usedIn: ["Both surveillance systems"], relatedConcepts: ["Encryption at rest", "Hash chains", "Chain of custody"] },
  { name: "Blockchain anchoring", category: "SECURITY", level: "exploring", usedIn: ["Mob Surveillance (Ethereum/Ganache)", "CCTV-X (OpenTimestamps)"], relatedConcepts: ["Immutability", "Web3.py", "Smart contracts"] },
  { name: "Web security practices", category: "SECURITY", level: "working", usedIn: ["CCTV-X (CSRF, CSP, rate limiting)", "This portfolio"], relatedConcepts: ["OWASP", "Secure headers", "Least privilege"] },
  { name: "Networking fundamentals", category: "SECURITY", level: "working", usedIn: ["Cisco Networking Academy certification"], relatedConcepts: ["TCP/IP", "RTSP streaming"] },
  // MOBILE
  { name: "Android (Kotlin)", category: "MOBILE", level: "exploring", relatedConcepts: ["Activity lifecycle", "Jetpack"] },
  { name: "iOS (Swift/UIKit)", category: "MOBILE", level: "exploring", usedIn: ["BrainMatch"], relatedConcepts: ["UIKit", "UserDefaults"] },
  { name: "React Native", category: "MOBILE", level: "experimental", relatedConcepts: ["Cross-platform mobile"] },
  // EXPERIMENTAL
  { name: "Distributed systems", category: "EXPERIMENTAL", level: "exploring", relatedConcepts: ["Microservices", "Consistency", "System design"] },
  { name: "MLOps", category: "EXPERIMENTAL", level: "experimental", usedIn: ["MLOps lifecycle blueprint"], relatedConcepts: ["Experiment tracking", "Drift detection"] },
  { name: "Selenium / test automation", category: "EXPERIMENTAL", level: "exploring", usedIn: ["Selenium certifications", "Pytest suites in CCTV-X"], relatedConcepts: ["Testing frameworks", "Automation"] },
];

// ─────────────────────────────────────────────────────────────
// Education & timeline — from the resume + certificate documents
// ─────────────────────────────────────────────────────────────
const EDUCATION = [
  {
    degree: "B.Tech — Information Technology",
    institution: "MIT-ADT University, Pune",
    field: "Software & Mobile Application Development",
    startYear: "2023",
    endYear: "2027",
    grade: "CGPA 8.38",
    description: "Final-year undergraduate program with a software & mobile application development specialization. Active in hackathons (SIH 2024 internal, IdeaSpark 2K24 winner).",
    order: 1,
  },
  {
    degree: "Higher Secondary Certificate (HSC) — Science",
    institution: "Maharashtra State Board",
    field: null,
    startYear: "2020",
    endYear: "2022",
    grade: "63%",
    description: null,
    order: 2,
  },
  {
    degree: "Secondary School Certificate (SSC)",
    institution: "Maharashtra State Board",
    field: null,
    startYear: "2020",
    endYear: null,
    grade: "86.60%",
    description: null,
    order: 3,
  },
];

const TIMELINE = [
  { date: "2020", title: "SSC completed — 86.60%", organization: "Maharashtra State Board", description: "Secondary school completion with distinction-level score.", type: "education", order: 1 },
  { date: "2022", title: "HSC (Science) completed", organization: "Maharashtra State Board", description: "Higher secondary education, science stream.", type: "education", order: 2 },
  { date: "2023", title: "Enrolled — B.Tech Information Technology", organization: "MIT-ADT University, Pune", description: "Software & Mobile Application Development specialization (2023–2027).", type: "education", order: 3 },
  { date: "2023-12", title: "Computational Thinking — UPenn via Coursera", organization: "Coursera", description: "First university-level certification, completed in the first semester.", type: "certification", order: 4 },
  { date: "2024-03", title: "Lingua Skill Test — English", organization: "Lingua Skills", description: "English comprehension assessment (CEFR A2 listening).", type: "certification", order: 5 },
  { date: "2024-05", title: "Python 3.4.3 — Spoken Tutorial Test", organization: "IIT Bombay · Spoken Tutorial", description: "Passed the IIT Bombay spoken-tutorial Python test at MIT-ADT.", type: "certification", order: 6 },
  { date: "2024-09", title: 'WINNER — "Best Idea" Award, IdeaSpark 2K24', organization: "MIT-ADT University · School of Computing", description: "Team won the Best Idea Award at the IdeaSpark 2K24 competition (Sep 2, 2024).", type: "competition", order: 7 },
  { date: "2024-09", title: "Internal Smart India Hackathon — Participant", organization: "MIT-ADT University · SIH Cell", description: "Selected for and participated in the internal SIH 2024 hackathon (Sep 9–10, 2024).", type: "competition", order: 8 },
  { date: "2024-09", title: "MongoDB Java Developer Path", organization: "MongoDB University", description: "Completed the Java developer path (credential MDB9mfxbechpm).", type: "certification", order: 9 },
  { date: "2024-11", title: "C / C++ certifications — Sololearn", organization: "Sololearn", description: "Introduction to C, C Intermediate and Introduction to C++ completed.", type: "certification", order: 10 },
  { date: "2024", title: "Intelligent Mob Surveillance System — capstone built", organization: "MIT-ADT University", description: "Built the YOLOv8 + blockchain evidence system; later presented at Bharati Vidyapeeth CE Pune.", type: "project", order: 11 },
  { date: "2025-02", title: "Tableau Fundamentals", organization: "Salesforce · Tableau eLearning", description: "Completed the Tableau Fundamentals self-paced track.", type: "certification", order: 12 },
  { date: "2025-06", title: "Infosys Springboard certification wave", organization: "Infosys Springboard", description: "17 certifications in one month: software engineering & agile, DBMS, ER modeling, cloud technologies, data science, Power BI suite, big data, professional skills.", type: "certification", order: 13 },
  { date: "2025-06", endDate: "2025-07", title: "Web Development Intern", organization: "CodSoft (virtual, project-based)", description: "Shipped full-stack projects connecting React frontends to Node.js/Express backends over REST APIs; designed endpoints and data models, validated with Postman, deployed to Netlify.", type: "experience", order: 14 },
  { date: "2025", title: "QuantumMind — multimodal RAG platform built", organization: null, description: "Four-service architecture: Spring Boot + FastAPI + React + PostgreSQL with FAISS vector search and streamed answers.", type: "project", order: 15 },
  { date: "2025-11", title: "PHP & MySQL — Spoken Tutorial Test", organization: "IIT Bombay · Spoken Tutorial", description: "Database-focused spoken tutorial certification.", type: "certification", order: 16 },
  { date: "2026-01", endDate: "2026-04", title: "Backend engineering certification wave", organization: "Coursera · IBM · Packt", description: "Backend Development & API Creation, Node.js & Express (IBM), Node.js & MongoDB (IBM), Selenium testing tracks, Figma/Miro product design.", type: "certification", order: 17 },
  { date: "2026-03", title: "AMCAT certified — SHL assessment", organization: "SHL · AMCAT", description: "Computer Science 99/100 · Automata Fix 100/100 · Automata 95/100 · English 88/100 · Programming 83/100.", type: "milestone", order: 18 },
  { date: "2026", title: "CCTV-X — surveillance platform v2 in active development", organization: null, description: "Evolved the capstone into a production-oriented microservices platform with evidence chain-of-custody and Bitcoin timestamp anchoring.", type: "project", order: 19 },
  { date: "2026", title: "This portfolio — engineered as a system", organization: null, description: "Full-stack system: Fastify + PostgreSQL API, React cinematic frontend, retrieval-backed AI assistant, admin control center.", type: "project", order: 20 },
];

// ─────────────────────────────────────────────────────────────

async function seedCertificates(): Promise<void> {
  const sourceExists = existsSync(CERT_SOURCE_DIR);
  const certDir = path.join(UPLOAD_DIR, "certificates");
  mkdirSync(certDir, { recursive: true });

  if (sourceExists) {
    for (const cert of CERTIFICATES) {
      const src = path.join(CERT_SOURCE_DIR, cert.file);
      if (existsSync(src)) {
        const safeName = cert.file.replace(/[^a-zA-Z0-9._ -]/g, "").replace(/\s+/g, "-");
        cpSync(src, path.join(certDir, safeName), { force: true });
      }
    }
  }

  const count = await prisma.certificate.count();
  if (count > 0 && !process.env.SEED_FORCE) {
    console.log(`Certificates already seeded (${count}). Skipping. Use SEED_FORCE=1 to reseed.`);
    return;
  }

  await prisma.certificate.deleteMany({});
  for (const cert of CERTIFICATES) {
    const safeName = cert.file.replace(/[^a-zA-Z0-9._ -]/g, "").replace(/\s+/g, "-");
    await prisma.certificate.create({
      data: {
        title: cert.title,
        issuer: cert.issuer,
        issuedOn: cert.issuedOn,
        category: cert.category,
        credentialId: cert.credentialId ?? null,
        fileUrl: `/static/certificates/${encodeURIComponent(safeName)}`,
        description: cert.description ?? null,
        featured: cert.featured ?? false,
        order: cert.order,
      },
    });
  }
  console.log(`Seeded ${CERTIFICATES.length} certificates (source: ${sourceExists ? CERT_SOURCE_DIR : "metadata only — documents dir not found"})`);
}

async function main() {
  console.log("HP//OS seed — loading verified data…");

  // Profile
  const existingProfile = await prisma.profile.findFirst();
  const profileData = {
    name: "Harsh Pandey",
    headline: "Full-Stack Engineer",
    subHeadline: "BACKEND • AI • SYSTEMS",
    bio: "Final-year B.Tech Information Technology student at MIT-ADT University, Pune, who builds systems end to end — training a YOLOv8 model, writing the REST API that serves its output, and getting the whole stack running in Docker. Comfortable across Java/Spring Boot and Node.js/Express on the backend, React on the frontend, FastAPI for AI-facing services, and SQL/NoSQL databases with CI/CD in between. Picks up new ecosystems fast — taught himself Swift/UIKit well enough to ship an iOS app — and would rather trace a bug to its root cause than work around it. Looking for full-stack, backend, or AI/ML engineering roles.",
    location: "Pune, India",
    email: "harshap17058@gmail.com",
    availability: "Open to internships & full-stack / backend / AI-ML engineering roles",
    // Profile and résumé are frontend-owned static assets. This also works
    // when the SPA and API are deployed on separate origins.
    avatarUrl: "/files/harsh-photo.jpeg",
    resumeUrl: "/files/HARSH-RESUME.pdf",
    resumeLabel: "HARSH-RESUME.pdf",
  };
  if (existingProfile) {
    await prisma.profile.update({ where: { id: existingProfile.id }, data: profileData });
  } else {
    await prisma.profile.create({
      data: {
        ...profileData,
        socials: {
          create: [
            { label: "GitHub", url: "https://github.com/harshpandeyz", handle: "@harshpandeyz", order: 1 },
            { label: "LinkedIn", url: "https://www.linkedin.com/in/harshpandeyz/", handle: "in/harshpandeyz", order: 2 },
            { label: "Email", url: "mailto:harshap17058@gmail.com", handle: "harshap17058@gmail.com", order: 3 },
          ],
        },
      },
    });
  }

  // Projects
  await prisma.project.deleteMany({});
  for (const p of PROJECTS) {
    const { decisions, dataFlow, ...rest } = p;
    await prisma.project.create({
      data: {
        ...rest,
        stack: p.stack as string[],
        gallery: [],
        decisions: decisions ?? [],
        dataFlow: dataFlow ?? [],
      },
    });
  }
  console.log(`Seeded ${PROJECTS.length} projects`);

  // Skills
  await prisma.skill.deleteMany({});
  let skillOrder = 0;
  for (const s of SKILLS) {
    skillOrder += 1;
    await prisma.skill.create({
      data: {
        name: s.name,
        category: s.category,
        level: s.level,
        description: s.description ?? null,
        usedIn: s.usedIn ?? [],
        relatedConcepts: s.relatedConcepts ?? [],
        featured: s.featured ?? false,
        order: skillOrder,
      },
    });
  }
  console.log(`Seeded ${SKILLS.length} skills`);

  // Education
  await prisma.education.deleteMany({});
  for (const e of EDUCATION) {
    await prisma.education.create({ data: e });
  }
  console.log(`Seeded ${EDUCATION.length} education records`);

  // Timeline
  await prisma.timelineItem.deleteMany({});
  for (const t of TIMELINE) {
    await prisma.timelineItem.create({ data: t });
  }
  console.log(`Seeded ${TIMELINE.length} timeline items`);

  // Certificates (+ document ingestion)
  await seedCertificates();

  // Admin user
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@harshpandey.dev").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!adminExists) {
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must be set to at least 12 characters before the first seed");
    }
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "ADMIN",
        displayName: "Harsh Pandey",
      },
    });
    console.log(`Admin user created: ${adminEmail} (password supplied through ADMIN_PASSWORD)`);
  } else {
    console.log(`Admin user ${adminEmail} already exists — untouched`);
  }

  // Site settings
  await prisma.siteSetting.upsert({
    where: { key: "system.version" },
    update: {},
    create: { key: "system.version", value: "HP//OS v1.0" },
  });

  console.log("Seed complete. System ready.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
