import type { Octokit } from '@octokit/rest';

export interface CommitFileInput {
  path: string;
  content: string;
  mode?: '100644' | '100755';
}

const MAX_FILES = 50;
const MAX_CONTENT_BYTES = 512 * 1024;

function validateFiles(files: CommitFileInput[]): void {
  if (files.length === 0 || files.length > MAX_FILES) {
    throw new Error(`A commit must contain between 1 and ${MAX_FILES} files`);
  }
  for (const file of files) {
    if (!file.path || file.path.startsWith('/') || file.path.includes('..')) {
      throw new Error(`Invalid repository path: ${file.path}`);
    }
    if (Buffer.byteLength(file.content, 'utf8') > MAX_CONTENT_BYTES) {
      throw new Error(`File is larger than ${MAX_CONTENT_BYTES} bytes: ${file.path}`);
    }
  }
}

export async function commitFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  message: string,
  files: CommitFileInput[],
  expectedHead?: string,
  author?: { name: string; email: string },
): Promise<{ sha: string; url: string }> {
  if (!message.trim() || message.length > 200) throw new Error('Commit message must be 1-200 characters');
  validateFiles(files);

  const ref = await octokit.git.getRef({ owner, repo, ref: `heads/${branch}` });
  const currentHead = ref.data.object.sha;
  if (expectedHead && currentHead !== expectedHead) {
    throw new Error('Branch changed since preview; refresh before committing');
  }

  const baseCommit = await octokit.git.getCommit({ owner, repo, commit_sha: currentHead });
  const tree = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseCommit.data.tree.sha,
    tree: files.map((file) => ({
      path: file.path,
      mode: file.mode ?? '100644',
      type: 'blob' as const,
      content: file.content,
    })),
  });
  const commit = await octokit.git.createCommit({
    owner,
    repo,
    message: message.trim(),
    tree: tree.data.sha,
    parents: [currentHead],
    ...(author ? { author, committer: author } : {}),
  });
  await octokit.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha, force: false });
  return { sha: commit.data.sha, url: commit.data.html_url };
}
