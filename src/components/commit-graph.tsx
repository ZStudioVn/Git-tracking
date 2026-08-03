'use client';

/**
 * CommitGraph — visx-based visual commit graph. (2C-03)
 * Uses an external library for lane layout (D-06).
 * TODO Phase 2: integrate gitgraph-js or equivalent lane layout library.
 */

interface Commit {
  sha: string;
  message: string;
  authorName: string;
  authoredAt: string;
  parents: string[];
}

interface Props {
  commits: Commit[];
  selectedSha?: string;
  onSelectCommit?: (sha: string) => void;
}

export function CommitGraph({ commits, selectedSha, onSelectCommit }: Props) {
  if (commits.length === 0) {
    return <p className="text-muted-foreground text-sm">No commits to display.</p>;
  }

  return (
    <div className="font-mono text-xs space-y-1">
      {commits.map((commit) => (
        <button
          key={commit.sha}
          onClick={() => onSelectCommit?.(commit.sha)}
          className={`w-full text-left px-2 py-1 rounded hover:bg-accent ${
            selectedSha === commit.sha ? 'bg-accent font-bold' : ''
          }`}
        >
          <span className="text-muted-foreground mr-2">{commit.sha.slice(0, 7)}</span>
          <span>{commit.message.split('\n')[0]}</span>
          <span className="ml-2 text-muted-foreground">— {commit.authorName}</span>
        </button>
      ))}
    </div>
  );
}
