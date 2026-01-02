const API_BASE = '/api';

export interface Repository {
    id: number;
    name: string;
    git_url: string;
    description?: string;
    created_at: string;
}

export interface Pipeline {
    id: number;
    repo_id: number;
    status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    branch?: string;
    commit_sha?: string;
    triggered_by?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    repo_name?: string;
    git_url?: string;
}

export interface Job {
    id: number;
    pipeline_id: number;
    name: string;
    status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
    logs?: string;
    command?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
}

// API Functions
export async function fetchRepositories(): Promise<{ repositories: Repository[]; total: number }> {
    const res = await fetch(`${API_BASE}/repos`);
    if (!res.ok) throw new Error('Failed to fetch repositories');
    return res.json();
}

export async function fetchRepository(id: number) {
    const res = await fetch(`${API_BASE}/repos/${id}`);
    if (!res.ok) throw new Error('Failed to fetch repository');
    return res.json();
}

export async function createRepository(data: { name: string; gitUrl: string; description?: string }) {
    const res = await fetch(`${API_BASE}/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create repository');
    return res.json();
}

export async function fetchPipelines(params?: { repoId?: number; status?: string; limit?: number }): Promise<{ pipelines: Pipeline[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.repoId) query.append('repoId', params.repoId.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/pipelines?${query}`);
    if (!res.ok) throw new Error('Failed to fetch pipelines');
    return res.json();
}

export async function fetchPipeline(id: number): Promise<{ pipeline: Pipeline; jobs: Job[] }> {
    const res = await fetch(`${API_BASE}/pipelines/${id}`);
    if (!res.ok) throw new Error('Failed to fetch pipeline');
    return res.json();
}

export async function triggerPipeline(repoId: number, data?: { branch?: string; commitSha?: string; triggeredBy?: string }) {
    const res = await fetch(`${API_BASE}/repos/${repoId}/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data || {}),
    });
    if (!res.ok) throw new Error('Failed to trigger pipeline');
    return res.json();
}

export async function cancelPipeline(id: number) {
    const res = await fetch(`${API_BASE}/pipelines/${id}/cancel`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to cancel pipeline');
    return res.json();
}

export async function fetchJob(id: number): Promise<Job> {
    const res = await fetch(`${API_BASE}/jobs/${id}`);
    if (!res.ok) throw new Error('Failed to fetch job');
    return res.json();
}

export async function retryJob(id: number) {
    const res = await fetch(`${API_BASE}/jobs/${id}/retry`, {
        method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to retry job');
    return res.json();
}
