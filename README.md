<div align="center">

# ⚡ Git-Tracking

**A local-first Git workspace, change-diff analyzer, and automated GitHub synchronizer built for modern open-source maintainers and engineering teams.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Electron](https://img.shields.io/badge/Electron-33.0-47848F?logo=electron)](https://www.electronjs.org/)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Vitest-Passing-green?logo=vitest)](https://vitest.dev/)
[![OpenAI Codex Program](https://img.shields.io/badge/OpenAI-Codex_for_Open_Source-00A67E?logo=openai)](https://openai.com/)

[Key Features](#-key-features) •
[Architecture](#-architecture) •
[Quick Start](#-quick-start) •
[Desktop & Web Modes](#-desktop--web-modes) •
[Scripts](#-available-scripts) •
[Security](#-security--maintainer-safety) •
[Documentation](#-documentation)

</div>

---

## 📌 Overview

Open-source maintainers and developer teams face significant friction triaging pull requests, inspecting local working tree diffs across multiple repositories, and keeping local branches aligned with remote GitHub state.

**Git-Tracking** addresses this challenge with a unified, high-performance **Desktop + Web application** that provides real-time local Git status tracking, instant line-by-line diff viewing, ahead/behind drift monitoring, and rate-limit resilient GitHub synchronization.

### 🌟 Why Git-Tracking for Maintainers & Codex Workflows?

- **Zero-Latency Local Git Inspection**: Fast, offline-first local repository parsing without relying on external API limits.
- **Unified Diff & PR Workspace**: Review changed files grouped by state (_Conflicts_, _Staged_, _Modified_, _Untracked_) with side-by-side syntax-highlighted diffs.
- **Guarded Git Command Center**: Execute common maintainer tasks safely through whitelisted non-shell IPC bridge calls.
- **AI Triage & Codex Automation Ready**: Built with structured API endpoints (`/api/diff`, `/api/commits`, `/api/tree`, `/api/local-projects`) to facilitate seamless integration with AI coding assistants, automated code reviews, and maintenance bots.

---

## ✨ Key Features

### 💻 Local-First Desktop Shell (Electron + Next.js)

- Native directory picker to register local Git projects instantly.
- Multi-project dashboard context switching (`All` | `GitHub` | `Local`).
- Background auto-refresh on file events, focus, or periodic 30-second interval.

### 🔍 Interactive Diff & Change Analyzer

- Per-file side-by-side or unified diff viewing powered by `react-diff-view`.
- Grouped file status cards: **Conflicts**, **Staged**, **Modified**, and **Untracked**.
- One-click copy diff to clipboard & native "Open Folder in File Explorer / Finder".

### ⚡ Ahead / Behind Branch Drift Tracking

- Real-time indicator showing how many commits a branch is `↑ ahead` or `↓ behind` upstream.
- Synchronized commit timeline graph powered by `@visx` visualization libraries.

### 🛡️ Guarded Command Center

- Execute safe Git commands directly: `status`, `diff`, `log`, `branch`, `remote`, `fetch`, `pull`, `push`, `config`.
- Strict command whitelist running via isolated child processes (**never evaluated in a shell**).

### 🔄 Rate-Limit Resilient GitHub Sync Engine

- Smart cursor-based incremental sync engine via Octokit.
- Aggressive SHA caching to stay well within GitHub API rate limits.
- PostgreSQL + Prisma persistence layer for robust metadata caching and historical logs.

---

## 🏗️ Architecture

Git-Tracking operates seamlessly as either a **cross-platform Desktop application** (Electron wrapping a local Next.js server) or a **centralized Web application** (Next.js App Router with PostgreSQL).

```mermaid
graph TD
    A[Electron Desktop Shell / Web UI] --> B[Next.js App Router - Port 3000/3100]
    B --> C[Local Git Service - Node.js fs / child_process]
    B --> D[Prisma ORM - PostgreSQL 16]
    B --> E[GitHub API Adapter - Octokit]
    C --> F[Local Git Repositories]
    E --> G[GitHub Remote Repositories]

    subgraph Security Boundary
        A -. IPC Whitelist Bridge .- C
    end
```

### Tech Stack Breakdown

| Layer              | Technology                     | Description                                                     |
| :----------------- | :----------------------------- | :-------------------------------------------------------------- |
| **Framework**      | Next.js 14 (App Router)        | Server-side rendering, React Server Components, API routes      |
| **Desktop Shell**  | Electron 33                    | Context-isolated desktop container with native OS integration   |
| **Language**       | TypeScript 5.6                 | Strict type-checking across Web, API, and Electron main process |
| **Database**       | PostgreSQL 16 + Prisma ORM     | Persistent storage for users, projects, logs, and sync states   |
| **Authentication** | NextAuth.js v5                 | GitHub OAuth 2.0 authentication flow                            |
| **Git Engine**     | `execFile` + `isomorphic-git`  | Native local Git integration with web-compatible fallback       |
| **GitHub SDK**     | Octokit                        | REST API adapter for remote synchronization                     |
| **Visualization**  | `@visx` & `react-diff-view`    | Commit tree lane layout & interactive diff rendering            |
| **Testing**        | Vitest & React Testing Library | Fast unit and integration test suite                            |

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed on your machine:

- **Node.js**: `v20.x LTS` or higher
- **Package Manager**: `npm` (v10+) or `pnpm` (v9+)
- **Database**: PostgreSQL 16 (or Docker Desktop)
- **Git**: Installed locally on your system

---

### Recommended Desktop Mode (Local-First)

Run Git-Tracking as a native desktop application with full access to local Git repositories:

```bash
# 1. Clone repository
git clone https://github.com/ZStudioVn/Git-tracking.git
cd Git-tracking

# 2. Install dependencies
npm install

# 3. Launch Desktop in Development mode
npm run desktop:dev
```

To build a standalone desktop executable/installer for your operating system:

```bash
# Windows
npm run desktop:win

# macOS
npm run desktop:mac

# Linux
npm run desktop:linux
```

---

### Web Server Mode (Docker + PostgreSQL Setup)

1. **Configure Environment Variables**:
   Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gittracking?schema=public"
   NEXTAUTH_SECRET="your-generated-32-byte-secret"
   GITHUB_CLIENT_ID="your-github-oauth-client-id"
   GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"
   ENCRYPTION_KEY="your-generated-encryption-key"
   ```

2. **Start PostgreSQL Database via Docker**:

   ```bash
   docker-compose up -d postgres
   ```

3. **Initialize Database Schema**:

   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

4. **Start Web Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Available Scripts

| Command                      | Description                                                         |
| :--------------------------- | :------------------------------------------------------------------ |
| `npm run desktop:dev`        | Start Next.js server & Electron desktop application concurrently    |
| `npm run desktop:build`      | Build production Next.js app & compile Electron TypeScript services |
| `npm run desktop:package`    | Package Electron application into native installer executable       |
| `npm run dev`                | Launch Next.js web application in development mode                  |
| `npm run build`              | Build optimized Next.js web application for production              |
| `npm run typecheck`          | Run TypeScript type checks across all Next.js & API files           |
| `npm run electron:typecheck` | Run TypeScript type checks specifically for Electron files          |
| `npm run lint`               | Run ESLint static code analysis                                     |
| `npm run test`               | Run fast unit test suite using Vitest                               |
| `npm run prisma:migrate`     | Apply Prisma database schema migrations                             |
| `npm run prisma:seed`        | Seed test database with initial mock data                           |

---

## 📂 Project Directory Structure

```
Git-tracking/
├── electron/               # Electron Main Process & Preload IPC services
│   ├── services/           # Local Git, Git Config, and Project Store handlers
│   ├── main.ts             # Electron entry point & IPC handler registry
│   ├── preload.ts          # Context-isolated IPC bridge definitions
│   └── tsconfig.json       # Electron TS compiler configuration
├── src/
│   ├── app/                # Next.js App Router (Pages, UI Layouts & API Routes)
│   │   ├── api/            # REST API endpoints (Git, Repos, Diff, Logs, Auth)
│   │   ├── dashboard/      # Unified maintainer dashboard views
│   │   └── setup/          # First-time project setup onboarding
│   ├── components/         # Reusable React UI components (Diff, Tree, Graph)
│   ├── lib/
│   │   ├── local-git/      # Modular Local Git engine (inspect, diff, log, tree)
│   │   ├── github/         # Octokit GitHub REST API integrations
│   │   └── security/       # Input sanitization, rate-limiting & path validation
├── prisma/                 # Database schema, seed data, and SQL migrations
├── docs/                   # System architecture, API specs & development progress
├── docker-compose.yml      # Container orchestration for local PostgreSQL
├── package.json            # Scripts & project dependencies
└── vitest.config.ts        # Vitest test framework configuration
```

---

## 🛡️ Security & Maintainer Safety

Security and safety are paramount when handling local developer file systems and Git repositories:

- **Zero-Shell Execution (`execFile`)**: All local Git operations use Node.js `execFile` with direct argument arrays. Command strings are never passed to shell interpreters (`sh`, `bash`, `cmd.exe`), completely neutralizing command injection vulnerabilities.
- **Strict IPC Whitelisting**: Electron IPC bridge strictly limits exposed operations to safe, predefined Git actions (`status`, `log`, `diff`, `push`, `config`).
- **Context Isolation & Sandboxing**: Desktop web preferences enable `contextIsolation: true` and `sandbox: true`, preventing web views from executing arbitrary Node modules.
- **Path Traversal Guards**: Path sanitization functions (`assertSafeRelativePaths`) validate path inputs to reject directory traversal attempts (`..`).

---

## 🗺️ Development Roadmap

|    Phase    |   Status    | Focus Area                                                                                       |
| :---------: | :---------: | :----------------------------------------------------------------------------------------------- |
| **Phase 0** | ✅ Complete | Project Bootstrap, Tooling, CI setup                                                             |
| **Phase 1** | ✅ Complete | Core Foundation (Auth, Prisma DB schema, GitHub OAuth, local Git engine)                         |
| **Phase 2** | ✅ Complete | Git Navigation (Commit timeline graph, lazy file tree, revision URLs)                            |
| **Phase 3** | ✅ Complete | Diff Workspace (Side-by-side file diffs, conflict resolution view)                               |
| **Phase 4** |  🔄 Active  | Automated Synchronization, Webhooks, Desktop IPC expansion                                       |
| **Phase 5** | ⬜ Planned  | Multi-repo maintainer intelligence, automated PR triage reports & Codex AI assistant integration |

---

## 🤝 Contributing

We welcome contributions from open-source maintainers and developer community members!

1. Read our [CONTRIBUTING.md](CONTRIBUTING.md) guide before submitting PRs.
2. Review technical architecture in `docs/architecture.md`.
3. Verify that all automated checks pass prior to submitting code:
   ```bash
   npm run typecheck && npm run lint && npm run test
   ```

---

## 📄 License

This project is open-source software licensed under the **[MIT License](LICENSE)**.

Copyright © 2026 **ZStudioVn**

---

<div align="center">
  <sub>Built with passion by <b>ZStudioVn</b> for Open-Source Maintainers worldwide.</sub>
</div>
