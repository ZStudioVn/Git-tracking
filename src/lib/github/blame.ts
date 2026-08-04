import { db } from '@/lib/db';
import { decryptToken } from '@/lib/utils/crypto';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';
const MAX_FILE_BYTES = 1_000_000;
const MAX_LINES = 5_000;

export interface BlameAnnotation {
  startingLine: number;
  endingLine: number;
  sha: string;
  message: string;
  authorName: string;
  authorLogin: string | null;
  committedAt: string;
  url: string;
}

export interface BlameLine {
  lineNumber: number;
  content: string;
  blame: BlameAnnotation | null;
}

export function mapBlameLines(text: string, ranges: GraphqlResponse['data'] extends infer _T ? Array<{
  startingLine: number;
  endingLine: number;
  commit: { oid: string; messageHeadline: string; committedDate: string; url: string; author?: { name?: string | null; user?: { login?: string | null } | null } | null };
}> : never): BlameLine[] {
  const contentLines = text.split('\n');
  return contentLines.map((content, index) => {
    const lineNumber = index + 1;
    const range = ranges.find((candidate) => lineNumber >= candidate.startingLine && lineNumber <= candidate.endingLine);
    if (!range) return { lineNumber, content, blame: null };
    const { commit } = range;
    return { lineNumber, content, blame: { startingLine: range.startingLine, endingLine: range.endingLine, sha: commit.oid, message: commit.messageHeadline, authorName: commit.author?.name ?? commit.author?.user?.login ?? 'Unknown', authorLogin: commit.author?.user?.login ?? null, committedAt: commit.committedDate, url: commit.url } };
  });
}

interface GraphqlResponse {
  data?: {
    repository?: {
      commit?: {
        blame?: {
          ranges: Array<{
            startingLine: number;
            endingLine: number;
            commit: {
              oid: string;
              messageHeadline: string;
              committedDate: string;
              url: string;
              author?: { name?: string | null; user?: { login?: string | null } | null } | null;
            };
          }>;
        };
      } | null;
      file?: { text?: string | null } | null;
    };
  };
  errors?: Array<{ message: string }>;
}

export async function fetchFileBlame(
  userId: string,
  owner: string,
  repo: string,
  path: string,
  revision: string,
): Promise<BlameLine[]> {
  const account = await db.account.findFirst({
    where: { userId, provider: 'github' },
    select: { access_token: true },
  });
  if (!account?.access_token) throw new Error('GitHub account is not connected');

  const query = `
    query FileBlame($owner: String!, $repo: String!, $revision: String!, $expression: String!, $path: String!) {
      repository(owner: $owner, name: $repo) {
        commit: object(expression: $revision) {
          ... on Commit {
            blame(path: $path) {
              ranges {
                startingLine
                endingLine
                commit {
                  oid
                  messageHeadline
                  committedDate
                  url
                  author { name user { login } }
                }
              }
            }
          }
        }
        file: object(expression: $expression) {
          ... on Blob { text }
        }
      }
    }
  `;

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `bearer ${decryptToken(account.access_token)}`,
      'content-type': 'application/json',
      'user-agent': 'git-tracking',
    },
    body: JSON.stringify({ query, variables: { owner, repo, revision, expression: `${revision}:${path}`, path } }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`GitHub GraphQL request failed: ${response.status}`);

  const payload = (await response.json()) as GraphqlResponse;
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  const repository = payload.data?.repository;
  const text = repository?.file?.text;
  if (text == null) return [];
  if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) throw new Error('File is too large for blame view');

  const contentLines = text.split('\n');
  if (contentLines.length > MAX_LINES) throw new Error('File has too many lines for blame view');

  return mapBlameLines(text, repository?.commit?.blame?.ranges ?? []);
}
