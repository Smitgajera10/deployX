'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchJob, retryJob, type Job } from '@/lib/api';
import { formatDate, formatDuration, getStatusColor, getStatusIcon } from '@/lib/utils';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const jobId = Number(params.id);

  useEffect(() => {
    async function loadJob() {
      try {
        const data = await fetchJob(jobId);
        setJob(data);
        if (data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error('Failed to load job:', error);
      } finally {
        setLoading(false);
      }
    }

    loadJob();

    // If job is running, set up SSE for real-time logs
    const eventSource = new EventSource(`/api/jobs/${jobId}/logs`);
    
    eventSource.onmessage = (event) => {
      setLogs((prev) => prev + event.data.replace(/\\n/g, '\n'));
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    eventSource.addEventListener('end', (event: MessageEvent) => {
      const status = event.data;
      setJob((prev) => prev ? { ...prev, status } : null);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [jobId]);

  const handleRetry = async () => {
    if (confirm('Are you sure you want to retry this job?')) {
      try {
        await retryJob(jobId);
        router.push(`/pipelines/${job?.pipeline_id}`);
      } catch (error) {
        console.error('Failed to retry job:', error);
        alert('Failed to retry job');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/pipelines/${job.pipeline_id}`}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Pipeline
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
            <p className="text-gray-600">Job #{job.id}</p>
          </div>
        </div>
        {job.status === 'FAILED' && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry Job
          </button>
        )}
      </div>

      {/* Job Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
              <span>{getStatusIcon(job.status)}</span>
              {job.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Command</p>
            <p className="text-sm font-mono text-gray-900">{job.command}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Duration</p>
            <p className="text-sm font-medium text-gray-900">
              {job.started_at ? formatDuration(job.started_at, job.completed_at) : 'Not started'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Created</p>
            <p className="text-sm font-medium text-gray-900">{formatDate(job.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Build Logs</h2>
          {job.status === 'RUNNING' && (
            <span className="flex items-center gap-2 text-sm text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        <div className="p-6 font-mono text-sm text-gray-300 max-h-[600px] overflow-y-auto">
          {logs ? (
            <pre className="whitespace-pre-wrap">{logs}</pre>
          ) : (
            <p className="text-gray-500">No logs available yet...</p>
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}
