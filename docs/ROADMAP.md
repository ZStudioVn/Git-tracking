# Git-Tracking Roadmap

## Vision

Build a comprehensive Git change tracking dashboard that helps teams understand what changed, where it changed, and whether updates have reached their destination.

## Development Phases

### ✅ Phase 0: Project Bootstrap (COMPLETED)
**Timeline:** Week 1-2  
**Status:** 100% Complete

Core infrastructure and tooling setup.

#### Completed
- [x] Next.js 14 App Router + TypeScript strict mode
- [x] pnpm workspace configuration
- [x] ESLint, Prettier, EditorConfig
- [x] Vitest + coverage setup
- [x] Prisma ORM + PostgreSQL
- [x] Docker Compose dev environment
- [x] CSP headers configuration
- [x] Environment variable setup
- [x] GitHub Actions CI pipeline
- [x] Structured logging (Pino)
- [x] Documentation structure

**Deliverable:** `pnpm dev` runs successfully, CI passes

---

### ✅ Phase 1: Foundation (MVP COMPLETE)
**Timeline:** Week 3-5  
**Status:** 100% MVP Complete

Authentication, database, and core adapters.

#### Completed
- [x] Prisma schema design
- [x] Error taxonomy
- [x] Logger setup
- [x] Crypto utilities
- [x] Run initial migration
- [x] GitHub OAuth flow
- [x] GitHub API adapter
- [x] Sync cursor management
- [x] Idempotency handling
- [x] Seed data generation

#### Acceptance Criteria
- User can sign in with GitHub
- Initial repo import completes without errors
- Rate limit tracking works
- Duplicate webhook events don't create duplicates

---

### ✅ Phase 2: Git Navigation (MVP COMPLETE)
**Timeline:** Week 6-9  
**Status:** 100% MVP Complete

Visual commit history and file tree exploration.

#### Planned Features
- [ ] Repository connection UI
- [ ] Branch and tag list
- [ ] Commit graph visualization (using visx)
- [ ] Revision-specific file tree
- [ ] Lazy folder loading
- [ ] File history view
- [ ] Blame annotations
- [ ] Search and filters
- [ ] Permalink support for all views


---

### ✅ Phase 3: Diff Workspace (MVP COMPLETE)
**Timeline:** Week 10-13  
**Status:** 100% MVP Complete

Advanced comparison and diff viewing.

#### Planned Features
- [ ] Commit-to-commit comparison
- [ ] Branch-to-branch comparison
- [ ] Changed file tree
- [ ] Unified diff view
- [ ] Split (side-by-side) diff view
- [ ] Syntax highlighting
- [ ] Rename detection
- [ ] Binary file handling
- [ ] Large file safeguards
- [ ] Whitespace toggle
- [ ] Context expansion

#### Technical Focus
- On-demand diff computation (not stored)
- Cache by `baseSHA + headSHA`
- Merge base calculation
- Line-level diff generation

---

### 🔄 Phase 4: Sync & Automation (IN PROGRESS)
**Timeline:** Week 14-17  
**Status:** MVP DB-backed polling complete; webhook/BullMQ production upgrade pending

Background jobs, webhooks, and automatic updates.

#### Planned Features
- [ ] Scheduled polling (cron-based)
- [ ] GitHub webhook endpoint
- [ ] Webhook signature verification
- [ ] BullMQ + Redis job queue
- [ ] Background sync worker
- [ ] Retry logic with exponential backoff
- [ ] Sync status dashboard
- [ ] Error notifications
- [ ] Manual sync trigger

#### Technical Focus
- Replace plain cron with BullMQ
- Idempotent job processing
- Rate limit budget management
- Dead letter queue for failed jobs

---

### 📝 Phase 5: Workflow Intelligence (PLANNED)
**Timeline:** Week 18-22  
**Status:** 0% Complete

Advanced features, analytics, and multi-repo support.

#### Planned Features
- [ ] Multiple repository support
- [ ] Pull request grouping
- [ ] Issue/task linking
- [ ] Release reports
- [ ] Review markers and notes
- [ ] Saved comparisons
- [ ] Change hotspots
- [ ] Impact analysis
- [ ] Team activity timeline
- [ ] Markdown/CSV exports
- [ ] Advanced search

#### Technical Focus
- Multi-tenancy support
- Cross-repository queries
- Report generation
- Data aggregation and caching

---

## Beyond MVP

### Version 1.x Features
- GitHub App (replace OAuth App)
- Real-time updates via WebSockets
- Team roles and permissions
- Notification system
- Scheduled reports
- Custom dashboards
- API rate limit optimization

### Future Considerations
- Local desktop companion app
- IDE extensions (VS Code, JetBrains)
- GitLab / Bitbucket support
- Self-hosted Git server support
- Offline mode
- Mobile app
- AI-powered insights
- Code review workflow integration

---

## Feature Priorities

### Must-Have (MVP)
1. GitHub OAuth authentication
2. Single repository connection
3. Commit graph visualization
4. File tree navigation
5. Commit-to-commit diff
6. Manual sync
7. Sync status display

### Should-Have (V1)
1. Webhooks for real-time updates
2. Multiple repositories
3. File history and blame
4. Saved comparisons
5. Pull request grouping

### Nice-to-Have (V2+)
1. Change hotspots
2. Impact analysis
3. Team analytics
4. Custom reports
5. IDE extensions

---

## Release Schedule

| Version | Target Date | Focus |
|---------|-------------|-------|
| 0.1.0   | 2026-09-15  | MVP (Phase 0-3) |
| 0.2.0   | 2026-10-15  | Webhooks & jobs (Phase 4) |
| 1.0.0   | 2026-12-01  | Multi-repo & intelligence (Phase 5) |
| 1.1.0   | 2027-01-15  | GitHub App upgrade |
| 2.0.0   | 2027-03-01  | Advanced analytics |

---

**Last updated:** 2026-08-03  
**Current Phase:** Phase 1 - Foundation

