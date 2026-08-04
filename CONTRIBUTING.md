# Git-Tracking: Contributing Guide

## Welcome

Thank you for considering contributing to Git-Tracking! This guide will help you get started.

## Before You Start

1. Read `docs/PROGRESS.md` to understand the current development phase
2. Check open issues and the task tracker
3. Review `docs/architecture.md` for system design principles
4. Familiarize yourself with our tech stack in `docs/SETUP.md`

## Development Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 9.x
- PostgreSQL 16
- GitHub OAuth App credentials

### Quick Start

```bash
# Clone the repository
git clone https://github.com/ZStudioVn/Git-tracking.git
cd gittracking

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start PostgreSQL
docker-compose up -d postgres

# Initialize database
pnpm prisma migrate dev
pnpm prisma:seed

# Run development server
pnpm dev
```

## Code Standards

### TypeScript

- Use strict mode (already configured)
- Prefer interfaces over types for object shapes
- Use explicit return types for public functions
- Avoid `any` - use `unknown` if type is truly unknown

### Naming Conventions

- **Files**: kebab-case (e.g., `rate-limit.ts`)
- **Components**: PascalCase (e.g., `CommitGraph.tsx`)
- **Functions**: camelCase (e.g., `fetchCommits()`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Interfaces/Types**: PascalCase (e.g., `SyncJobStatus`)

### Code Organization

```
src/lib/[domain]/
  ├── index.ts          # Public API exports
  ├── types.ts          # Domain-specific types
  ├── [feature].ts      # Implementation files
  └── [feature].test.ts # Unit tests
```
