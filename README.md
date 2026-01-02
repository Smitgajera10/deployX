# DeployX - Self-Hosted CI/CD Platform 🚀

DeployX is a lightweight, self-hosted CI/CD platform designed for startups and small teams. Build, test, and deploy your applications with ease.

## ✨ Features

- 🔄 **Automated CI/CD Pipelines** - Define workflows with simple YAML configuration
- 📊 **Real-time Build Logs** - Stream logs in real-time with Server-Sent Events
- 🔗 **GitHub/GitLab Webhooks** - Auto-trigger pipelines on code push
- 🐳 **Docker Support** - Containerized microservices architecture
- 🔐 **Secrets Management** - Secure storage for API keys and credentials
- 📈 **Pipeline Analytics** - Track success rates and build statistics
- 🌐 **REST API** - Complete API for integrations
- 💾 **PostgreSQL Storage** - Reliable data persistence

## 🏗️ Architecture

DeployX uses a microservices architecture:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   API       │────▶│   BullMQ    │────▶│   Runner    │
│  (Fastify)  │     │   (Redis)   │     │  (Worker)   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                                        │
       ▼                                        ▼
┌─────────────┐                         ┌─────────────┐
│ PostgreSQL  │                         │ Git Repos   │
│  Database   │                         │  Workspace  │
└─────────────┘                         └─────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/DeployX.git
cd DeployX
```

2. **Start the services**

```bash
docker-compose up -d
```

This will start:
- API Server (port 3000)
- PostgreSQL (port 5433)
- Redis (port 6379)
- Runner Worker

3. **Verify the installation**

```bash
curl http://localhost:3000/health
```

You should see:
```json
{
  "status": "ok",
  "service": "deployx-api",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 📝 Usage

### 1. Register a Repository

```bash
curl -X POST http://localhost:3000/repos \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app",
    "gitUrl": "https://github.com/yourusername/my-app.git",
    "description": "My awesome application"
  }'
```

### 2. Create `.deployx.yml` in Your Repository

```yaml
pipeline:
  steps:
    - name: Install Dependencies
      run: npm install
      
    - name: Run Tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Deploy
      run: npm run deploy
```

### 3. Trigger a Pipeline

```bash
curl -X POST http://localhost:3000/repos/1/pipelines \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "main",
    "commitSha": "abc123",
    "triggeredBy": "manual"
  }'
```

### 4. View Pipeline Status

```bash
curl http://localhost:3000/pipelines/1
```

### 5. Stream Build Logs

```bash
curl -N http://localhost:3000/jobs/1/logs
```

## 🔗 GitHub Webhook Integration

1. **Enable webhook for your repository**

```bash
curl -X POST http://localhost:3000/repos/1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "github",
    "secret": "your-webhook-secret"
  }'
```

2. **Configure GitHub Webhook**

- Go to your GitHub repository → Settings → Webhooks
- Add webhook:
  - **Payload URL**: `http://your-server.com:3000/webhooks/github`
  - **Content type**: `application/json`
  - **Secret**: `your-webhook-secret`
  - **Events**: Select "Just the push event"

3. **Push code to trigger automatic builds**

```bash
git push origin main
# DeployX will automatically start a new pipeline!
```

## 🔧 API Endpoints

### Repositories

- `POST /repos` - Create repository
- `GET /repos` - List all repositories
- `GET /repos/:id` - Get repository details
- `DELETE /repos/:id` - Delete repository

### Pipelines

- `POST /repos/:repoId/pipelines` - Trigger pipeline
- `GET /pipelines` - List pipelines (filter by repo, status)
- `GET /pipelines/:id` - Get pipeline details
- `POST /pipelines/:id/cancel` - Cancel pipeline

### Jobs

- `GET /jobs/:id` - Get job details
- `GET /jobs/:id/logs` - Stream job logs (SSE)
- `POST /jobs/:id/retry` - Retry failed job

### Webhooks

- `POST /webhooks/github` - GitHub webhook receiver
- `POST /webhooks/gitlab` - GitLab webhook receiver
- `POST /repos/:repoId/webhooks` - Register webhook
- `GET /repos/:repoId/webhooks` - List webhooks
- `PATCH /webhooks/:id` - Toggle webhook

### Health

- `GET /health` - Health check

## ⚙️ Configuration

### Environment Variables

Create `.env` file in the `services/api` directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=deployx
DB_PASSWORD=deployx
DB_NAME=deployx

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# API
PORT=3000

# Webhooks
GITHUB_WEBHOOK_SECRET=your-secret-here
```

### Database Configuration

The database schema is automatically initialized when you start the PostgreSQL container. The schema includes:

- `repositories` - Git repositories
- `pipelines` - CI/CD pipeline runs
- `jobs` - Individual job executions
- `secrets` - Environment variables and secrets
- `webhooks` - Webhook configurations
- `artifacts` - Build artifacts

## 📊 Pipeline YAML Configuration

### Basic Example

```yaml
pipeline:
  steps:
    - name: Build
      run: npm run build
    - name: Test
      run: npm test
```

### Advanced Example (Coming Soon)

```yaml
pipeline:
  env:
    NODE_ENV: production
    
  stages:
    - name: Build
      jobs:
        - name: Install
          run: npm ci
          cache:
            - node_modules
            
    - name: Test
      parallel: true
      jobs:
        - name: Unit Tests
          run: npm run test:unit
        - name: Lint
          run: npm run lint
          
    - name: Deploy
      if: branch == 'main'
      jobs:
        - name: Deploy Production
          run: ./deploy.sh
          secrets:
            - DEPLOY_KEY
```

## 🛠️ Development

### Project Structure

```
DeployX/
├── services/
│   ├── api/              # REST API service
│   │   ├── src/
│   │   │   ├── routes/   # API routes
│   │   │   ├── plugins/  # Fastify plugins
│   │   │   ├── queue/    # BullMQ setup
│   │   │   └── utils/    # Utilities
│   │   └── package.json
│   │
│   └── runner/           # Job runner service
│       ├── src/
│       │   ├── worker.ts # BullMQ worker
│       │   └── utils/    # Git, exec utilities
│       └── package.json
│
├── infra/
│   ├── schema.sql        # Database schema
│   └── init.sh           # DB initialization
│
├── docs/                 # Documentation
├── shared/               # Shared code (future)
└── docker-compose.yml    # Docker setup
```

### Running Locally (Development)

1. **Start infrastructure**

```bash
docker-compose up -d postgres redis
```

2. **Run API service**

```bash
cd services/api
npm install
npm run dev
```

3. **Run Runner service** (in another terminal)

```bash
cd services/runner
npm install
npm run dev
```

## 🧪 Testing

```bash
# Run tests (coming soon)
npm test

# Run with coverage
npm run test:coverage
```

## 📈 Monitoring

View job queue status:

```bash
# Install Bull Board (optional)
npm install -g bull-board

# Access dashboard at http://localhost:3000/admin/queues
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Fastify](https://www.fastify.io/)
- Job queue powered by [BullMQ](https://docs.bullmq.io/)
- Database: [PostgreSQL](https://www.postgresql.org/)

## 📞 Support

- 📧 Email: support@deployx.dev
- 💬 Discord: [Join our community](https://discord.gg/deployx)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/DeployX/issues)

---

Made with ❤️ by the DeployX Team
