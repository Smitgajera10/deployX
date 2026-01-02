'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchRepository, fetchPipelines, triggerPipeline, type Repository, type Pipeline } from '@/lib/api';
import { formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [repo, setRepo] = useState<Repository | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTriggerForm, setShowTriggerForm] = useState(false);
  const [triggerData, setTriggerData] = useState({ branch: 'main', commitSha: '', triggeredBy: 'manual' });

  const repoId = Number(params.id);

  useEffect(() => {
    async function loadData() {
      try {
        const [repoData, pipelinesData] = await Promise.all([
          fetchRepository(repoId),
          fetchPipelines({ repoId }),
        ]);
        setRepo(repoData.repository);
        setStats(repoData.stats);
        setPipelines(pipelinesData.pipelines);
      } catch (error) {
        console.error('Failed to load repository:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [repoId]);

  async function handleTriggerPipeline(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await triggerPipeline(repoId, triggerData);
      setShowTriggerForm(false);
      router.push(`/pipelines/${result.pipelineId}`);
    } catch (error) {
      console.error('Failed to trigger pipeline:', error);
      alert('Failed to trigger pipeline');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Repository not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/repositories"
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{repo.name}</h1>
            <p className="text-gray-600">{repo.git_url}</p>
          </div>
        </div>
        <button
          onClick={() => setShowTriggerForm(!showTriggerForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {showTriggerForm ? 'Cancel' : '▶ Trigger Pipeline'}
        </button>
      </div>

      {/* Trigger Form */}
      {showTriggerForm && (
        <form onSubmit={handleTriggerPipeline} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
              <input
                type="text"
                value={triggerData.branch}
                onChange={(e) => setTriggerData({ ...triggerData, branch: e.target.value })}
                className="w-full px-4 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="main"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Commit SHA (Optional)</label>
              <input
                type="text"
                value={triggerData.commitSha}
                onChange={(e) => setTriggerData({ ...triggerData, commitSha: e.target.value })}
                className="w-full px-4 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="abc123..."
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Trigger Pipeline
          </button>
        </form>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Total Pipelines" value={stats.total_pipelines} color="blue" />
          <StatCard title="Successful" value={stats.successful} color="green" />
          <StatCard title="Failed" value={stats.failed} color="red" />
          <StatCard title="Running" value={stats.running} color="blue" />
        </div>
      )}

      {/* Pipelines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline History</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {pipelines.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg mb-2">No pipelines yet</p>
              <p className="text-sm">Trigger your first pipeline to get started!</p>
            </div>
          ) : (
            pipelines.map((pipeline) => (
              <Link
                key={pipeline.id}
                href={`/pipelines/${pipeline.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-semibold ${getStatusColor(pipeline.status)}`}>
                      {getStatusIcon(pipeline.status)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {pipeline.branch || 'main'} • {pipeline.triggered_by || 'manual'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(pipeline.created_at)}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pipeline.status)}`}>
                    {pipeline.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
