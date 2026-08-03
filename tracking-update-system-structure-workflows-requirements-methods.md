# GitHub Tracking Update System

## Structure, Workflows, Requirements, and Methods

## 1. Purpose

This document describes the proposed structure and operating method for a Git and GitHub tracking application.

The system will:

- Read Git and GitHub history.
- Display a visual repository tree and commit graph.
- Compare revisions, branches, releases, and local changes.
- Track whether updates are committed, pushed, received by GitHub, and synchronized to the application server.
- Connect code changes to pull requests, issues, tasks, and releases.
- Generate timelines, summaries, and reports.

Git and GitHub remain the authoritative source of code history. The application stores an indexed copy and additional workflow metadata.

## 2. Core principles

### 2.1 Git is the source of truth

The application must not silently rewrite Git history or treat its own database as a replacement for Git.

Every important result should be traceable to:

- Repository
- Branch or tag
- Commit SHA
- File path
- GitHub event, issue, pull request, or release

### 2.2 Separate local state from remote state

The system must distinguish between:

- Local uncommitted changes
- Staged changes
- Local commits
- Pushed commits
- GitHub commits
- Server-indexed commits

These states must not be shown as if they are the same.

### 2.3 Synchronization must be repeatable

The same webhook or synchronization request may arrive more than once. Processing it repeatedly must not create duplicate commits, events, or records.

### 2.4 Derived information must be explainable

Features such as impact analysis, hotspots, and summaries are calculations. The UI must show the underlying commits and files used to produce the result.

### 2.5 Start small and grow safely

The first implementation should support one repository, basic synchronization, a tree, and revision comparison before adding advanced analytics.

## 3. High-level system structure

```text
+------------------------+
| Local Git Repository    |
| Working tree / index    |
+-----------+------------+
            |
            | local Git adapter
            v
+------------------------+       GitHub API       +----------------------+
| Optional Local Client  | <--------------------> | GitHub               |
| status, local commits  |                         | repo, PR, issues     |
+-----------+------------+                         +----------+-----------+
            |                                                  |
            | sync request                                      | webhook
            v                                                  v
       +----+--------------------------------------------------+----+
       |                    Application Server                      |
       |                                                             |
       |  API / Auth  | Sync Worker | GitHub Adapter | Diff Service  |
       |                                                             |
       +----+------------------------+--------------------------+----+
            |                        |
            v                        v
  +-------------------+     +---------------------+
  | Indexed Git Data  |     | Workflow Metadata   |
  | commits, trees,   |     | notes, review state,|
  | branches, diffs   |     | saved comparisons  |
  +-------------------+     +---------------------+
            |
            v
  +------------------------------------------------------+
  | Web Dashboard / Desktop UI / Future IDE Extension    |
  +------------------------------------------------------+
```

## 4. Component responsibilities

### 4.1 Local Git adapter

The local adapter is optional for the first server-only version. It is required for local working-tree features.

Responsibilities:

- Detect the repository root.
- Read current branch and remote tracking branch.
- Read uncommitted and staged changes.
- Read local commits not pushed to the remote.
- Read local branches, tags, and commit graph.
- Calculate local diffs.
- Report local state to the server only when the user permits it.

It must not upload source code or private diff content unless the product explicitly requires that behavior and the user has consented.

### 4.2 GitHub adapter

Responsibilities:

- Authenticate with GitHub.
- Read repositories, branches, tags, commits, trees, contents, pull requests, issues, and releases.
- Read comparison results where appropriate.
- Register and verify webhooks.
- Normalize GitHub responses into internal records.
- Handle pagination, rate limits, retries, and API errors.

The adapter should hide GitHub-specific API details from the rest of the application.

### 4.3 Synchronization service

Responsibilities:

- Start manual, scheduled, or webhook-triggered synchronization.
- Identify the repository and source event.
- Find the last synchronized commit or cursor.
- Import only new or changed data.
- Store synchronization progress.
- Retry temporary failures.
- Prevent duplicate processing.
- Mark data as complete, partial, stale, or failed.

### 4.4 Sync worker and job queue

Synchronization should run as a background job rather than blocking a web request.

Job types may include:

- Initial repository import
- Incremental push synchronization
- Pull request synchronization
- Branch refresh
- Release refresh
- Diff generation
- Change analytics generation
- Report generation

Each job should have an ID, repository ID, trigger, status, attempt count, timestamps, and error information.

### 4.5 Repository index

The index stores normalized and searchable data derived from GitHub and Git.

It should contain at least:

- Repository
- Remote
- Branch
- Tag
- Commit
- Commit parent relationship
- Tree node
- File path
- File change
- Pull request
- Issue or task reference
- Release
- Synchronization cursor

The index should store commit SHAs and source URLs so records can be validated and opened in GitHub.

### 4.6 Workflow metadata store

This stores information that does not belong in Git history, such as:

- User notes
- Team comments
- Review markers
- Saved comparisons
- User preferences
- Synchronization settings
- Dashboard filters
- Application permissions

Workflow metadata must never overwrite the original Git or GitHub data.

### 4.7 Diff service

Responsibilities:

- Resolve two comparison targets.
- Determine the correct base revision.
- Calculate changed files.
- Detect additions, deletions, modifications, renames, and copies.
- Generate line-level text differences.
- Apply whitespace and generated-file filters.
- Enforce limits for large or binary files.
- Cache safe-to-reuse diff results.

### 4.8 Application API

The API provides data to the web or desktop UI.

Example API areas:

- Authentication and user profile
- Repository connections
- Repository tree navigation
- Commit graph and history
- Diff comparisons
- Synchronization status
- Pull request and release links
- Notes and review markers
- Reports and exports

The API should return source revision information with every Git-derived response.

### 4.9 User interface

The initial UI should contain:

1. Repository selector.
2. Branch and remote status.
3. Commit graph.
4. Revision-specific file tree.
5. Update timeline.
6. Diff comparison workspace.
7. Synchronization status.
8. Related pull request, issue, and release links.

## 5. Data and state model

### 5.1 Repository state

```text
Repository
  - provider: GitHub
  - owner
  - name
  - default branch
  - visibility
  - last indexed commit
  - last synchronization status
```

### 5.2 Commit state

```text
Commit
  - SHA
  - repository ID
  - parent SHAs
  - author
  - committer
  - message
  - authored time
  - committed time
  - source URL
```

### 5.3 File change state

```text
FileChange
  - commit SHA
  - old path
  - new path
  - change type
  - additions
  - deletions
  - binary flag
  - rename similarity when available
```

### 5.4 Synchronization state

```text
Synchronization
  - ID
  - repository ID
  - trigger type
  - source event ID
  - cursor or commit SHA
  - status
  - attempt count
  - started time
  - completed time
  - error summary
```

Recommended statuses:

- `pending`
- `running`
- `completed`
- `partial`
- `retrying`
- `failed`
- `stale`

## 6. Main workflows

### 6.1 Connect a GitHub repository

1. User signs in or authorizes the application.
2. User selects a permitted GitHub repository.
3. Application creates a repository connection record.
4. Application registers a webhook if webhook mode is enabled.
5. Application creates an initial synchronization job.
6. Worker imports branches, tags, commits, trees, and related GitHub records.
7. UI shows progress and the first successful synchronization time.

### 6.2 Initial synchronization

1. Load repository metadata.
2. Load the default branch reference.
3. Load reachable commit history in pages.
4. Store commits and parent relationships.
5. Load tree and file metadata for required revisions.
6. Load pull requests, issues, and releases.
7. Link related records using GitHub references and configured task patterns.
8. Store the last successfully processed cursor.
9. Mark the job completed.

For very large repositories, the first version may index the default branch first and load older branches or file contents on demand.

### 6.3 Webhook synchronization

1. GitHub sends an event to the webhook endpoint.
2. Server verifies the webhook signature.
3. Server records the delivery ID.
4. Server rejects or ignores a delivery already processed.
5. Server places an appropriate sync job on the queue.
6. Worker fetches the latest required data from GitHub.
7. Worker updates the index transactionally where possible.
8. Server records success or a retryable failure.
9. UI timeline and synchronization status update.

### 6.4 Polling synchronization

1. Scheduler finds repositories due for refresh.
2. Worker checks branch references and recent events.
3. Worker compares remote references with the stored cursor.
4. Worker imports missing commits and related metadata.
5. Worker updates the last checked and last successful times.
6. Worker applies backoff when GitHub rate limits or errors occur.

### 6.5 Browse the Git tree

1. User chooses a repository.
2. User chooses a branch, tag, or commit.
3. Server resolves the revision to a commit SHA.
4. Tree service loads the root tree for that revision.
5. UI displays folders and files.
6. User expands a folder.
7. Server loads that subtree on demand.
8. User selects a file to see its history and related diffs.

### 6.6 Compare revisions

1. User selects base and comparison targets.
2. Server resolves both targets to stable revisions.
3. Server determines the merge base for branch comparisons.
4. Diff service finds changed files.
5. Diff service calculates line-level changes for supported text files.
6. UI displays file tree, summary counts, and individual diffs.
7. User can filter, review, annotate, export, or share the comparison.

### 6.7 Local update status

1. Local adapter identifies the repository and current branch.
2. It reads working-tree and index status.
3. It compares local and remote branch references.
4. It classifies changes as uncommitted, staged, local-only, pushed, or synchronized.
5. It sends only the permitted status data to the server.
6. UI displays the state with a timestamp.

### 6.8 Generate a release report

1. User selects two tags or a tag and a branch.
2. Server calculates the comparison range.
3. Server groups changes by commit, pull request, issue, task, author, and folder.
4. Server generates a summary with source links.
5. User reviews the report.
6. User exports Markdown or CSV.

## 7. Implementation methods

### 7.1 Repository synchronization method

Use a cursor-based incremental method:

1. Store the last known remote reference and commit SHA.
2. On a new event, inspect the new reference.
3. Import only commits reachable from the new reference that are not indexed.
4. Update branch and tag references after successful import.
5. Keep the old reference until the import succeeds.

This avoids presenting a branch as synchronized before its related commits have been indexed.

### 7.2 Idempotency method

Use stable external identifiers:

- Repository full name or provider repository ID
- Commit SHA
- GitHub webhook delivery ID
- Pull request number within a repository
- Issue number within a repository
- Release ID

Before inserting a record, check the relevant unique identifier. If it already exists, update metadata instead of inserting a duplicate.

### 7.3 Retry method

Retry only errors likely to be temporary, such as:

- Network failure
- GitHub service error
- Temporary rate limit
- Temporary database or queue failure

Do not endlessly retry permanent errors such as invalid credentials or a deleted repository. Use exponential backoff and expose a clear final error.

### 7.4 Git tree method

Represent the tree as revision-specific paths, not as one mutable global folder structure.

For a selected commit:

1. Resolve the commit tree SHA.
2. Load the root tree.
3. Load child trees only when the user expands them.
4. Cache tree responses by tree SHA.
5. Use file paths and blob SHAs to identify file content.

This supports historical browsing and reduces unnecessary API requests.

### 7.5 Commit graph method

Store commits as nodes and parent relationships as directed edges.

The graph renderer should calculate:

- Branch lanes
- Merge points
- Divergence points
- Ahead and behind counts
- Tag and release markers

The graph should use pagination or a visible date/range window for large histories.

### 7.6 Diff method

For two revisions:

1. Resolve both revisions to commit SHAs.
2. Determine the merge base when comparing branches.
3. Identify the changed file set.
4. Classify each file change.
5. Load text content only when a line diff is requested.
6. Apply whitespace and generated-file options.
7. Return a stable comparison ID and source references.

Large, binary, or unsupported files should return metadata and a clear message instead of causing the whole comparison to fail.

### 7.7 Change grouping method

Group changes using this order:

1. Explicit pull request association.
2. Issue or task identifiers in branch names and commit messages.
3. Release and tag ranges.
4. Folder or service ownership rules.
5. Date and author fallback grouping.

Every automatic grouping should be labeled as inferred when it is not explicitly provided by GitHub or the user.

### 7.8 Impact analysis method

The first version should use explainable heuristics:

- Changed folder and its parent project area
- Files changed together in recent history
- Import or dependency relationships where available
- Recent changes to related tests
- Ownership and frequently modified files

The output should say why a file or folder was included. For example: “frequently changed with `src/payment/service` in the last 50 commits.”

Do not present heuristic impact analysis as a guaranteed dependency analysis.

### 7.9 Caching method

Safe cache keys may include:

- Repository ID plus commit SHA
- Tree SHA
- Base SHA plus comparison SHA plus diff options
- GitHub response endpoint plus relevant revision

Invalidate or refresh cache entries when branch references, permissions, or source metadata change.

### 7.10 Permission method

Apply authorization in two layers:

1. GitHub authorization determines which repositories the integration can access.
2. Application authorization determines which connected users can view or modify application data.

Every repository-scoped request must verify the requesting user’s access. Never rely only on hidden UI controls.

## 8. Functional requirements

### Repository requirements

- The system must connect a permitted GitHub repository.
- The system must show repository, branch, tag, and remote information.
- The system must preserve source commit SHAs.
- The system must link displayed data back to GitHub.

### Tree requirements

- The system must show a file tree for a selected revision.
- The system must support folder expansion.
- The system must show changed-file status in a comparison.
- The system must support renamed and deleted paths.
- The system must allow navigation from a file to its history.

### Diff requirements

- The system must compare commits and branches.
- The system must show changed-file counts.
- The system must support unified and split text diffs.
- The system must identify additions, deletions, modifications, renames, and binaries.
- The system must handle large diffs safely.
- The system must provide source revision links.

### Synchronization requirements

- The system must support manual synchronization.
- The system must support scheduled synchronization.
- The system should support GitHub webhooks.
- The system must show synchronization state and timestamps.
- The system must retry temporary failures.
- The system must prevent duplicate event processing.
- The system must preserve the last successful state.

### Workflow requirements

- The system must link commits to pull requests where possible.
- The system should link commits to issues, tasks, and releases.
- The system should support notes or review markers.
- The system should generate Markdown or CSV reports.

## 9. Non-functional requirements

### Security

- Use least-privilege GitHub permissions.
- Encrypt credentials and webhook secrets at rest.
- Verify webhook signatures.
- Use HTTPS in hosted deployments.
- Do not expose private repository data across users or teams.
- Do not place tokens in logs, URLs, or client-visible error messages.

### Reliability

- A repeated event must be safe.
- A GitHub outage must not delete existing indexed data.
- Failed jobs must be visible and retryable.
- Partial imports must be marked clearly.
- The UI must show when data is stale.

### Performance

- Load tree folders on demand.
- Paginate commit history and search results.
- Cache immutable commit and tree data.
- Limit very large diff responses.
- Move synchronization and report generation to background jobs.

### Maintainability

- Keep GitHub-specific code in an adapter.
- Keep diff calculation behind a service boundary.
- Use versioned data migrations.
- Record structured job and synchronization logs.
- Add automated tests for revision resolution and synchronization idempotency.

## 10. MVP definition

The MVP should contain:

1. One GitHub repository connection.
2. GitHub authentication.
3. Manual synchronization.
4. Scheduled polling.
5. Repository branches, tags, and commits.
6. Commit graph.
7. Revision-specific file tree.
8. Commit-to-commit and branch-to-branch comparison.
9. Unified and split text diff.
10. Synchronization status and error display.
11. Links to GitHub source records.

The MVP should not yet require:

- Full local desktop integration
- Automatic code modification
- Advanced AI summaries
- Multi-provider Git support
- Complex team permissions
- Full repository content mirroring

## 11. Acceptance checklist

The first implementation is acceptable when:

- A user can connect a permitted repository.
- The initial import completes without duplicate records.
- A user can browse a selected commit’s tree.
- A user can compare two revisions.
- Renamed, deleted, binary, and large files are handled safely.
- A repeated webhook does not duplicate data.
- A failed synchronization can be retried.
- The UI shows the difference between GitHub state and server-indexed state.
- Every Git-derived result identifies its repository and revision.
- Private repository data is visible only to authorized users.

## 12. Recommended implementation sequence

### Phase 1: Foundation

- Repository connection
- Authentication
- Internal repository and commit model
- Manual synchronization
- Basic status page

### Phase 2: Git navigation

- Branch and tag views
- Commit graph
- Revision-specific tree
- File history

### Phase 3: Diff workspace

- Commit comparison
- Branch comparison
- Changed-file tree
- Unified and split diff
- Large-file safeguards

### Phase 4: Automatic updates

- Scheduled polling
- Webhook endpoint
- Job queue
- Retry and idempotency handling
- Synchronization timeline

### Phase 5: Workflow intelligence

- Pull request and issue grouping
- Release reports
- Notes and review markers
- Change hotspots
- Explainable impact analysis

## 13. Final method recommendation

Use a **server-indexed, event-driven GitHub integration with optional local Git support**:

- GitHub API supplies repository and collaboration data.
- GitHub webhooks trigger near-real-time synchronization.
- Scheduled polling provides recovery and verification.
- A background worker imports and indexes data.
- Git SHAs and webhook delivery IDs provide stable identity.
- Tree and diff services provide revision navigation and comparison.
- Workflow metadata remains separate from Git history.
- The UI always shows source revision, synchronization freshness, and permission scope.

This method supports the desired Git tree and update-diff experience while remaining practical for a free or self-hosted product.
