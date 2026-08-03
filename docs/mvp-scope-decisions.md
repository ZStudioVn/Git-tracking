# Tracking Update Product: MVP Scope Decisions and Advisory Notes

## Purpose

This document records product and technical advice for the Git/GitHub tracking application. It supplements the other tracking documents by adding MVP scoping decisions, missing-feature recommendations, and technical risk guidance.

## 1. MVP feature bundle

The MVP should ship as one coherent unit built from three layers:

### Layer 1: Read and navigate

- Connect one GitHub repository.
- Authenticate with GitHub.
- Import commits, branches, tags, and pull request metadata.
- Display a commit graph.
- Display a revision-specific file tree.

### Layer 2: Compare and diff

- Compare two commits or two branches.
- Show a changed-file tree with counts.
- Display unified and split text diffs.
- Handle renamed, deleted, binary, and large files safely.

### Layer 3: Sync and trust

- Support manual synchronization.
- Support scheduled polling.
- Show synchronization status, timestamps, and errors.
- Retry temporary failures without duplicating records.

### Excluded from the MVP bundle

The following must NOT ship in the MVP, even though they are tempting:

- GitHub webhooks (move to Version 1).
- Pull request grouping, notes, review markers, and reports (Version 1).
- Multiple repositories (Version 1).
- AI-generated summaries (post-Version 1).
- Impact and hotspot analytics (post-Version 1).
- Local desktop client and IDE extension (only after the web app has traction).

## 2. Missing features worth adding to the MVP

These are high-value and cheap once the commit index exists:

### Blame and per-line annotations

The existing docs intentionally skip blame, but it is the most-used GitLens feature and is trivial to compute from the indexed commit data. High perceived value for near-zero cost. Add it early.

### Permalinks as a core rule

Every screen should produce a shareable URL: a tree, a commit, a diff, or a saved comparison. This is what makes a dashboard feel like a product instead of a viewer. Treat "every screen is a URL" as a core design rule, not an optional feature.

### File history view

Show all commits that touched a single file. This is easier to build than the commit graph and is often requested first by users. Consider moving it from Version 1 into the MVP.

### Local-versus-remote state on the tree

Show a badge directly in the tree such as "this branch is 3 commits ahead of the server." This makes the synchronization promise visible while browsing, rather than hiding it in a separate panel.

## 3. Technical risk guidance

### GitHub API rate limits are the primary constraint

The GitHub API allows roughly 5000 requests per hour per token. Tree, diff, and commit fetching consume this quickly.

Required mitigations:

- Use cursor-based incremental synchronization.
- Cache by SHA aggressively (commit SHA, tree SHA).
- Poll conservatively; frequent polling across many repositories exhausts the limit.
- Store changed-file lists and stats, not full diffs.

### Do not store full diffs

Store the changed-file list and line counts at import time. Compute line-level diffs on demand from blob SHAs and cache by a stable key such as base SHA plus head SHA plus diff options.

### Prefer a GitHub App over personal access tokens

For anything beyond a single-user self-hosted setup, use a GitHub App with least-privilege permissions. Asking users to paste broad personal tokens is the most common way this kind of product fails.

### Keep the job system simple for the MVP

A plain cron scheduler plus a synchronization jobs table with status and retry fields is enough for the MVP. Introduce a dedicated queue system only when webhooks and background report generation arrive.

## 4. Recommended stack

- TypeScript end to end: shared types between the server and the web UI, because the diff and state logic is type-heavy.
- Postgres or SQLite as the database, with a synchronization cursor table.
- Shell out to the git CLI for local operations instead of using isomorphic-git. The CLI is battle-tested and no desktop binary is being shipped.
- Use an existing library for commit graph lane layout rather than hand-rolling it. Lane positioning is deceptively complex.

## 5. Bottom line

The existing specification documents are strong. The main upgrades are:

1. Pull blame, file history, and permalinks closer to the MVP.
2. Treat "every screen produces a URL" as a core rule.
3. Treat GitHub API rate limits as the primary technical risk rather than a footnote.
