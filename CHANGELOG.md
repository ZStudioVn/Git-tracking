# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial project structure and configuration
- Prisma schema for core data models
- GitHub OAuth authentication setup
- Basic API routes structure
- Documentation (PROGRESS, SETUP, architecture, product requirements)
- Docker Compose for development environment
- CI/CD pipeline with GitHub Actions
- ESLint, Prettier, and EditorConfig setup
- Vitest testing framework
- Structured logging with Pino
- Rate limit handling for GitHub API
- Sync engine foundation (cursor-based, idempotent)
- Diff service structure
- Tree service structure
- React components structure

### Phase 0 - Project Bootstrap ✅

- [x] Next.js 14 App Router + TypeScript setup
- [x] pnpm workspace configuration
- [x] Linting and formatting tools
- [x] Testing framework setup
- [x] Database schema design
- [x] Development environment (Docker Compose)
- [x] Environment configuration
- [x] CI pipeline
- [x] Documentation organization

### Phase 1 - Foundation 🔄

- [x] Run initial database migration
- [x] Complete authentication flow
- [x] Implement GitHub adapter
- [x] Build DB-backed sync worker
- [x] Create seed data
- [ ] Test end-to-end authentication against configured GitHub OAuth credentials

### Upcoming

- Phase 2: Git Navigation (commit graph, file tree, blame)
- Phase 3: Diff Workspace (comparison, unified/split diff)
- Phase 4: Sync & Automation (webhooks, BullMQ, scheduled polling)
- Phase 5: Workflow Intelligence (multi-repo, reports, analytics)

---

## Release History

### [0.1.0] - Unreleased

First MVP release (target: Phase 1-3 completion)

---

**Legend:**

- 🔄 In Progress
- ✅ Completed
- 🚧 Blocked
- 📝 Planned
