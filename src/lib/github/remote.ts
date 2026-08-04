export function githubFullNameFromRemote(remoteUrl: string | null): string | null {
  if (!remoteUrl) return null;
  const normalized = remoteUrl.trim().replace(/\.git$/, '').replace(/\/$/, '');
  const match = normalized.match(/github\.com[:/]([^/]+\/[^/]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}
