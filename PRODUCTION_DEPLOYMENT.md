# Production Deployment Guide - Aurora Pipeline

## Quick Start (Production Ready)

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- PM2 (global): `npm install -g pm2`
- Git

### 1. Clone and Setup

```bash
# Clone repository
git clone <repo-url>
cd AURORA-PIPELINE

# Install dependencies
npm install

# Build application
npm run build
```

### 2. Environment Configuration

```bash
# Copy and edit environment file
cp .env.example .env

# Edit .env with your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - API Keys: OpenAI, ElevenLabs, HeyGen/RunwayML
# - Social Media: Twitter, YouTube, LinkedIn credentials
```

### 3. Database Setup

```bash
# Push schema to database (creates tables)
npm run db:push

# Verify connection
psql $DATABASE_URL -c "SELECT version();"
```

### 4. Start with PM2

```bash
# Start Aurora Pipeline with PM2
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs aurora-pipeline

# Save PM2 process list (for auto-restart on reboot)
pm2 save

# Setup auto-start on system boot
pm2 startup
```

### 5. Verify Production Readiness

```bash
# Health check (should return 200)
curl http://localhost:3000/health

# Readiness check (should return 200 when ready)
curl http://localhost:3000/ready

# Metrics check
curl http://localhost:3000/metrics

# Manual trigger test
curl -X POST http://localhost:3000/api/runs/trigger

# List runs
curl http://localhost:3000/api/runs
```

---

## Docker Deployment

### Build and Run with Docker

```bash
# Build image
docker build -t aurora-pipeline:latest .

# Run container
docker run -d \
  --name aurora-app \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://user:pass@postgres-host:5432/aurora_pipeline \
  -e OPENAI_API_KEY=sk-... \
  -e VOICE_API_KEY=sk_... \
  -e VIDEO_API_KEY=... \
  -p 3000:3000 \
  -v /path/to/runs:/app/runs \
  -v /path/to/logs:/app/logs \
  aurora-pipeline:latest

# Check health
curl http://localhost:3000/health

# View logs
docker logs -f aurora-app
```

### Docker Compose (Recommended for Local)

```bash
# Start services (PostgreSQL + Aurora)
docker-compose up -d

# Initialize database
docker-compose exec app npm run db:push

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Kubernetes Deployment

### Create Deployment Manifest

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aurora-pipeline
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aurora-pipeline
  template:
    metadata:
      labels:
        app: aurora-pipeline
    spec:
      containers:
      - name: aurora
        image: aurora-pipeline:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: database-url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: openai-key
        # ... other env vars
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Deploy to Kubernetes

```bash
# Create secrets
kubectl create secret generic aurora-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=openai-key="sk-..."

# Deploy
kubectl apply -f kubernetes/deployment.yaml

# Check status
kubectl get pods

# View logs
kubectl logs -f deployment/aurora-pipeline

# Port forward for testing
kubectl port-forward deployment/aurora-pipeline 3000:3000

# Test health
curl http://localhost:3000/health
```

---

## Monitoring & Observability

### Health Checks

| Endpoint | Purpose | Success |
|----------|---------|---------|
| `GET /health` | Service health | 200 + healthy JSON |
| `GET /ready` | Readiness probe | 200 when ready |
| `GET /metrics` | Prometheus metrics | Text format metrics |

### PM2 Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Show process info
pm2 info aurora-pipeline

# Show all logs
pm2 logs

# Tail logs with grep
pm2 logs | grep ERROR
```

### Database Monitoring

```bash
# Connect to database
psql $DATABASE_URL

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check log entries
SELECT COUNT(*) FROM pipeline_logs;

# Check DLQ entries
SELECT * FROM dlq WHERE status != 'resolved' ORDER BY created_at DESC;
```

---

## Troubleshooting

### Process Won't Start

```bash
# Check error logs
pm2 logs aurora-pipeline --err

# Verify environment variables
env | grep DATABASE_URL

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check node version
node --version
```

### Database Connection Issues

```bash
# Verify DATABASE_URL format
echo $DATABASE_URL

# Test connection with psql
psql $DATABASE_URL -c "SELECT NOW();"

# Check if schema was created
psql $DATABASE_URL -c "\dt"
```

### Health Check Fails

```bash
# Check if service is running
pm2 status

# Test endpoint directly
curl -v http://localhost:3000/health

# Check logs for errors
pm2 logs aurora-pipeline

# Verify database is healthy
psql $DATABASE_URL -c "SELECT 1;"
```

### Out of Memory

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart aurora-pipeline

# Check heap usage
pm2 logs | grep heap

# Increase max memory in ecosystem.config.js
# max_memory_restart: '1G'
```

---

## Maintenance

### Updating

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Build
npm run build

# Restart service
pm2 restart aurora-pipeline
```

### Backup

```bash
# Backup PostgreSQL
pg_dump $DATABASE_URL > aurora_backup_$(date +%Y%m%d).sql

# Backup runs directory
tar -czf runs_backup_$(date +%Y%m%d).tar.gz runs/
```

### Scaling

```bash
# Run multiple instances
pm2 start ecosystem.config.js -i 4

# Monitor cluster
pm2 monit
```

---

## Performance Optimization

### Database Indexing

```sql
-- Add indexes for common queries
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_started_at ON runs(started_at DESC);
CREATE INDEX idx_pipeline_logs_run_id ON pipeline_logs(run_id);
CREATE INDEX idx_assets_run_id ON assets(run_id);
CREATE INDEX idx_dlq_status ON dlq(status);
```

### Connection Pool Tuning

In `.env`:
```env
# Adjust pool size based on load
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
```

### Cron Schedule Optimization

Adjust `RUN_FREQUENCY` based on your needs:
```env
# Every 6 hours
RUN_FREQUENCY="0 */6 * * *"

# Every hour
RUN_FREQUENCY="0 * * * *"

# Every 30 minutes
RUN_FREQUENCY="*/30 * * * *"
```

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong, random API keys
- [ ] Enable SSL/TLS for database connection
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable HTTPS in production
- [ ] Setup firewall rules
- [ ] Regular security updates
- [ ] Monitor error logs for suspicious activity
- [ ] Backup database regularly
- [ ] Test disaster recovery plan

---

## Support & Monitoring

### Alerting (Example with Slack)

```bash
# Setup PM2+ for monitoring
pm2 plus

# Or integrate with external monitoring
# - Sentry for error tracking
# - DataDog for infrastructure
# - New Relic for APM
```

### On-Call Procedures

1. **Alert received** → Check PM2 status: `pm2 status`
2. **Service down** → Restart: `pm2 restart aurora-pipeline`
3. **Database issue** → Check connection: `psql $DATABASE_URL`
4. **Memory spike** → Restart: `pm2 restart aurora-pipeline`
5. **API slow** → Check metrics: `curl http://localhost:3000/metrics`
6. **DLQ backlog** → Check and process: Query `dlq` table

---

**Last Updated**: January 5, 2026
**Version**: Production Ready 1.0
