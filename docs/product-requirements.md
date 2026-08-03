# Tracking Update Product: Features, Workflow, and Requirements

## 1. Product direction

The product should be more than a Git history viewer. Its main purpose is to help a person or team answer:

- What changed?
- Where did it change?
- Which branch, release, task, or pull request contains the change?
- What is different between two points in time?
- Has the update reached GitHub and the shared server?
- Which parts of the project may be affected?

The product can be described as a **Git tree, update timeline, and change-diff tracking system**.

Git and GitHub remain the source of truth. The application adds navigation, indexing, comparison, status, and workflow context around them.

## 2. Feature ideas

### A. Repository and Git tree explorer

This should be one of the main differentiators.

#### Repository tree

- Show repositories, branches, tags, and remote status.
- Show the project folder and file tree for a selected commit or branch.
- Expand and collapse folders quickly.
- Search files and folders.
- Filter by file type, author, recent update, or change status.
- Show deleted, renamed, moved, and newly created files.
- Show the last commit that changed each file or folder.
- Show file-level change counts directly in the tree.

#### Commit graph

- Display commits as a visual graph.
- Show branch creation, divergence, merge, and deletion.
- Show tags and release points.
- Select one or more commits for comparison.
- Highlight the current branch and remote branch position.
- Show whether local and remote branches are ahead, behind, or diverged.
- Allow filtering by branch, author, date, and commit message.

#### Tree and graph connection

- Selecting a commit updates the file tree to that commit state.
- Selecting a folder shows all commits affecting that folder.
- Selecting a file shows its history and related diffs.
- Selecting a graph range shows the files changed in that range.
- Display a breadcrumb such as `branch > commit > folder > file`.

### B. Update and synchronization tracking

- Show local repository status.
- Show whether changes are committed, uncommitted, staged, pushed, or synchronized.
- Show the last successful server synchronization.
- Show pending synchronization jobs.
- Show synchronization errors with a retry action.
- Distinguish local-only commits from commits available on GitHub.
- Track push, pull, merge, release, and pull request events.
- Display an event timeline for each repository.
- Allow manual sync in addition to automatic sync.

### C. Diff and comparison workspace

Diff should be a central workspace rather than only a small commit detail view.

#### Comparison targets

Users should be able to compare:

- Two commits
- A commit and its parent
- Two branches
- A branch and its remote tracking branch
- A tag and a branch
- Two releases
- The current local state and the last pushed state
- The current state and a selected historical date

#### Diff views

- Unified diff
- Split or side-by-side diff
- File tree of changed files
- Folder summary with added, modified, deleted, and renamed counts
- Line additions and deletions
- Rename and copy detection
- Binary-file change indication
- Whitespace-change toggle
- Ignore generated files or selected paths
- Search within changed lines
- Expand or collapse unchanged context

#### Diff actions

- Open the file at the selected revision.
- Open the related commit or pull request.
- Copy a permalink to a file and line range.
- Mark a file as reviewed.
- Add a note to a file or line range.
- Export a change summary.
- Compare another revision without losing the current selection.

### D. Change intelligence

This is where the application can go beyond GitLens.

- Group changes by feature, task, pull request, release, or date.
- Build a change timeline for a file, folder, service, or project area.
- Identify files frequently changed together.
- Show change hotspots by file or folder.
- Show code ownership and frequent contributors.
- Show files changed repeatedly after a feature update.
- Show commits that have not reached a release branch.
- Show a possible impact area based on changed folders and file relationships.
- Detect a change that exists in one branch but not another.
- Compare the same feature across branches.
- Generate a human-readable update summary from commit and pull request metadata.

The application should present these as derived insights. They must not be treated as a replacement for the actual Git history.

### E. Task, issue, and release connection

- Link commits to GitHub issues and pull requests.
- Link pull requests to releases.
- Allow optional project task IDs in commit messages or branch names.
- Show task status alongside code status.
- Show which tasks are implemented but not released.
- Show which release contains a particular change.
- Create a release change summary.
- Track a change from task to branch, commit, pull request, merge, and release.

### F. Collaboration and review

- Shared repository dashboard.
- Review status for changed files.
- Personal notes and team-visible notes.
- Comments attached to a commit, file, or diff line.
- Saved comparison views.
- Shareable URLs for a specific tree, commit, or diff.
- Activity feed filtered by repository or team member.
- Optional notifications for synchronization failures or important branch changes.

### G. Search and reporting

- Search commits, files, folders, authors, branches, tags, issues, and pull requests.
- Search by changed code text.
- Search only additions or only deletions.
- Filter by date range.
- Filter by repository, branch, contributor, extension, or task.
- Export CSV or Markdown summaries.
- Generate weekly or release-based update reports.
- Provide an API for external reporting tools later.

## 3. Recommended user workflows

### Workflow 1: Inspect the current project tree

1. User selects a repository.
2. Application displays the branch and remote synchronization state.
3. User selects a branch, tag, or commit.
4. Application loads the file tree at that revision.
5. Changed files show status badges and change counts.
6. User opens a file to view its history or a diff.

### Workflow 2: Understand a recent update

1. Application receives a push or pull request event, or the user starts manual sync.
2. Server imports the new GitHub metadata.
3. The update appears in the repository timeline.
4. User selects the update.
5. Application shows the commit, pull request, changed-file tree, and summary.
6. User opens individual diffs and follows links to the related task or release.

### Workflow 3: Compare two branches

1. User selects a base branch and a comparison branch.
2. Application identifies the merge base.
3. Application calculates the changed commits and files.
4. The user sees a folder summary and commit graph range.
5. The user opens a file-level or line-level diff.
6. The user saves or shares the comparison.

### Workflow 4: Check whether a local update is synchronized

1. Local application reads the repository status.
2. It shows uncommitted and staged changes separately.
3. It identifies local commits not present on the remote branch.
4. It shows whether the latest remote commit has reached the tracking server.
5. The user can push through their normal Git workflow and then trigger sync.
6. The server records the final synchronized state.

### Workflow 5: Prepare a release update report

1. User selects two release tags or a tag and a branch.
2. Application calculates the commit and file differences.
3. It groups changes by pull request, issue, task, author, and folder.
4. User reviews the generated summary.
5. User exports Markdown or CSV.
6. The report includes source links back to GitHub.

## 4. Functional specification

### 4.1 Repository model

The application should represent at least:

- Repository
- Remote
- Branch
- Tag
- Commit
- Parent commit
- File path
- Folder path
- Pull request
- Issue or task reference
- Release
- Synchronization job
- Diff comparison
- Review marker or note

### 4.2 Synchronization behavior

The server must:

1. Identify the repository and source event.
2. Authenticate with GitHub.
3. Import only missing or changed data where possible.
4. Store the source commit SHA and event ID.
5. Avoid duplicate records when an event is delivered more than once.
6. Record success, failure, retry count, and timestamp.
7. Preserve the last known good synchronized state.
8. Make failed synchronization visible to the user.

### 4.3 Tree behavior

The tree must:

- Represent a selected revision accurately.
- Keep file paths stable when possible.
- Display rename and deletion information.
- Load large trees incrementally instead of requiring everything at once.
- Provide a clear relationship between tree nodes and commits.
- Allow navigation from a tree node to its history and diffs.

### 4.4 Diff behavior

The diff engine must:

- Accept two valid revisions or working-tree states.
- Return changed files and change types.
- Preserve file paths for renamed files when detected.
- Support added, deleted, modified, renamed, copied, and binary files.
- Return line-level changes when text content is available.
- Handle empty files and very large files safely.
- Provide stable links to the source revision.

### 4.5 Permissions and privacy

- Users can access only repositories permitted by GitHub and the application.
- Private repository content must not be exposed to unauthorized users.
- Tokens and webhook secrets must never be stored in plain text in logs.
- Team permissions should be separate from Git commit authorship.
- Audit important actions such as repository connection and permission changes.

## 5. Non-functional requirements

### Performance

- The repository dashboard should load a useful summary quickly.
- Large commit histories should be paginated or virtualized.
- Large file trees should load folders on demand.
- Large diffs should have size limits and a clear fallback message.

### Reliability

- Synchronization jobs must be retryable.
- Duplicate webhook events must be safe.
- A temporary GitHub outage must not destroy existing data.
- The application must show stale-data timestamps clearly.

### Security

- Use least-privilege GitHub permissions.
- Encrypt credentials at rest.
- Verify webhook signatures.
- Use HTTPS for server communication.
- Apply repository-level authorization to every data request.
- Avoid logging source code, tokens, or private diff content unnecessarily.

### Portability

- Support self-hosted deployment.
- Keep the core data model independent from a specific hosting provider.
- Support local repositories where practical.
- Keep GitHub-specific integration behind an integration boundary so other Git hosts can be added later.

## 6. Scope roadmap

### MVP

- Connect one GitHub repository.
- Import commits, branches, tags, and pull requests.
- Display a commit graph.
- Display a revision-specific file tree.
- Compare two commits or branches.
- Display unified and split diffs.
- Support manual sync and scheduled polling.
- Show synchronization status and errors.
- Link records back to GitHub.

### Version 1

- GitHub webhooks.
- Multiple repositories.
- File and folder history.
- Saved comparisons.
- Review markers and notes.
- Issue, task, and release grouping.
- Markdown and CSV reports.
- Search and filters.

### Later or advanced features

- Local desktop companion.
- IDE extension.
- Change hotspots and co-change analysis.
- Impact analysis.
- Automated summaries.
- Notifications and scheduled reports.
- Team roles and audit history.
- Support for GitLab, Bitbucket, or self-hosted Git servers.
- Offline cache and conflict-aware synchronization.

## 7. Product boundaries

The first release should not attempt to:

- Replace Git commands.
- Replace GitHub pull request review entirely.
- Reproduce every GitLens feature.
- Automatically modify source code without explicit user action.
- Treat generated insights as guaranteed truth.
- Store every full repository version on the server without storage limits.

The application should explain the source and revision behind every displayed fact. A user should always be able to navigate from a dashboard result to the corresponding Git commit, GitHub event, file, or diff.

## 8. Success criteria

The first useful release succeeds when a user can:

1. Connect a repository.
2. See its branches and commit tree.
3. Browse the project files at a selected revision.
4. Understand what changed between two revisions.
5. Confirm whether the latest update reached the server.
6. Follow a change back to GitHub.
7. Export or share a useful update summary.

## 9. Recommended product name/category

The product should be positioned as one of these rather than as a GitLens clone:

- Git change tracking dashboard
- Repository update intelligence
- Git tree and diff explorer
- Git project history workspace
- Engineering change timeline

The strongest initial identity is **a Git tree and change-diff workspace with automatic GitHub synchronization**.
