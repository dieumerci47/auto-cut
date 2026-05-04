import { useState, useEffect, useCallback, useRef } from 'react';
import { getJobStatus, type ProcessingJob } from '@/services/api';

export function useJobPolling(jobId: string | null, intervalMs = 2000) {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        setJob(status);

        if (status.status === 'done' || status.status === 'error') {
          stopPolling();
          if (status.status === 'error') {
            setError(status.error || 'An error occurred');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch job status');
        stopPolling();
      }
    };

    poll(); // initial fetch
    intervalRef.current = setInterval(poll, intervalMs);

    return stopPolling;
  }, [jobId, intervalMs, stopPolling]);

  return { job, error, stopPolling };
}

export function useFormatTime() {
  return useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);
}
