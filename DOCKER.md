# Docker Deployment Guide

## Quick Start with Docker Compose

### 1. Basic Setup

```bash
# Clone repository
git clone <repository-url>
cd AURORA-PIPELINE

# Create environment file
cp .env.example .env

# Start services
docker-compose up -d
```

### 2. Initialize Database

```bash
# Run migrations
docker-compose exec app npm run db:push

# View logs
docker-compose logs -f
```

### 3. Access Application

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Database**: localhost:5432

## Docker Compose Services

### PostgreSQL (`postgres`)
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Username**: aurora (configurable via `POSTGRES_USER`)
- **Password**: aurora_password (configurable via `POSTGRES_PASSWORD`)
- **Database**: aurora_pipeline (configurable via `POSTGRES_DB`)
- **Volume**: `postgres_data` (persistent storage)

### Application (`app`)
- **Build**: Dockerfile (multi-stage build)
- **Port**: 3000
- **Dependencies**: postgres
- **Volumes**: 
  - `./runs` → `/app/runs` (generated content)
  - `./logs` → `/app/logs` (application logs)
- **Restart Policy**: unless-stopped
- **Health Check**: Every 30 seconds

## Common Docker Compose Commands

### Container Management

```bash
# Start services in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Stop services
docker-compose stop

# Start stopped services
docker-compose start

# Restart services
docker-compose restart

# Remove containers (keep volumes)
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove and rebuild
docker-compose down -v && docker-compose up -d --build
```

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# Follow all logs
docker-compose logs -f

# View app logs only
docker-compose logs -f app

# View postgres logs only
docker-compose logs -f postgres

# View last 50 lines
docker-compose logs --tail=50

# View logs from specific time
docker-compose logs --since 2024-01-15
```

### Container Interaction

```bash
# Execute command in running container
docker-compose exec app npm run db:push

# Interactive shell in container
docker-compose exec app /bin/sh

# Run one-off command
docker-compose run app npm run check

# View container details
docker-compose ps

# View resource usage
docker stats
```

### Database Management

```bash
# Backup database
docker-compose exec postgres pg_dump -U aurora aurora_pipeline > backup.sql

# Restore database
docker-compose exec -T postgres psql -U aurora aurora_pipeline < backup.sql

# Connect to database CLI
docker-compose exec postgres psql -U aurora -d aurora_pipeline

# View database status
docker-compose exec postgres pg_isready
```

## Production Docker Deployment

### Build Image

```bash
# Build for production
docker build -t aurora-pipeline:latest .

# Build with tag
docker build -t aurora-pipeline:1.0.0 .

# Build with build arguments
docker build --build-arg NODE_ENV=production -t aurora-pipeline:latest .

# View built images
docker images | grep aurora
```

### Run Container

#### Minimal Setup
```bash
docker run -d \
  --name aurora-app \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@postgres:5432/db \
  aurora-pipeline:latest
```

#### Full Production Setup
```bash
docker run -d \
  --name aurora-app \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@postgres.example.com:5432/aurora \
  -e PIPELINE_ENABLED=true \
  -e RUN_FREQUENCY="0 */12 * * *" \
  -e OPENAI_API_KEY=sk-xxx \
  -e ELEVENLABS_API_KEY=sk-xxx \
  -e RUNWAYML_API_KEY=xxx \
  -v /var/aurora/runs:/app/runs \
  -v /var/aurora/logs:/app/logs \
  --healthcheck-interval=30s \
  --healthcheck-timeout=10s \
  --healthcheck-retries=3 \
  aurora-pipeline:latest
```

### Container Management

```bash
# View running containers
docker ps

# View all containers
docker ps -a

# View container logs
docker logs -f aurora-app

# Stop container
docker stop aurora-app

# Start container
docker start aurora-app

# Restart container
docker restart aurora-app

# Remove container
docker rm aurora-app

# Remove image
docker rmi aurora-pipeline:latest

# View container details
docker inspect aurora-app

# Resource stats
docker stats aurora-app
```

## Docker Network Configuration

### Network Types

```yaml
# Bridge network (default with docker-compose)
networks:
  aurora-network:
    driver: bridge
```

### Service DNS Resolution

Within docker-compose, services can communicate using service names:
- `postgres:5432` - PostgreSQL connection
- `app:3000` - Application connection

### Port Mapping

```yaml
# Internal port : External port
ports:
  - "3000:3000"   # Access app at localhost:3000
  - "5432:5432"   # Access DB at localhost:5432
```

## Volume Management

### Named Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect aurora-pipeline_postgres_data

# Remove volume
docker volume rm aurora-pipeline_postgres_data

# Backup volume
docker run --rm -v aurora-pipeline_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_data.tar.gz -C /data .

# Restore volume
docker run --rm -v aurora-pipeline_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_data.tar.gz -C /data
```

### Bind Mounts

```yaml
# Bind mount configuration
volumes:
  - ./runs:/app/runs           # Local ./runs → /app/runs in container
  - ./logs:/app/logs           # Local ./logs → /app/logs in container
```

## Environment Variables

### From .env File

Docker Compose automatically loads variables from `.env`:

```bash
# In .env
POSTGRES_USER=aurora
POSTGRES_PASSWORD=secret

# Available in docker-compose.yml
environment:
  POSTGRES_USER: ${POSTGRES_USER}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

### At Runtime

```bash
# Override variables when starting
docker-compose -e PIPELINE_ENABLED=false up -d

# Or in .env file specific to compose
echo "PIPELINE_ENABLED=false" >> .env.local
docker-compose --env-file .env.local up -d
```

## Health Checks

### Health Check Endpoint

```bash
# Check application health
curl http://localhost:3000/health

# Check with detailed output
curl -v http://localhost:3000/health
```

### Database Health

```bash
# Check PostgreSQL health
docker-compose exec postgres pg_isready

# Or via application
docker-compose exec app wget --quiet --tries=1 --spider http://localhost:3000/health
```

### Monitor Container Health

```bash
# View health status
docker-compose ps

# Inspect health details
docker inspect --format='{{json .State.Health}}' aurora-app | jq
```

## Performance Tuning

### Database Performance

```yaml
# In docker-compose.yml
postgres:
  environment:
    POSTGRES_MAX_CONNECTIONS: 100
    POSTGRES_SHARED_BUFFERS: "256MB"
    POSTGRES_EFFECTIVE_CACHE_SIZE: "1GB"
```

### Application Performance

```bash
# Increase Node memory
docker run -e NODE_OPTIONS="--max-old-space-size=4096" aurora-pipeline:latest

# Enable clustering
docker run -e NODE_CLUSTER_WORKERS=4 aurora-pipeline:latest
```

### Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Networking with External Services

### Expose Database Externally

```yaml
postgres:
  ports:
    - "5432:5432"  # Now accessible from host machine
```

### Custom Network

```yaml
networks:
  aurora-prod:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  postgres:
    networks:
      aurora-prod:
        ipv4_address: 172.20.0.2
  app:
    networks:
      aurora-prod:
        ipv4_address: 172.20.0.3
```

## Security Best Practices

### 1. Secrets Management

```bash
# Use Docker secrets (Swarm mode)
echo "secret_value" | docker secret create api_key -

# Or use environment variables with secure .env
chmod 600 .env
```

### 2. Image Security

```bash
# Scan for vulnerabilities
docker scan aurora-pipeline:latest

# Use Alpine for smaller attack surface
FROM node:20-alpine
```

### 3. Container Hardening

```yaml
services:
  app:
    # Run as non-root user
    user: node
    # Read-only root filesystem
    read_only: true
    # Drop capabilities
    cap_drop:
      - ALL
    # Add specific capabilities if needed
    cap_add:
      - NET_BIND_SERVICE
```

### 4. Network Isolation

```yaml
networks:
  backend:
    driver: bridge
  frontend:
    driver: bridge

services:
  postgres:
    networks:
      - backend    # Only connected to backend
  app:
    networks:
      - backend
      - frontend   # Connected to both
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs app

# Validate docker-compose.yml
docker-compose config

# Check image exists
docker images | grep aurora

# Rebuild image
docker-compose build --no-cache
```

### Database Connection Issues

```bash
# Check if postgres is running
docker-compose ps

# Check network connectivity
docker-compose exec app ping postgres

# Check database is ready
docker-compose exec postgres pg_isready

# View postgres logs
docker-compose logs postgres
```

### Port Conflicts

```bash
# Find process using port
lsof -i :3000

# Or check Docker
docker ps | grep 3000

# Use different port
docker-compose -p myapp up -d
```

### Disk Space Issues

```bash
# Check Docker disk usage
docker system df

# Clean up unused images
docker image prune

# Clean up unused volumes
docker volume prune

# Clean up everything unused
docker system prune -a
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Build and Push Docker Image
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: myregistry/aurora-pipeline:latest
```

### GitLab CI Example

```yaml
build_docker:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker build -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:latest
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized with migrations
- [ ] Volumes mounted and permissions set
- [ ] Health checks passing
- [ ] API responding correctly
- [ ] Logs being generated
- [ ] Database backups configured
- [ ] Restart policy set
- [ ] Resource limits configured
- [ ] Security best practices applied
- [ ] Monitoring/alerting configured

---

For more information, see the main [README.md](README.md)
