'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRepositories, fetchPipelines, type Repository, type Pipeline } from '@/lib/api';
import { formatDate, getStatusColor, getStatusIcon } from '@/lib/utils';

export default function DashboardPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [reposData, pipelinesData] = await Promise.all([
          fetchRepositories(),
          fetchPipelines({ limit: 10 }),
        ]);
        setRepos(reposData.repositories);
        setPipelines(pipelinesData.pipelines);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = {
    totalRepos: repos.length,
    totalPipelines: pipelines.length,
    running: pipelines.filter(p => p.status === 'RUNNING').length,
    success: pipelines.filter(p => p.status === 'SUCCESS').length,
    failed: pipelines.filter(p => p.status === 'FAILED').length,
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Welcome to DeployX</h1>
        <p className="text-blue-100">
          Your self-hosted CI/CD platform for building, testing, and deploying applications.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Repositories" value={stats.totalRepos} color="blue" icon="📦" />
        <StatCard title="Total Pipelines" value={stats.totalPipelines} color="indigo" icon="🔄" />
        <StatCard title="Running" value={stats.running} color="blue" icon="⟳" />
        <StatCard title="Successful" value={stats.success} color="green" icon="✓" />
        <StatCard title="Failed" value={stats.failed} color="red" icon="✗" />
      </div>

      {/* Recent Pipelines */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Pipelines</h2>
          <Link
            href="/pipelines"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {pipelines.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg mb-2">No pipelines yet</p>
              <p className="text-sm">Trigger a pipeline to get started!</p>
            </div>
          ) : (
            pipelines.slice(0, 5).map((pipeline) => (
              <Link
                key={pipeline.id}
                href={`/pipelines/${pipeline.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-semibold ${getStatusColor(pipeline.status)}`}>
                        {getStatusIcon(pipeline.status)}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {pipeline.repo_name || `Repo ${pipeline.repo_id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pipeline.branch && `${pipeline.branch} • `}
                          {formatDate(pipeline.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(pipeline.status)}`}>
                      {pipeline.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Repositories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Repositories</h2>
          <Link
            href="/repositories"
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + New Repository
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {repos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="text-lg mb-2">No repositories yet</p>
              <p className="text-sm">Add your first repository to begin!</p>
            </div>
          ) : (
            repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/repositories/${repo.id}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{repo.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{repo.git_url}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(repo.created_at)}</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
