# Aurora Pipeline

A sophisticated AI-powered content generation system that orchestrates multiple ML engines (text, voice, video) with scheduling, distribution, and comprehensive monitoring capabilities.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Development](#development)
- [Docker Deployment](#docker-deployment)
- [Database](#database)
- [API Documentation](#api-documentation)
- [Pipeline Architecture](#pipeline-architecture)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Overview

Aurora Pipeline is a comprehensive content generation platform that automates the creation and distribution of multimedia content. It combines advanced AI models for text generation, voice synthesis, and video creation with a robust scheduling system and real-time monitoring capabilities.

### Key Components

- **Text Engine**: AI-powered text content generation
- **Voice Engine**: Voice synthesis and audio generation
- **Video Engine**: Video content creation
- **Topic Engine**: Intelligent topic/content discovery
- **Distribution System**: Multi-channel content distribution
- **Scheduler**: Cron-based pipeline execution
- **Storage**: PostgreSQL-backed persistent storage
- **Web Dashboard**: Real-time monitoring and management UI

## Features

✨ **Core Capabilities**
- 🤖 Multi-engine AI content generation (text, audio, video)
- ⏰ Flexible cron-based scheduling
- 📦 Asset management and storage
- 🌐 Multi-channel distribution support
- 💾 PostgreSQL database with migrations
- 🔐 Environment-based configuration
- 📊 Comprehensive logging and monitoring
- 🎨 Modern React-based dashboard
- 🔄 Retry queue system for failed operations
- ⚙️ Configurable limits and endpoints

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Aurora Pipeline System                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │          Scheduler (Cron-based)                  │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │          Pipeline Orchestrator                   │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                     │
│     ┌───────────────┼───────────────┐                   │
│     │               │               │                   │
│  ┌──▼──┐  ┌─────▼──────┐  ┌──────▼───┐  ┌──────────┐  │
│  │Topic│  │ Text Engine │  │Voice Eng │  │Video Eng │  │
│  │Engine│  │             │  │          │  │          │  │
│  └─────┘  └─────────────┘  └──────────┘  └──────────┘  │
│                     │                                     │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │       Distribution System                        │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │    Storage (Assets, Logs, Metadata)             │   │
│  └─────────────────────────────────────────────────┘   │
│                     │                                     │
│  ┌──────────────────▼──────────────────────────────┐   │
│  │   PostgreSQL Database with Drizzle ORM          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### System Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher (or yarn/pnpm)
- **PostgreSQL**: 13+ (for production)
- **Docker**: 20.10+ (optional, for containerized deployment)
- **Docker Compose**: 2.0+ (optional, for local development)

### Optional API Keys
- OpenAI API key (for text generation)
- ElevenLabs API key (for voice synthesis)
- RunwayML API key (for video generation)
- Distribution platform credentials (as needed)

## Quick Start

### Option 1: Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AURORA-PIPELINE
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   NODE_ENV=development
   DATABASE_URL=postgresql://user:password@localhost:5432/aurora_pipeline
   PIPELINE_ENABLED=true
   RUN_FREQUENCY="0 */12 * * *"
   OPENAI_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   RUNWAYML_API_KEY=your_key_here
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database first
   createdb aurora_pipeline
   
   # Run migrations
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3000/api

### Option 2: Docker Compose (Recommended for Local Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AURORA-PIPELINE
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env`:
   ```env
   NODE_ENV=development
   POSTGRES_USER=aurora
   POSTGRES_PASSWORD=secure_password_here
   POSTGRES_DB=aurora_pipeline
   PIPELINE_ENABLED=true
   RUN_FREQUENCY="0 */12 * * *"
   OPENAI_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   RUNWAYML_API_KEY=your_key_here
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   docker-compose exec app npm run db:push
   ```

5. **View logs**
   ```bash
   docker-compose logs -f app
   ```

6. **Access the application**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3000/api
   - PostgreSQL: localhost:5432

### Option 3: Production Docker Deployment

1. **Build the Docker image**
   ```bash
   docker build -t aurora-pipeline:latest .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     --name aurora-app \
     -e NODE_ENV=production \
     -e DATABASE_URL=postgresql://user:pass@postgres-host:5432/aurora_pipeline \
     -e PIPELINE_ENABLED=true \
     -e RUN_FREQUENCY="0 */12 * * *" \
     -e OPENAI_API_KEY=your_key \
     -p 3000:3000 \
     -v /path/to/runs:/app/runs \
     -v /path/to/logs:/app/logs \
     aurora-pipeline:latest
   ```

3. **Check health status**
   ```bash
   curl http://localhost:3000/health
   ```

## Configuration

### Environment Variables

```env
# Node Environment
NODE_ENV=production                    # development | production

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:5432/db

# Pipeline Settings
PIPELINE_ENABLED=true                  # Enable/disable pipeline execution
RUN_FREQUENCY="0 */12 * * *"          # Cron schedule for pipeline runs

# API Keys (Optional)
OPENAI_API_KEY=sk-...                 # OpenAI API key for text generation
ELEVENLABS_API_KEY=sk_...             # ElevenLabs key for voice synthesis
RUNWAYML_API_KEY=...                  # RunwayML key for video generation

# Server Configuration
PORT=3000                              # Express server port
HOST=0.0.0.0                          # Server host binding

# Database Connection Pool
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT=30000
```

### Configuration Files

- **`tsconfig.json`**: TypeScript configuration
- **`vite.config.ts`**: Frontend build configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration
- **`drizzle.config.ts`**: Database ORM configuration
- **`components.json`**: UI component settings

### Cron Schedule Format

The pipeline uses standard cron syntax:

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```

Common examples:
- `0 */12 * * *` - Every 12 hours
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly on Sunday
- `0 0 1 * *` - Monthly on the 1st
- `*/15 * * * *` - Every 15 minutes

## Development

### Project Structure

```
AURORA-PIPELINE/
├── client/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # React hooks
│   │   ├── lib/             # Utilities
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/                    # Backend (Express + Node.js)
│   ├── index.ts             # Express server entry
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database operations
│   ├── db.ts                # Database connection
│   ├── aurora/              # Pipeline logic
│   │   ├── pipeline.ts      # Main pipeline orchestrator
│   │   ├── scheduler/       # Cron scheduler
│   │   ├── text-engine/     # Text generation
│   │   ├── voice-engine/    # Voice synthesis
│   │   ├── video-engine/    # Video generation
│   │   ├── topic-engine/    # Topic discovery
│   │   ├── distribution/    # Content distribution
│   │   ├── retry-queue/     # Failed job retry mechanism
│   │   ├── guards/          # Validation guards
│   │   └── config/          # Engine configurations
│   └── static.ts            # Static file serving
├── shared/                    # Shared code
│   ├── schema.ts            # Database schemas (Drizzle ORM)
│   └── routes.ts            # API route definitions
├── script/                    # Build scripts
├── migrations/                # Database migrations
├── runs/                      # Generated content storage
├── package.json
├── Dockerfile                # Production Docker image
├── docker-compose.yml        # Local development setup
└── tsconfig.json
```

### Available Scripts

```bash
# Development
npm run dev                    # Start dev server with hot reload

# Building
npm run build                  # Build for production
npm run check                  # Type check with TypeScript

# Database
npm run db:push              # Push schema to database (create tables)

# Production
npm start                     # Start production server
```

### Development Server

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:3000
- Hot reload enabled for both client and server

### Type Checking

```bash
npm run check
```

Validates TypeScript types without emitting code.

## Docker Deployment

### Building the Image

```bash
docker build -t aurora-pipeline:latest .
docker build --build-arg NODE_ENV=production -t aurora-pipeline:1.0.0 .
```

### Docker Compose Quick Commands

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# Stop services
docker-compose down

# Remove volumes (including database)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Run a command in running container
docker-compose exec app npm run db:push
```

### Production Deployment Example

**Using Docker with external PostgreSQL:**

```bash
docker run -d \
  --name aurora-pipeline \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:password@postgres.example.com:5432/aurora \
  -e PIPELINE_ENABLED=true \
  -e RUN_FREQUENCY="0 */12 * * *" \
  -e OPENAI_API_KEY=sk-xxx \
  -v /var/aurora/runs:/app/runs \
  -v /var/aurora/logs:/app/logs \
  aurora-pipeline:latest
```

**Using Kubernetes:**

See `k8s/` directory for Kubernetes manifests (if available).

### Health Check

The application provides a health check endpoint:

```bash
curl -f http://localhost:3000/health || exit 1
```

The Docker container includes automatic health checks that will restart the container if unhealthy.

## Database

### Schema Overview

The application uses PostgreSQL with Drizzle ORM. The schema consists of three main tables:

#### `runs` Table
Tracks pipeline execution runs.

```sql
- id (UUID, Primary Key)
- status (text): 'pending' | 'running' | 'completed' | 'failed'
- startedAt (timestamp)
- completedAt (timestamp)
- error (text, nullable)
```

#### `pipeline_logs` Table
Stores logs from pipeline execution.

```sql
- id (serial, Primary Key)
- runId (UUID, Foreign Key → runs.id)
- level (text): 'info' | 'warn' | 'error'
- message (text)
- timestamp (timestamp)
- metadata (JSONB, nullable)
```

#### `assets` Table
Tracks generated content assets.

```sql
- id (serial, Primary Key)
- runId (UUID, Foreign Key → runs.id)
- type (text): 'text' | 'audio' | 'video'
- path (text, nullable)
- status (text): 'pending' | 'generated' | 'distributed' | 'failed'
- metadata (JSONB, nullable)
```

### Database Migrations

Migrations are automatically generated and can be found in the `migrations/` directory.

```bash
# Push schema changes to database
npm run db:push

# Generate migration file
drizzle-kit generate

# View migration status
drizzle-kit introspect
```

### Backup and Restore

**Backup PostgreSQL:**
```bash
docker-compose exec postgres pg_dump -U aurora aurora_pipeline > backup.sql
```

**Restore from backup:**
```bash
docker-compose exec -T postgres psql -U aurora aurora_pipeline < backup.sql
```

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Runs

**List all runs**
```
GET /api/runs
```

Response:
```json
[
  {
    "id": "370cf4b7-6692-4953-90c1-d18ca149c892",
    "status": "completed",
    "startedAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T11:45:00Z",
    "error": null
  }
]
```

**Get run details**
```
GET /api/runs/:id
```

**Trigger manual run**
```
POST /api/runs/trigger
```

#### Logs

**Get logs for a run**
```
GET /api/runs/:runId/logs
```

Response:
```json
[
  {
    "id": 1,
    "runId": "370cf4b7-6692-4953-90c1-d18ca149c892",
    "level": "info",
    "message": "Pipeline started",
    "timestamp": "2024-01-15T10:30:00Z",
    "metadata": {}
  }
]
```

#### Assets

**Get assets for a run**
```
GET /api/runs/:runId/assets
```

Response:
```json
[
  {
    "id": 1,
    "runId": "370cf4b7-6692-4953-90c1-d18ca149c892",
    "type": "text",
    "path": "/runs/370cf4b7.../text/content.md",
    "status": "generated",
    "metadata": {}
  }
]
```

**Download asset**
```
GET /api/assets/:assetId/download
```

#### System

**Health check**
```
GET /health
```

Response: `200 OK` when healthy

## Pipeline Architecture

### Execution Flow

1. **Scheduler** - Triggers on cron schedule or manual request
2. **Validation** - Checks environment and configuration
3. **Run Creation** - Creates run record in database
4. **Topic Generation** - Determines content topic/theme
5. **Text Generation** - Generates text content
6. **Audio Generation** - Creates voice synthesis
7. **Video Generation** - Produces video content
8. **Distribution** - Sends content to target channels
9. **Logging** - Records all operations and results
10. **Cleanup** - Archives assets and logs

### Run States

```
pending → running → completed
                 ↘ failed
```

### Error Handling

The system includes:
- **Retry Queue**: Automatic retry for transient failures
- **Error Logging**: Detailed error capture with context
- **Graceful Degradation**: Continues on non-critical failures
- **Run Status Tracking**: Maintains failure states for debugging

### Engine Configuration

Each engine has configurable parameters in `server/aurora/config/`:

- **`endpoints.json`**: API endpoints and services
- **`limits.json`**: Rate limits and timeouts
- **`runtime.json`**: Runtime behavior settings

## Monitoring & Logging

### Dashboard

The web dashboard provides real-time visibility:

- Run history and status
- Live execution logs
- Asset gallery
- Performance metrics
- Error tracking

Access at: http://localhost:3000

### Log Levels

- **INFO**: Normal operational information
- **WARN**: Warning conditions (non-critical issues)
- **ERROR**: Error conditions requiring attention

### Log Storage

Logs are stored in:
- **Database**: In `pipeline_logs` table (queryable)
- **Console**: Real-time output during execution
- **Files**: Optional file storage in `/logs` directory

### Monitoring Metrics

Track these key metrics:
- Pipeline execution time
- Success/failure rates
- Asset generation latency
- Distribution success rate
- Queue depth (retry queue)
- Database connection pool usage

## Troubleshooting

### Common Issues

#### 1. Database Connection Error

**Error**: `Error: ENOENT: no such file or directory`

**Solution**:
```bash
# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Check PostgreSQL is running
docker-compose exec postgres pg_isready

# Verify credentials in .env
```

#### 2. Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### 3. Out of Memory

**Error**: `JavaScript heap out of memory`

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Or in Docker
docker run -e NODE_OPTIONS="--max-old-space-size=4096" ...
```

#### 4. Migration Failed

**Error**: `Error: No schema file found`

**Solution**:
```bash
# Ensure schema.ts exists
ls -la shared/schema.ts

# Check database is running
docker-compose ps

# Re-run migrations
docker-compose exec app npm run db:push
```

#### 5. Assets Not Generating

**Symptoms**: Runs complete but no assets created

**Debug**:
```bash
# Check pipeline logs
curl http://localhost:3000/api/runs/{runId}/logs

# Verify API keys in .env
env | grep API_KEY

# Check pipeline is enabled
echo $PIPELINE_ENABLED
```

### Debug Mode

Enable verbose logging:

```bash
# Development
NODE_DEBUG=* npm run dev

# Docker Compose
DEBUG=* docker-compose up

# Docker
docker logs -f aurora-app
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database connectivity
docker-compose exec postgres pg_isready

# Check running processes
docker-compose ps

# Container logs
docker-compose logs app

# Resource usage
docker stats
```

## Performance Optimization

### Production Recommendations

1. **Database**
   - Enable connection pooling (PgBouncer)
   - Create indexes on frequently queried fields
   - Regular VACUUM and ANALYZE operations
   - Regular backups

2. **Application**
   - Use Node clustering for multi-core utilization
   - Implement caching layer (Redis)
   - Use CDN for static assets
   - Monitor memory usage and GC

3. **Infrastructure**
   - Use load balancer for horizontal scaling
   - Implement auto-scaling policies
   - Monitor CPU, memory, and disk usage
   - Set up alerting thresholds

4. **Pipeline**
   - Adjust `RUN_FREQUENCY` based on requirements
   - Batch process multiple assets
   - Implement parallel execution where possible
   - Monitor and optimize individual engines


### Code Standards

- TypeScript with strict mode
- Proper error handling
- Comprehensive logging
- Database transactions
- Unit tests (recommended)



---

### Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Docker Documentation](https://docs.docker.com/)
- [Vite Documentation](https://vitejs.dev/)
- [Node-cron Documentation](https://github.com/kelektiv/node-cron)

---

**Last Updated**: December 2025
**Version**: 1.0.0
