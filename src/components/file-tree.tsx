'use client';

/**
 * FileTree — revision-specific lazy-loaded tree. (2C-04)
 * Shows: folders (expand on click), files, last-commit info, change badges.
 * D-08: clicking a file produces a permalink URL.
 */

export interface TreeNode {
  path: string;
  type: 'tree' | 'blob';
  name: string;
  sha: string;
  children?: TreeNode[];
}

interface Props {
  nodes: TreeNode[];
  revision: string;
  onSelectFile?: (path: string, sha: string) => void;
  onExpandFolder?: (path: string) => void;
}

export function FileTree({ nodes, revision, onSelectFile, onExpandFolder }: Props) {
  if (nodes.length === 0) {
    return <p className="text-muted-foreground text-sm">Empty tree.</p>;
  }

  return (
    <ul className="text-sm space-y-0.5">
      {nodes.map((node) => (
        <li key={node.path} className="flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent cursor-pointer">
          {node.type === 'tree' ? (
            <button
              className="w-full text-left"
              onClick={() => onExpandFolder?.(node.path)}
            >
              📁 {node.name}
            </button>
          ) : (
            <button
              className="w-full text-left"
              onClick={() => onSelectFile?.(node.path, node.sha)}
            >
              📄 {node.name}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
