"# Git-Tracking

> Git tree and change-diff workspace with automatic GitHub synchronization.

**Product positioning:** A Git change tracking dashboard that helps teams answer:
- What changed?
- Where did it change?
- What's different between two points in time?
- Has the update reached GitHub and the shared server?

**Status:** 🚧 Phase 0 — Project Bootstrap (see `docs/PROGRESS.md`)

---

## Tech Stack

- **Language:** TypeScript 5.x (strict mode)
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** NextAuth.js v5 (GitHub OAuth)
- **GitHub SDK:** Octokit
- **Git Adapter:** isomorphic-git
- **Job Queue:** Plain cron (MVP) → BullMQ + Redis (Phase 4)
- **Charts:** visx
- **Diff Viewer:** react-diff-viewer-continued

---

## Getting Started

### Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- PostgreSQL 16 (via Docker Compose or local)
- GitHub OAuth App credentials

### Setup

1. **Clone and install dependencies:**

   ```bash
   git clone https://github.com/ZStudioVn/Git-tracking.git
   cd gittracking
   pnpm install
   ```

2. **Start PostgreSQL (via Docker):**

   ```bash
   docker-compose up -d postgres
   ```

3. **Configure environment:**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values:
   # - DATABASE_URL
   # - NEXTAUTH_SECRET (generate: openssl rand -base64 32)
   # - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET (from GitHub OAuth App)
   # - ENCRYPTION_KEY (generate: openssl rand -base64 32)
   ```

4. **Initialize database:**

   ```bash
   pnpm prisma migrate dev
   pnpm prisma:seed
   ```

5. **Run dev server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Run Vitest |
| `pnpm prisma:migrate` | Apply migrations |
| `pnpm prisma:seed` | Seed test data |
| `pnpm db:studio` | Open Prisma Studio |

---

## Project Structure

See `docs/PROGRESS.md` for the complete structure and phase breakdown.

**Key directories:**

- `src/app/` — Next.js App Router (pages + API routes)
- `src/lib/github/` — GitHub API adapter (Octokit)
- `src/lib/git/` — Local Git adapter (isomorphic-git)
- `src/lib/sync/` — Sync engine (cursor-based incremental sync)
- `src/lib/diff/` — Diff service (on-demand line diffs)
- `src/lib/tree/` — Tree service (lazy folder loading)
- `src/components/` — React components
- `prisma/` — Schema + migrations + seed

---

## Architecture Decisions

See `docs/PROGRESS.md` for the full decision log. Key decisions:

- **D-01:** Plain cron + DB jobs for MVP; BullMQ added in Phase 4
- **D-02:** isomorphic-git (no git CLI dependency)
- **D-03:** GitHub OAuth App for MVP; upgrade to GitHub App in Phase 5
- **D-04:** Store file list + stats only; compute line diffs on demand
- **D-05:** Cursor-based incremental sync + aggressive SHA caching (rate limit mitigation)
- **D-06:** Use library for commit graph lane layout
- **D-08:** Every screen has a shareable URL (core design rule)

---

## Development Phases

| Phase | Status | Focus |
|---|---|---|
| **0** | ⬜ In Progress | Project Bootstrap (tooling, config, CI) |
| **1** | ⬜ Planned | Foundation (auth, DB schema, GitHub adapter, seed) |
| **2** | ⬜ Planned | Git Navigation (commit graph, file tree, blame) |
| **3** | ⬜ Planned | Diff Workspace (compare, unified/split diff) |
| **4** | ⬜ Planned | Sync & Automation (webhooks, BullMQ, polling) |
| **5** | ⬜ Planned | Workflow Intelligence (multi-repo, reports, search) |

Track progress in `docs/PROGRESS.md`.

---

## Documentation

All documentation lives in `docs/`:

- **PROGRESS.md** — Detailed phase tracker with all tasks
- **architecture.md** — System structure, workflows, core principles
- **product-requirements.md** — Features, use cases, scope
- **sync-analysis.md** — Sync strategy analysis
- **mvp-scope-decisions.md** — MVP scope + technical risk guidance
- **SETUP.md** — Full tech stack decisions + setup guide

---

## Contributing

This is an early-stage project. Before contributing, please:

1. Read `docs/PROGRESS.md` to understand the current phase
2. Check open issues and the task tracker
3. Follow the existing code structure and conventions
4. Ensure `pnpm lint`, `pnpm typecheck`, and `pnpm test` pass

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2026 ZStudioVn

---

## Contact

- **GitHub:** [ZStudioVn/Git-tracking](https://github.com/ZStudioVn/Git-tracking)
- **Issues:** [Report bugs or request features](https://github.com/ZStudioVn/Git-tracking/issues)
- **Discussions:** [Join the conversation](https://github.com/ZStudioVn/Git-tracking/discussions)

---

**Built with ❤️ by ZStudioVn**
" 
