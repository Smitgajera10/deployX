-- DeployX Database Schema
-- PostgreSQL 15+

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    git_url TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id SERIAL PRIMARY KEY,
    repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    branch VARCHAR(255) DEFAULT 'main',
    commit_sha VARCHAR(40),
    triggered_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    CONSTRAINT valid_pipeline_status CHECK (status IN ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'))
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    pipeline_id INTEGER NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    logs TEXT,
    command TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    CONSTRAINT valid_job_status CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'))
);

-- Secrets table (for environment variables and secrets)
CREATE TABLE IF NOT EXISTS secrets (
    id SERIAL PRIMARY KEY,
    repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL, -- Should be encrypted in production
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(repo_id, key)
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    repo_id INTEGER NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'github',
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_provider CHECK (provider IN ('github', 'gitlab', 'bitbucket', 'gitea'))
);

-- Artifacts table (for build outputs)
CREATE TABLE IF NOT EXISTS artifacts (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path TEXT NOT NULL,
    size_bytes BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pipelines_repo_id ON pipelines(repo_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
CREATE INDEX IF NOT EXISTS idx_pipelines_created_at ON pipelines(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_pipeline_id ON jobs(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

CREATE INDEX IF NOT EXISTS idx_secrets_repo_id ON secrets(repo_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_repo_id ON webhooks(repo_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_job_id ON artifacts(job_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development (optional)
-- Uncomment to add sample repository
-- INSERT INTO repositories (name, git_url, description) 
-- VALUES ('sample-app', 'https://github.com/yourusername/sample-app.git', 'Sample application for testing')
-- ON CONFLICT (git_url) DO NOTHING;
