'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchRepositories, createRepository, type Repository } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', gitUrl: '', description: '' });

  useEffect(() => {
    loadRepos();
  }, []);

  async function loadRepos() {
    try {
      const data = await fetchRepositories();
      setRepos(data.repositories);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createRepository(formData);
      setFormData({ name: '', gitUrl: '', description: '' });
      setShowForm(false);
      loadRepos();
    } catch (error) {
      console.error('Failed to create repository:', error);
      alert('Failed to create repository');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repositories</h1>
          <p className="text-gray-600 mt-1">Manage your Git repositories</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {showForm ? 'Cancel' : '+ New Repository'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Repository Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="my-awesome-app"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Git URL</label>
            <input
              type="url"
              value={formData.gitUrl}
              onChange={(e) => setFormData({ ...formData, gitUrl: e.target.value })}
              className="w-full px-4 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/username/repo.git"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 text-gray-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="A brief description of your repository"
              rows={3}
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Repository
          </button>
        </form>
      )}

      {/* Repositories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repos.map((repo) => (
          <Link
            key={repo.id}
            href={`/repositories/${repo.id}`}
            className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📦</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{repo.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">ID: {repo.id}</p>
                </div>
              </div>
            </div>
            {repo.description && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{repo.description}</p>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>🔗</span>
                <span className="truncate">{repo.git_url}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>📅</span>
                <span>{formatDate(repo.created_at)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {repos.length === 0 && !showForm && (
        <div className="text-center py-12  bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 text-lg mb-2">No repositories yet</p>
          <p className="text-gray-400 text-sm">Create your first repository to get started</p>
        </div>
      )}
    </div>
  );
}
