'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FileTree, type TreeNode } from '@/components/file-tree';

export default function TreePage() {
  const params = useSearchParams();
  const router = useRouter();
  const revision = params.get('revision') ?? 'HEAD';
  const path = params.get('path') ?? '';
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [treeSha, setTreeSha] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/tree?revision=${encodeURIComponent(revision)}&path=${encodeURIComponent(path)}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setNodes(data.nodes ?? []); setTreeSha(data.treeSha ?? ''); })
      .catch((reason: Error) => setError(reason.message));
  }, [revision, path]);

  return <main className="p-6 max-w-4xl mx-auto"><button className="underline text-sm mb-4" onClick={() => router.push('/dashboard')}>← Dashboard</button><section className="bg-white rounded-lg shadow p-6"><div className="flex justify-between mb-4"><h1 className="text-xl font-semibold">{revision} / {path || 'root'}</h1><code className="text-xs text-gray-500">{treeSha.slice(0, 8)}</code></div>{error ? <p className="text-red-600">{error}</p> : <FileTree nodes={nodes} onExpandFolder={(folder) => router.push(`/dashboard/tree?revision=${encodeURIComponent(revision)}&path=${encodeURIComponent(folder)}`)} onSelectFile={(file) => router.push(`/dashboard/file?revision=${encodeURIComponent(revision)}&path=${encodeURIComponent(file)}`)} />}</section></main>;
}