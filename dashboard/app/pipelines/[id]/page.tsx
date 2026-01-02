'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchPipeline, cancelPipeline, type Pipeline, type Job } from '@/lib/api';
import { formatDate, formatDuration, getStatusColor, getStatusIcon } from '@/lib/utils';

export default function PipelineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const pipelineId = Number(params.id);

  useEffect(() => {
    async function loadPipeline() {
      try {
        const data = await fetchPipeline(pipelineId);
        setPipeline(data.pipeline);
        setJobs(data.jobs);
      } catch (error) {
        console.error('Failed to load pipeline:', error);
      } finally {
        setLoading(false);
      }
    }

    loadPipeline();
    const interval = setInterval(loadPipeline, 3000); // Refresh every 3s
    return () => clearInterval(interval);
  }, [pipelineId]);

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this pipeline?')) {
      try {
        await cancelPipeline(pipelineId);
        router.push('/pipelines');
      } catch (error) {
        console.error('Failed to cancel pipeline:', error);
        alert('Failed to cancel pipeline');
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

  if (!pipeline) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Pipeline not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/pipelines"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline #{pipeline.id}</h1>
            <p className="text-gray-600">{pipeline.repo_name || `Repo ${pipeline.repo_id}`}</p>
          </div>
        </div>
        {pipeline.status === 'RUNNING' && (
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Cancel Pipeline
          </button>
        )}
      </div>

      {/* Pipeline Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pipeline.status)}`}>
              <span>{getStatusIcon(pipeline.status)}</span>
              {pipeline.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Branch</p>
            <p className="text-sm font-medium text-gray-900">{pipeline.branch || 'main'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Triggered By</p>
            <p className="text-sm font-medium text-gray-900">{pipeline.triggered_by || 'manual'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Duration</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDuration(pipeline.created_at, pipeline.completed_at)}
            </p>
          </div>
          {pipeline.commit_sha && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600 mb-1">Commit</p>
              <p className="text-sm font-mono text-gray-900">{pipeline.commit_sha.substring(0, 8)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Jobs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-semibold ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{job.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{job.command}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {job.started_at ? formatDuration(job.started_at, job.completed_at) : 'Not started'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
