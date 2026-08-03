/**
 * Diff orchestration service. (3A-04)
 * Combines merge-base, file-changes, and line-diff into one comparison result.
 * Does NOT store full diffs — computes line diffs on demand and caches by SHA pair. (D-04)
 */
import type { Octokit } from '@octokit/rest';
import { getMergeBase } from './merge-base';
import { getFileChanges } from './file-changes';
import type { ComparisonResult } from '@/types/diff';

export async function compareRevisions(
  octokit: Octokit,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<ComparisonResult> {
  const mergeBase = await getMergeBase(octokit, owner, repo, base, head);
  const files = await getFileChanges(octokit, owner, repo, mergeBase ?? base, head);

  return {
    base,
    head,
    mergeBase: mergeBase ?? base,
    files,
  };
}
