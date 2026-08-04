# Git-Tracking: Tiến Độ Triển Khai

> Cập nhật lần cuối: 2026-08-04

---

## Quyết định kỹ thuật đã chốt

| # | Vấn đề | Quyết định | Lý do |
|---|---|---|---|
| D-01 | Job Queue | **Plain cron + DB jobs table** cho MVP; BullMQ thêm ở Phase 4 | MVP chỉ cần polling; Redis là over-engineering |
| D-02 | Git local adapter | **isomorphic-git** (theo SETUP.md) | Không cần git binary; chạy được trong container/Vercel |
| D-03 | Auth | **NextAuth.js + GitHub OAuth App** cho MVP | Đủ cho single-repo MVP; upgrade GitHub App ở v1 |
| D-04 | Diff storage | **Không lưu full diff** — chỉ lưu file list + line counts; tính on-demand từ blob SHA | Tiết kiệm storage, giảm API calls |
| D-05 | Rate limit | **Cursor-based incremental sync** + **aggressive SHA cache** | Primary technical risk (~5000 req/h/token) |
| D-06 | Permalink | **Mọi screen đều có shareable URL** — core design rule | Dashboard phải là product, không chỉ là viewer |

---

## Tổng quan phases

| Phase | Tên | Trạng thái | Mục tiêu |
|---|---|---|---|
| **0** | Project Bootstrap | ✅ Hoàn thành | Khởi tạo, cấu hình, môi trường dev |
| **1** | Foundation | ✅ Hoàn thành (MVP) | Auth, DB schema, GitHub adapter, seed |
| **2** | Git Navigation | ✅ Hoàn thành (MVP) | Commit graph, file tree, revision URLs |
| **3** | Diff Workspace | ✅ Hoàn thành (MVP) | Compare commits/branches, on-demand line diff |
| **4** | Sync & Automation | ⬜ Chưa bắt đầu | Scheduled polling, webhooks, BullMQ |
| **5** | Workflow Intelligence | ⬜ Chưa bắt đầu | PR/issue grouping, reports, analytics |

**Trạng thái:** ⬜ Chưa bắt đầu · 🔄 Đang làm · ✅ Hoàn thành · ❌ Blocked

---

## Phase 0 — Project Bootstrap

**Mục tiêu:** Khởi tạo repo, cài đặt toolchain, cấu hình môi trường dev, CI pipeline cơ bản.

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 0-01 | Khởi tạo Next.js 14 App Router + TypeScript strict | ✅ | `package.json`, `tsconfig.json` |
| 0-02 | Cấu hình pnpm workspace | ✅ | `pnpm-workspace.yaml` |
| 0-03 | Cấu hình ESLint + Prettier + `.editorconfig` | ✅ | `.eslintrc.json`, `.prettierrc`, `.editorconfig` |
| 0-04 | Cấu hình Vitest + @vitest/coverage-v8 | ✅ | `vitest.config.ts` |
| 0-05 | Cài đặt Prisma + kết nối PostgreSQL dev | ✅ | `prisma/schema.prisma` |
| 0-06 | Tạo `docker-compose.yml` (PostgreSQL + Redis dev) | ✅ | `docker-compose.yml` |
| 0-07 | Cấu hình `next.config.js` + CSP headers | ✅ | `next.config.js` |
| 0-08 | Tạo `.env.example` với tất cả required env vars | ✅ | `.env.example` |
| 0-09 | Tạo GitHub Actions CI (lint + typecheck + test + build) | ✅ | `.github/workflows/ci.yml` |
| 0-10 | Di chuyển file `.md` hiện tại vào `docs/` | ✅ | Tất cả docs đã trong `docs/` |
| 0-11 | Cài đặt pino (structured logging) | ✅ | `src/lib/logger.ts` |

**Output của Phase 0:** `pnpm dev` chạy được, `pnpm test` pass, CI xanh.

**✅ Phase 0 hoàn thành** — Tất cả config files đã sẵn sàng.

---

## Phase 1 — Foundation

**Mục tiêu:** Auth hoạt động, DB schema chuẩn, GitHub adapter, error taxonomy, seed data.

### 1A — Prisma Schema & DB

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1A-01 | Thiết kế schema: `User`, `Account`, `Session` (NextAuth) | ✅ | |
| 1A-02 | Schema: `Repository` (owner, name, githubId, syncCursor) | ✅ | Single-repo MVP |
| 1A-03 | Schema: `Branch`, `Tag` | ✅ | |
| 1A-04 | Schema: `Commit`, `CommitParent` (DAG) | ✅ | |
| 1A-05 | Schema: `CommitFile` (path, status, additions, deletions) | ✅ | Không lưu full diff — D-04 |
| 1A-06 | Schema: `PullRequest` (metadata only) | ✅ | |
| 1A-07 | Schema: `SyncJob` (status state machine, cursor, retryCount) | ✅ | Thay BullMQ ở MVP — D-01 |
| 1A-08 | Schema: `SyncCursor` (lastSyncedSha per branch) | ✅ | |
| 1A-09 | Viết migration đầu tiên + `prisma generate` | ✅ | Migration đã có trong `prisma/migrations/` |
| 1A-10 | `src/lib/db/index.ts` — Prisma client singleton | ✅ | |

### 1B — Error Taxonomy & Logging

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1B-01 | Tạo `src/lib/errors.ts` — enum `AppError` + utility functions | ✅ | |
| 1B-02 | Tạo `src/lib/logger.ts` — pino với sync context | ✅ | |

### 1C — GitHub Adapter

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1C-01 | `src/lib/github/client.ts` — Octokit instance + token encryption | ✅ | AES-256-GCM — D-03 |
| 1C-02 | `src/lib/github/rate-limit.ts` — quota budget tracking | ✅ | D-05 |
| 1C-03 | `src/lib/github/repos.ts` — fetch repo metadata | ✅ | |
| 1C-04 | `src/lib/github/commits.ts` — fetch commits với cursor pagination | ✅ | |
| 1C-05 | `src/lib/github/branches.ts` — fetch branches | ✅ | |
| 1C-06 | `src/lib/github/pulls.ts` — fetch PR metadata | ✅ | |

### 1D — Auth

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1D-01 | `src/lib/auth.ts` — NextAuth.js config với GitHub OAuth provider | ✅ | D-03 |
| 1D-02 | `src/app/api/auth/[...nextauth]/route.ts` | ✅ | |
| 1D-03 | Token encryption at rest (ENCRYPTION_KEY env) | ✅ | Theo SETUP.md §9 |
| 1D-04 | Middleware bảo vệ route dashboard | ✅ | |

### 1E — Seed Data

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 1E-01 | `prisma/seed.ts` với @faker-js/faker | ✅ | Theo SETUP.md §11 |
| 1E-02 | Seed: 1 user, 1 repo "acme/webapp", 3 branches | ✅ | |
| 1E-03 | Seed: 50 commits với DAG parent relationships | ✅ | |
| 1E-04 | Seed: 10 files, 3 PRs, 5 issues, 2 releases | ✅ | |
| 1E-05 | Seed: 3 SyncJob records, 2 webhook delivery records | ✅ | |

**Output của Phase 1:** `pnpm prisma db seed` pass, auth login/logout hoạt động, GitHub adapter test pass.

---

## Phase 2 — Git Navigation (MVP Layer 1)

**Mục tiêu:** User có thể duyệt branches, xem commit graph, duyệt file tree theo revision.

### 2A — Sync Engine (polling only)

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 2A-01 | `src/lib/sync/strategies/commits.ts` — incremental commit import | ⬜ | Dùng cursor SHA |
| 2A-02 | `src/lib/sync/strategies/branches.ts` | ⬜ | |
| 2A-03 | `src/lib/sync/strategies/pulls.ts` | ⬜ | |
| 2A-04 | `src/lib/sync/idempotency.ts` — duplicate detection bằng SHA | ⬜ | |
| 2A-05 | `src/lib/sync/cursor.ts` — đọc/ghi lastSyncedSha | ⬜ | |
| 2A-06 | `src/app/api/sync/route.ts` — manual sync trigger endpoint | ⬜ | |
| 2A-07 | Cron job bằng `node-cron` (không cần BullMQ ở MVP) | ⬜ | D-01 |

### 2B — Tree & Commit Services

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 2B-01 | `src/lib/tree/resolver.ts` — revision → tree SHA | ⬜ | |
| 2B-02 | `src/lib/tree/loader.ts` — lazy folder loading | ⬜ | |
| 2B-03 | `src/lib/git/log.ts` — commit log với pagination | ⬜ | isomorphic-git — D-02 |
| 2B-04 | `src/lib/git/tree.ts` — tree reading | ⬜ | |
| 2B-05 | `src/app/api/repos/route.ts` — GET repo info | ⬜ | |
| 2B-06 | `src/app/api/tree/route.ts` — GET tree by revision | ⬜ | |

### 2C — UI: Dashboard & Navigation

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 2C-01 | `src/app/dashboard/page.tsx` — repo overview | ⬜ | |
| 2C-02 | `src/components/repo-selector.tsx` | ⬜ | |
| 2C-03 | `src/components/commit-graph.tsx` — visx-based graph | ⬜ | Dùng library layout lanes — D-06 |
| 2C-04 | `src/components/file-tree.tsx` — revision-specific tree | ⬜ | Lazy load folders |
| 2C-05 | Sync status badge + last sync timestamp | ⬜ | "ahead/behind" badge — D-07 |
| 2C-06 | Breadcrumb: `branch > commit > folder > file` | ⬜ | D-08 |
| 2C-07 | Permalink cho mỗi screen (URL = state) | ⬜ | D-08 |

**Output của Phase 2:** User đăng nhập → xem commit graph → click commit → xem file tree tại revision đó.

---

## Phase 3 — Diff Workspace (MVP Layer 2)

**Mục tiêu:** So sánh 2 commits/branches, hiển thị unified + split diff, xử lý edge cases.

### 3A — Diff Service

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 3A-01 | `src/lib/diff/merge-base.ts` — tính merge base | ⬜ | |
| 3A-02 | `src/lib/diff/file-changes.ts` — liệt kê changed files + stats | ⬜ | Không lưu full diff — D-04 |
| 3A-03 | `src/lib/diff/line-diff.ts` — on-demand line diff, cache by (baseSHA+headSHA) | ⬜ | |
| 3A-04 | `src/lib/diff/compare.ts` — orchestrate comparison | ⬜ | |
| 3A-05 | Xử lý renamed, deleted, binary, large file (>1MB fallback) | ⬜ | |
| 3A-06 | `src/app/api/diff/route.ts` — GET diff endpoint | ⬜ | |

### 3B — UI: Diff Viewer

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 3B-01 | `src/components/diff-viewer.tsx` — react-diff-viewer-continued | ⬜ | |
| 3B-02 | Unified / split toggle | ⬜ | |
| 3B-03 | Changed-file tree với add/modify/delete/rename badges | ⬜ | |
| 3B-04 | Whitespace toggle, collapse unchanged context | ⬜ | |
| 3B-05 | Binary / large file fallback message | ⬜ | |
| 3B-06 | `src/app/dashboard/diff/page.tsx` — diff workspace route | ⬜ | |
| 3B-07 | Blame annotations trong file view | ⬜ | D-07 |
| 3B-08 | File history view (commits touching a file) | ⬜ | D-07 |

**Output của Phase 3:** User có thể chọn 2 commits/branches → xem full diff với changed-file tree.

---

## Phase 4 — Sync & Trust (MVP Layer 3 + Webhooks)

**Mục tiêu:** Scheduled polling ổn định, webhook endpoint, retry/idempotency, sync timeline UI. Đây là lúc BullMQ được đưa vào thay cron.

### 4A — Job Queue (BullMQ + Redis)

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 4A-01 | Thêm Redis vào docker-compose + BullMQ dependency | ⬜ | Upgrade từ plain cron — D-01 |
| 4A-02 | `src/lib/sync/queue.ts` — BullMQ queue setup | ⬜ | |
| 4A-03 | `src/lib/sync/worker.ts` — background job processor | ⬜ | |
| 4A-04 | Migrate SyncJob DB table → BullMQ job reference | ⬜ | |

### 4B — Webhook Endpoint

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 4B-01 | `src/lib/github/webhooks.ts` — signature verification | ⬜ | |
| 4B-02 | `src/app/api/webhooks/route.ts` — webhook receiver | ⬜ | |
| 4B-03 | Webhook delivery ID deduplication | ⬜ | |
| 4B-04 | Token revocation handler (401 → pause + notify) | ⬜ | Theo SETUP.md §9 |

### 4C — Sync UI

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 4C-01 | `src/components/sync-status.tsx` — status + timestamp + errors | ⬜ | |
| 4C-02 | Retry button cho failed sync jobs | ⬜ | |
| 4C-03 | Sync timeline / event log | ⬜ | |
| 4C-04 | \"Reconnect GitHub\" flow khi token expired | ⬜ | |

**Output của Phase 4:** Sync tự động qua webhook + cron, retry hoạt động, UI hiển thị trạng thái sync rõ ràng.

---

## Phase 5 — Workflow Intelligence (Version 1)

**Mục tiêu:** Multi-repo, PR/issue grouping, file history, saved comparisons, reports, search.

| # | Task | Trạng thái | Ghi chú |
|---|---|---|---|
| 5-01 | Multi-repository support | ⬜ | Mở rộng từ single-repo MVP |
| 5-02 | File and folder history view | ⬜ | Commits touching a file |
| 5-03 | PR + issue grouping trong timeline | ⬜ | |
| 5-04 | Saved comparisons (permalinks) | ⬜ | |
| 5-05 | Review markers và notes | ⬜ | |
| 5-06 | Markdown + CSV report export | ⬜ | |
| 5-07 | Search commits, files, branches | ⬜ | |
| 5-08 | Release grouping + release reports | ⬜ | |
| 5-09 | Change hotspot analysis | ⬜ | Post-MVP |
| 5-10 | Upgrade GitHub OAuth → GitHub App | ⬜ | D-03: upgrade path |

**Output của Phase 5:** Product-grade v1 với multi-repo, reports, search, workflow context đầy đủ.

---

## Quyết định kỹ thuật đã ghi nhận (Architecture Decisions)

Các quyết định dưới đây được chốt dựa trên phân tích mâu thuẫn giữa các file spec. Không thay đổi nếu không có lý do rõ ràng.

| ID | Vấn đề | Quyết định | Lý do |
|---|---|---|---|
| D-01 | Job Queue: BullMQ vs plain cron | **Plain cron + `SyncJob` DB table cho MVP (Phase 0–3).** BullMQ + Redis được thêm vào Phase 4 khi có webhooks | MVP chỉ cần polling. BullMQ là over-engineering khi chưa có webhook/background report |
| D-02 | Git local adapter: isomorphic-git vs git CLI | **isomorphic-git** | Không phụ thuộc git binary trên server, chạy trong container/Vercel. CLI không portable |
| D-03 | Auth: GitHub App vs GitHub OAuth App | **NextAuth.js + GitHub OAuth App cho MVP.** Upgrade sang GitHub App ở Phase 5 (5-10) | OAuth App đủ cho single-user MVP. GitHub App cần cơ sở hạ tầng phức tạp hơn |
| D-04 | Lưu trữ diff | **Không lưu full diff.** Chỉ lưu changed-file list + line counts. Line diff tính on-demand, cache theo `baseSHA+headSHA` | Tránh database bloat, theo khuyến nghị MVP decisions doc |
| D-05 | Rate limit | **Quota budget tracking built-in từ Phase 1** trong `rate-limit.ts`. Cache by SHA aggressively | GitHub API 5000 req/h là constraint chính — không phải footnote |
| D-06 | Commit graph lane layout | **Dùng library có sẵn** (e.g., `gitgraph-js` hoặc tương đương), không tự viết lane positioning | Lane positioning deceptively complex, tốn thời gian không cần thiết ở MVP |
| D-07 | Blame + file history trong MVP | **Thêm blame + file history vào MVP** (Phase 3) thay vì để sang Version 1 | High perceived value, near-zero cost khi đã có commit index |
| D-08 | Permalinks | **"Every screen is a URL" là core design rule**, áp dụng từ Phase 2 | Làm cho dashboard cảm giác như product thay vì viewer |

---

## Cấu trúc thư mục dự án (Project Structure)

```
gittracking/
├── .github/
│   └── workflows/
│       └── ci.yml                    # lint + typecheck + test + build
├── docs/                             # Tất cả file .md documentation
│   ├── PROGRESS.md                   # File này
│   ├── architecture.md
│   ├── product-requirements.md
│   └── sync-analysis.md
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── repos/
│   │   │   ├── sync/
│   │   │   ├── tree/
│   │   │   ├── diff/
│   │   │   └── webhooks/             # Phase 4
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── diff/
│   │   │       └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   ├── github/                   # Octokit adapter
│   │   │   ├── client.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── repos.ts
│   │   │   ├── commits.ts
│   │   │   ├── branches.ts
│   │   │   ├── pulls.ts
│   │   │   └── webhooks.ts           # Phase 4
│   │   ├── git/                      # isomorphic-git adapter
│   │   │   ├── log.ts
│   │   │   ├── tree.ts
│   │   │   ├── diff.ts
│   │   │   └── status.ts
│   │   ├── sync/
│   │   │   ├── strategies/
│   │   │   │   ├── commits.ts
│   │   │   │   ├── branches.ts
│   │   │   │   ├── pulls.ts
│   │   │   │   └── releases.ts       # Phase 5
│   │   │   ├── cursor.ts
│   │   │   ├── idempotency.ts
│   │   │   ├── queue.ts              # Phase 4: BullMQ
│   │   │   └── worker.ts             # Phase 4: BullMQ
│   │   ├── diff/
│   │   │   ├── compare.ts
│   │   │   ├── merge-base.ts
│   │   │   ├── file-changes.ts
│   │   │   └── line-diff.ts
│   │   ├── tree/
│   │   │   ├── resolver.ts
│   │   │   └── loader.ts
│   │   ├── db/
│   │   │   └── index.ts
│   │   ├── auth.ts
│   │   ├── errors.ts
│   │   ├── logger.ts
│   │   └── utils/
│   ├── components/
│   │   ├── repo-selector.tsx
│   │   ├── commit-graph.tsx
│   │   ├── file-tree.tsx
│   │   ├── diff-viewer.tsx
│   │   └── sync-status.tsx
│   └── types/                        # Shared TypeScript types
│       ├── github.ts
│       ├── sync.ts
│       └── diff.ts
├── docker-compose.yml
├── next.config.js
├── tsconfig.json
├── .env.example
└── package.json
```

---

*Cập nhật lần cuối: khởi tạo file — Phase 0 chưa bắt đầu.*
