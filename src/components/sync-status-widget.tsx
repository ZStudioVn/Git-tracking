'use client';

/**
 * SyncStatus — displays sync job status and allows manual sync trigger.
 */

import { useEffect, useState } from 'react';
import { useToast } from '@/components/toast';

interface SyncJob {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STALE';
  type: 'FULL' | 'INCREMENTAL';
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  availableAt: string;
}

export function SyncStatus() {
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    void fetchJobs(controller.signal);
    // Poll every 10 seconds
    const interval = setInterval(() => void fetchJobs(controller.signal), 10000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  const fetchJobs = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/sync', { signal });
      if (!res.ok) throw new Error('Failed to fetch sync jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch sync jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      
      if (res.ok) {
        // Refresh jobs list
        await fetchJobs();
        toast.success('Sync started');
      } else {
        toast.error(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Failed to trigger sync:', err);
      toast.error('Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  const latestJob = jobs[0];
  const isInProgress = latestJob?.status === 'RUNNING' || latestJob?.status === 'PENDING';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      case 'RUNNING':
        return 'text-blue-600 bg-blue-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'STALE':
        return 'text-orange-600 bg-orange-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Sync Status</h2>

      <button
        onClick={handleManualSync}
        disabled={syncing || isInProgress}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium mb-4"
      >
        {syncing || isInProgress ? 'Syncing...' : 'Sync Now'}
      </button>

      {latestJob && (
        <div className="mb-4 p-3 rounded-lg border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Latest Sync</span>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(latestJob.status)}`}>
              {latestJob.status}
            </span>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Type: {latestJob.type}</div>
            <div>Started: {formatDate(latestJob.startedAt)}</div>
            {latestJob.completedAt && <div>Completed: {formatDate(latestJob.completedAt)}</div>}
            {latestJob.errorMessage && (
              <div className="text-red-600 mt-2">Error: {latestJob.errorMessage}</div>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2">Recent Jobs</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {jobs.length === 0 ? (
            <p className="text-sm text-gray-500">No sync jobs yet</p>
          ) : (
            jobs.slice(0, 10).map((job) => (
              <div key={job.id} className="p-2 bg-gray-50 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-gray-500">{job.id.slice(0, 8)}</span>
                  <span className={`px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
                <div className="text-gray-600 mt-1">{formatDate(job.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
