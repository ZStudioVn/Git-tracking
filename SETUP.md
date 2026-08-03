# Git-Tracking: Base-Level Setup Guide

## Tech Stack Decision

| Category | Choice | Version Target |
|---|---|---|
| Language | TypeScript (strict) | 5.x |
| Runtime | Node.js | 20 LTS |
| Package Manager | pnpm | 9.x |
| Framework | Next.js (App Router) | 14.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 5.x |
| GitHub SDK | Octokit | latest |
| Git Library | isomorphic-git | 1.x |
| Job Queue | BullMQ + Redis | latest |
| Auth | NextAuth.js (Auth.js) | 5.x (beta) |
| Frontend Charts | visx (Airbnb) | latest |
| Diff Viewer | react-diff-viewer-continued | latest |
| Hosting | Docker / Vercel | — |

## Project Structure

```
gittracking/
├── .github/                    # CI/CD, issue templates
├── docs/                       # All .md documentation (move existing docs here)
│   ├── architecture.md
│   ├── product-requirements.md
│   └── sync-analysis.md
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, API routes)
│   │   ├── api/
│   │   │   ├── auth/           # NextAuth API routes
│   │   │   ├── repos/          # Repository CRUD
│   │   │   ├── sync/           # Manual sync triggers
│   │   │   ├── tree/           # File tree endpoints
│   │   │   ├── diff/           # Diff comparison endpoints
│   │   │   └── webhooks/       # GitHub webhook receiver
│   │   ├── dashboard/          # Dashboard pages
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── github/             # GitHub adapter (Octokit wrapper)
│   │   │   ├── client.ts       # Authenticated Octokit instance
│   │   │   ├── repos.ts        # Repository operations
│   │   │   ├── commits.ts      # Commit fetching + pagination
│   │   │   ├── branches.ts     # Branch operations
│   │   │   ├── pulls.ts        # PR operations
│   │   │   ├── webhooks.ts     # Webhook verification + registration
│   │   │   └── rate-limit.ts   # Rate limit handling
│   │   ├── git/                # Local Git adapter (isomorphic-git wrapper)
│   │   │   ├── status.ts       # Working tree status
│   │   │   ├── log.ts          # Commit log
│   │   │   ├── diff.ts         # Local diff calculation
│   │   │   └── tree.ts         # Tree reading
│   │   ├── sync/               # Synchronization engine
│   │   │   ├── worker.ts       # Background job processor
│   │   │   ├── queue.ts        # BullMQ queue setup
│   │   │   ├── strategies/     # Per-entity sync strategies
│   │   │   │   ├── commits.ts
│   │   │   │   ├── branches.ts
│   │   │   │   ├── pulls.ts
│   │   │   │   └── releases.ts
│   │   │   ├── cursor.ts       # Cursor management (last synced SHA)
│   │   │   └── idempotency.ts  # Duplicate event detection
│   │   ├── diff/               # Diff service
│   │   │   ├── compare.ts      # Revision comparison
│   │   │   ├── merge-base.ts   # Merge base calculation
│   │   │   ├── file-changes.ts # Changed file enumeration
│   │   │   └── line-diff.ts    # Line-level diff generation
│   │   ├── tree/               # Tree service
│   │   │   ├── resolver.ts     # Revision → tree SHA resolution
│   │   │   └── loader.ts       # Lazy tree loading
│   │   ├── db/                 # Database layer
│   │   │   └── index.ts        # Prisma client singleton
│   │   ├── auth.ts             # NextAuth configuration
│   │   └── utils/              # Shared utilities
│   ├── components/             # React components
│   │   ├── repo-selector.tsx
│   │   ├── commit-graph.tsx    # visx-based graph
│   │   ├── file-tree.tsx       # Revision-specific tree
│   │   ├── diff-viewer.tsx     # Unified + split diff
│   │   ├── sync-status.tsx     # Synchronization status badge
│   │   ├── timeline.tsx        # Update timeline
│   │   └── ui/                 # shadcn/ui primitives
│   └── types/                  # Shared TypeScript types
│       ├── github.ts           # GitHub API response types
│       ├── repo.ts             # Repository model
│       ├── commit.ts           # Commit model
│       ├── diff.ts             # Diff model
│       └── sync.ts             # Synchronization model
├── prisma/
│   └── schema.prisma           # Database schema
├── docker-compose.yml          # PostgreSQL + Redis for development
├── Dockerfile                  # Production container
├── package.json
├── tsconfig.json               # Strict mode enabled
├── next.config.js
├── .env.example                # Environment variable template
└── README.md
```

## Environment Setup

### Prerequisites

- Node.js 20 LTS
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL + Redis in development)
- A GitHub account (for OAuth App registration)

### Step 1: Clone and Install

```bash
git clone <repo-url> gittracking
cd gittracking
pnpm install
```

### Step 2: Start Dependencies

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### Step 3: Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Database
DATABASE_URL="postgresql://gittracking:password@localhost:5432/gittracking"

# Redis
REDIS_URL="redis://localhost:6379"

# GitHub OAuth App
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"

# GitHub App (for webhooks — Phase 4)
GITHUB_APP_ID=""
GITHUB_APP_PRIVATE_KEY=""
GITHUB_WEBHOOK_SECRET=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret"

# Encryption key for stored credentials
ENCRYPTION_KEY="generate-a-32-byte-key"
```

### Step 4: Database Setup

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

### Step 5: Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000.

## How It Works (Architecture Flow)

```
1. User signs in via GitHub OAuth
2. User selects/connects a GitHub repository
3. System triggers initial sync job (BullMQ background worker)
   ├── Worker fetches branches, tags from GitHub API (Octokit)
   ├── Worker paginates through commits
   ├── Worker stores indexed data in PostgreSQL via Prisma
   └── Worker records sync cursor (last processed SHA)
4. Dashboard displays:
   ├── Repository tree at selected revision (file tree component)
   ├── Commit graph (visx-based DAG renderer)
   └── Sync status (fresh / stale / error)
5. User can compare two revisions:
   ├── Diff service resolves both to commit SHAs
   ├── Calculates merge base for branch comparisons
   ├── Returns changed file list + line diffs
   └── UI renders unified or split diff view
6. On push/PR event:
   ├── GitHub webhook → API route verifies signature
   ├── Checks delivery ID for idempotency (no duplicates)
   ├── Enqueues incremental sync job
   └── Worker imports only new data, updates cursor
```

## Important Design Decisions

### 1. Idempotency is non-negotiable
Every sync operation must check a unique key (commit SHA, webhook delivery ID, PR number) before inserting. Use PostgreSQL `ON CONFLICT ... DO UPDATE` or Prisma `upsert` with unique constraints.

### 2. Separate GitHub adapter from business logic
All Octokit calls go through `src/lib/github/`. The rest of the app never imports Octokit directly. This makes it possible to add GitLab/Bitbucket later.

### 3. Never trust the tracking database over Git
The database stores an *indexed copy*. Every UI element must show the source commit SHA and link back to GitHub. The database is a cache, not the source of truth.

### 4. Rate limit handling from day one
Octokit has built-in throttling, but you must also implement exponential backoff in the sync worker. Never fire unthrottled API requests in a loop.

### 5. Start with polling, add webhooks later
As the docs recommend: implement scheduled polling first (simpler), then add webhook support in Phase 4. Don't try to build both at once.

### 6. Security checklist (must pass before any deployment)

- [ ] GitHub OAuth uses minimum scopes (`repo` or `public_repo` only)
- [ ] Webhook signatures verified on every request
- [ ] Access tokens encrypted at rest (use `crypto.createCipheriv` or a key management service)
- [ ] Repository-level authorization check on every data request (not just UI hiding)
- [ ] Tokens never appear in logs, URLs, or error messages
- [ ] HTTPS enforced in production

## Development Order (First Two Weeks)

### Week 1: Foundation
1. **Monorepo setup**: Next.js + TypeScript strict + ESLint + Prettier
2. **Database schema**: Define all Prisma models (Repo, Branch, Commit, FileChange, SyncJob, etc.)
3. **GitHub adapter**: Octokit auth, basic repo info fetching
4. **Auth**: NextAuth.js with GitHub provider
5. **Repository connection**: User can connect a repo, app stores connection record
6. **Basic sync**: Single manual sync that imports branches + recent commits

### Week 2: Core Navigation
7. **Tree resolver**: Revision → Tree SHA resolution
8. **File tree UI**: Expandable folder tree for a selected revision
9. **Commit list**: Paginated commit history
10. **Basic diff**: Commit-to-parent diff display
11. **Sync status**: Show last sync time and errors

## What Needs Attention

- **Cursor-based sync**: The sync cursor model (storing the last processed SHA) is the critical piece that makes incremental sync work. Get this right early.
- **Large repo handling**: From day one, paginate everything. Never try to load all commits/trees at once, even for small repos.
- **Empty README**: Fill it with a project overview, setup link, and tech stack summary. This is the first thing contributors see.
- **Document consolidation**: Move all `.md` files to `docs/` and pick one as the canonical requirements document. Reference the others from it.
- **Write the Prisma schema before any other code**: The data model drives everything. Without a concrete schema, you'll make conflicting assumptions.

## What Needs to Be Sure

- [ ] PostgreSQL has unique constraints on `(repo_id, sha)` for commits, `(repo_id, delivery_id)` for webhook events
- [ ] Sync worker has a max retry count (3) with exponential backoff
- [ ] Every API response that returns Git data includes `repo`, `branch`, `commitSha` fields
- [ ] Diff service gracefully handles binary files, empty files, and files over 1MB
- [ ] File tree loads only one level at a time (no full recursive loads)
- [ ] Commit graph uses a visible window with pagination (not all commits at once)
- [ ] Environment variables are validated on startup (fail fast if `DATABASE_URL` or `GITHUB_CLIENT_SECRET` is missing)

---

## Critical Gaps (Must Resolve Before Coding)

These are not covered in any existing documentation and will block development.

### 1. Sync Job State Machine (Formal Definition)

The docs list statuses but never define legal transitions. Without this, the worker has undefined behavior.

```
                  ┌──────────┐
                  │ pending  │
                  └────┬─────┘
                       │ dequeue
                       ▼
                  ┌──────────┐
        ┌────────│ running  │────────┐
        │        └────┬─────┘        │
        │ timeout     │              │ success
        ▼             │              ▼
   ┌─────────┐       │         ┌───────────┐
   │  stale  │       │         │ completed │
   └─────────┘       │         └───────────┘
                     │ temporary error
                     ▼
               ┌──────────┐
               │  failed  │──── retry ────► running
               └────┬─────┘
                    │ permanent error
                    ▼
               ┌──────────┐
               │  stale   │ (terminal — requires manual intervention)
               └──────────┘
```

Rules:
- `completed` → `stale`: only when a newer webhook or poll detects upstream changes since the last sync
- `failed` with `retry_count < 3` → `running` (retry)
- `failed` with `retry_count >= 3` → `stale` (terminal, notify user)
- `running` jobs that exceed a timeout → `stale` (stuck worker, needs investigation)
- `partial` is a sub-status of `completed` (some entities synced, some skipped with warnings)

### 2. GitHub API Quota Budget

GitHub's primary rate limit is 5,000 requests/hour for authenticated users. You must calculate the cost of each operation before implementing the sync worker.

| Operation | API Calls | Notes |
|---|---|---|
| List commits (page of 100) | 1 | GET /repos/:owner/:repo/commits |
| Get single commit detail | 1 | GET /repos/:owner/:repo/commits/:sha |
| Get tree (recursive) | 1 | GET /repos/:owner/:repo/git/trees/:sha?recursive=1 |
| List branches | 1 | GET /repos/:owner/:repo/branches |
| List tags | 1 per page of 100 | GET /repos/:owner/:repo/tags |
| List PRs | 1 per page of 100 | GET /repos/:owner/:repo/pulls?state=all |
| Get single PR detail | 1 | GET /repos/:owner/:repo/pulls/:number |
| List releases | 1 per page of 100 | GET /repos/:owner/:repo/releases |
| Compare two commits | 1 | GET /repos/:owner/:repo/compare/:base...:head |
| Register webhook | 1 | POST /repos/:owner/:repo/hooks |

**Estimated cost for a 2,000-commit repo initial sync:**

| Step | Calls |
|---|---|
| Get repo metadata + default branch | 2 |
| List 2,000 commits (20 pages × 100) | 20 |
| Get commit details (2,000 commits) | 2,000 |
| Get trees (only for N displayed revisions) | ~50 |
| List branches + tags | 3 |
| List PRs + details | ~15 |
| List releases | 2 |
| **Total** | **~2,092 calls** |

This is 42% of the hourly budget. For a 10,000-commit repo: ~10,020 calls = 2 hours of rate limit.

**Required strategy**: Initial sync must be chunked across rate-limit windows. Store the cursor after each batch so the sync can resume cleanly after a rate-limit pause. Never attempt a full import in one shot.

### 3. Multi-Tenancy Data Model (Pick Before Schema)

How do users, teams, and repositories relate? This decision cascades into every table.

```
Option A — User owns Repo (simplest, wastes storage on shared repos):
  User 1──* Repo
  Each user has their own indexed copy. No sharing.

Option B — Shared Repo with permissions (recommended for MVP):
  User *──* Repo (via RepoAccess join table)
  Indexed data stored once, shared across authorized users.
  Need: RepoAccess table with role (owner, viewer).

Option C — Org/Team model (for Phase 2+):
  User *──* Team *──* Repo
  Teams own repos, users belong to teams.
```

**Recommendation**: Start with Option B (shared repo + RepoAccess). It avoids data duplication and the schema change from B to C is additive (add Team table, migrate RepoAccess to include teamId). Option A to B is a destructive migration.

### 4. Structured Logging Contract

Every sync job must produce traceable logs. Define this format before writing the worker:

```typescript
interface SyncLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  syncJobId: string;
  repoId: string;
  trigger: "manual" | "scheduled" | "webhook";
  step: string;        // e.g., "fetch_commits_page_3", "store_tree", "complete"
  message: string;
  durationMs?: number;
  error?: {
    type: string;      // e.g., "rate_limit", "network", "auth"
    statusCode?: number;
    retryable: boolean;
    stack?: string;
  };
}
```

Use `pino` (fastest Node.js logger) with structured JSON output. Every log line must have `syncJobId` — no exceptions.

### 5. Webhook Redelivery Edge Case

GitHub redelivers webhooks. The simple "check delivery ID, skip if seen" approach has a dangerous edge case:

```
Timeline:
  T1: Webhook A (delivery=1) arrives → processed → marked completed
  T2: Webhook B (delivery=2) arrives → processed → marked completed
  T3: Webhook A (delivery=1) REDELIVERED → delivery ID check says "skip"

Problem: What if the first processing of A at T1 was actually buggy and
         missed some data? Skipping silently hides the gap.
```

**Required behavior**:
- `completed` deliveries → hard skip (log at debug, don't process)
- `failed` or `partial` deliveries → re-process with a new sync job (not the original)
- Store `last_processed_delivery_id` and `last_processed_commit_sha` independently — use the commit SHA for data consistency, the delivery ID only for deduplication

### 6. Backup & Recovery Documentation

Self-hosted users will lose data. The README must include:

```bash
# Backup (run daily via cron)
pg_dump $DATABASE_URL > backups/gittracking-$(date +%Y%m%d).sql

# Restore
psql $DATABASE_URL < backups/gittracking-20250803.sql

# Then re-sync to catch changes since the backup
# The app will detect the cursor gap and import missing data
```

The restore procedure must be tested at least once before any public release.

---

## Need to Have (Before Production/Public Use)

### 7. Error Taxonomy for the Sync Worker

The worker must classify errors to decide whether to retry, skip, or fail permanently.

| Error | Retry? | Backoff | Max Attempts | On Final Failure |
|---|---|---|---|---|
| Network timeout (ECONNRESET, ETIMEDOUT) | Yes | Exponential (1s, 2s, 4s) | 3 | Mark `stale`, notify user |
| GitHub 5xx (502, 503, 504) | Yes | Exponential | 3 | Mark `stale`, notify user |
| GitHub secondary rate limit (403 + retry-after) | Yes | Wait for `retry-after` header | 3 | Mark `stale`, notify user |
| GitHub primary rate limit (403 + X-RateLimit-Remaining: 0) | Yes | Wait until reset window | Unlimited | Never fail — just wait |
| Auth failure (401) | No | — | 1 | Mark `stale`, notify user to re-authenticate |
| Repo not found (404) | No | — | 1 | Mark `stale`, notify user repo may be deleted/renamed |
| Schema violation (unique constraint) | No | — | 1 | Log error, skip record, continue sync |
| Payload too large (single diff/file) | No | — | 1 | Skip file, log warning, continue sync |

### 8. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm lint        # ESLint
      - run: pnpm typecheck   # tsc --noEmit

  test:
    needs: lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: gittracking_test
    steps:
      - run: pnpm test        # Vitest with @vitest/coverage-v8

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build       # next build (verifies production compilation)
```

Minimum coverage target: 80% on sync engine (`src/lib/sync/`), 60% on adapters, no target on UI components yet.

### 9. Secret Rotation Procedure

When a GitHub token is revoked mid-sync:

1. Worker receives 401 on an active sync job
2. Worker **immediately pauses** all sync jobs for that repo (don't retry — it won't help)
3. Sync job status set to `stale` with error message: "GitHub authentication failed. Token may be expired or revoked."
4. In-app notification shown to the repo owner with a "Reconnect GitHub" button
5. Reconnecting stores the new token; existing indexed data is preserved (no re-index needed)
6. Paused sync jobs are re-queued with the new credentials

Tokens must be encrypted at rest. Recommended approach: encrypt with `AES-256-GCM` using the `ENCRYPTION_KEY` env var. Store only the encrypted value in the database.

### 10. Content Security Policy

The app renders user-generated content from GitHub: commit messages, PR descriptions, file diffs. Any of these could contain XSS payloads.

```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://avatars.githubusercontent.com data:;
  connect-src 'self' https://api.github.com;
  frame-ancestors 'none';
`;

// In next.config.js headers():
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [{ key: 'Content-Security-Policy', value: cspHeader }]
    }];
  }
};
```

Additionally: all diff content rendered in the UI must go through `DOMPurify` or React's built-in escaping (never `dangerouslySetInnerHTML` with raw diff text).

### 11. Development Seed Data

Create a seed script that generates a realistic test environment without needing a real GitHub repo.

```bash
pnpm prisma db seed
```

The seed should create:
- 1 test user (authenticated)
- 1 fake repository ("acme/webapp")
- 3 branches: `main`, `feature/login`, `bugfix/typo`
- 50 commits across branches (with realistic messages, authors, timestamps)
- 3 merge commits
- 10 files with changes (some renamed, one deleted, one binary placeholder)
- 3 pull requests (1 open, 2 merged)
- 5 issues (various states)
- 2 releases (v1.0.0, v1.1.0)
- 3 sync job records (1 completed, 1 running, 1 failed)
- 2 webhook delivery records (both completed)

Use `@faker-js/faker` to generate realistic commit messages, author names, and timestamps. Commits should have proper parent relationships (DAG structure, not a flat list).

---

## Summary: What to Build First

The order of work, now including these gaps:

1. **Prisma schema** (resolve multi-tenancy model + state machine first)
2. **Error taxonomy** (as a TypeScript enum + utility functions)
3. **Structured logging setup** (pino with sync context)
4. **GitHub adapter** (with quota budget tracking built in)
5. **Seed script** (unblocks all future development)
6. **Auth + repo connection**
7. **Sync worker (polling only)** — with idempotency, cursor, error classification from day one
8. **CI pipeline** (lint + typecheck + test)
9. **Tree + commit list UI**
10. **Diff viewer**
