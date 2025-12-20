# Quick Reference Guide

## Essential Commands

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run check

# Build for production
npm run build

# Start production server
npm start
```

### Database

```bash
# Push migrations to database
npm run db:push

# View database
psql postgresql://aurora:password@localhost:5432/aurora_pipeline

# Backup database
pg_dump -U aurora -d aurora_pipeline > backup.sql

# Restore database
psql -U aurora -d aurora_pipeline < backup.sql
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Run command in container
docker-compose exec app npm run db:push

# Remove everything including volumes
docker-compose down -v
```

### Docker

```bash
# Build image
docker build -t aurora-pipeline:latest .

# Run container
docker run -d -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  aurora-pipeline:latest

# View logs
docker logs -f aurora-app

# Stop container
docker stop aurora-app

# Remove container
docker rm aurora-app
```

### Kubernetes

```bash
# Create namespace
kubectl create namespace aurora

# Create secrets
kubectl create secret generic aurora-secrets \
  --from-literal=DATABASE_URL=... \
  -n aurora

# Deploy application
kubectl apply -f aurora-deployment.yaml -n aurora

# View pods
kubectl get pods -n aurora

# View logs
kubectl logs -f deployment/aurora-app -n aurora

# Port forward
kubectl port-forward svc/aurora-service 3000:80 -n aurora

# Scale deployment
kubectl scale deployment aurora-app --replicas=3 -n aurora
```

## Environment Variables Quick Ref

| Variable | Required | Default | Example |
|----------|----------|---------|---------|
| `NODE_ENV` | No | development | production |
| `DATABASE_URL` | Yes | - | postgresql://user:pass@host/db |
| `PIPELINE_ENABLED` | No | true | true/false |
| `RUN_FREQUENCY` | No | 0 */12 * * * | 0 0 * * * |
| `OPENAI_API_KEY` | No | - | sk-proj-xxx |
| `ELEVENLABS_API_KEY` | No | - | sk_xxx |
| `RUNWAYML_API_KEY` | No | - | xxx |
| `PORT` | No | 3000 | 3000 |

## Cron Schedules

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)
```

### Common Patterns

| Schedule | Meaning |
|----------|---------|
| `0 */12 * * *` | Every 12 hours |
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 0` | Weekly on Sunday |
| `0 0 1 * *` | Monthly on the 1st |
| `*/15 * * * *` | Every 15 minutes |
| `0 9-17 * * 1-5` | Every hour 9am-5pm on weekdays |
| `0 0,12 * * *` | Twice daily (midnight & noon) |

## Ports

| Service | Port | Purpose |
|---------|------|---------|
| Application | 3000 | Main API & Dashboard |
| PostgreSQL | 5432 | Database |
| Vite Dev | 5173 | Frontend dev server |

## File Locations

| Path | Purpose |
|------|---------|
| `/app/runs` | Generated assets storage |
| `/app/logs` | Application logs |
| `./migrations` | Database migrations |
| `./shared/schema.ts` | Database schema |
| `./server/aurora` | Pipeline logic |
| `./client/src` | Frontend code |

## Status Codes

| Code | Type | Meaning |
|------|------|---------|
| 200 | Success | Request successful |
| 201 | Success | Resource created |
| 400 | Client Error | Bad request |
| 401 | Client Error | Unauthorized |
| 404 | Client Error | Not found |
| 500 | Server Error | Internal error |
| 503 | Server Error | Service unavailable |

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/runs` | List all runs |
| GET | `/api/runs/:id` | Get run details |
| POST | `/api/runs/trigger` | Trigger manual run |
| GET | `/api/runs/:id/logs` | Get run logs |
| GET | `/api/runs/:id/assets` | Get run assets |
| GET | `/health` | Health check |

## Log Levels

| Level | Usage |
|-------|-------|
| INFO | Normal operations |
| WARN | Non-critical issues |
| ERROR | Critical errors |

## Database Tables

### runs
- Tracks pipeline execution
- Fields: id, status, startedAt, completedAt, error

### pipeline_logs
- Stores execution logs
- Fields: id, runId, level, message, timestamp, metadata

### assets
- Tracks generated content
- Fields: id, runId, type, path, status, metadata

## Troubleshooting Checklist

- [ ] Check `.env` file exists and is correct
- [ ] Verify database is running: `docker-compose ps`
- [ ] Check database connection: `docker-compose exec postgres pg_isready`
- [ ] View logs: `docker-compose logs app`
- [ ] Test health endpoint: `curl http://localhost:3000/health`
- [ ] Verify ports are available: `lsof -i :3000`
- [ ] Check disk space: `df -h`
- [ ] Check memory usage: `docker stats`
- [ ] Verify API keys are set: `env | grep API`
- [ ] Check file permissions: `ls -la runs logs`

## Performance Tuning

### Quick Wins
1. Enable database connection pooling
2. Add database indexes
3. Increase Node memory
4. Use CDN for static files
5. Implement caching

### Monitoring
- CPU usage
- Memory usage
- Database connections
- API response time
- Queue depth

## Security Checklist

- [ ] Change default passwords
- [ ] Use strong `.env` secrets
- [ ] Enable HTTPS in production
- [ ] Use network policies
- [ ] Implement rate limiting
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Use secrets management
- [ ] Principle of least privilege

## Deployment Checklist

- [ ] `.env` configured with production values
- [ ] Database initialized and migrated
- [ ] Health checks passing
- [ ] Logs being generated
- [ ] Backups scheduled
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Scaling policies configured
- [ ] DNS/Domain configured
- [ ] SSL certificates valid

## Useful Links

- **Application**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health
- **Repository**: [GitHub Link]
- **Documentation**: [README.md](README.md)
- **Docker Guide**: [DOCKER.md](DOCKER.md)
- **Kubernetes Guide**: [KUBERNETES.md](KUBERNETES.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## File Structure

```
AURORA-PIPELINE/
├── client/              # Frontend (React)
├── server/              # Backend (Express)
│   └── aurora/         # Pipeline logic
├── shared/             # Shared code
├── Dockerfile          # Production build
├── docker-compose.yml  # Local setup
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── README.md           # Main documentation
├── DOCKER.md           # Docker guide
├── KUBERNETES.md       # Kubernetes guide
└── TROUBLESHOOTING.md  # Troubleshooting
```

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Port in use | `lsof -i :3000` then `kill -9 <PID>` |
| DB not responding | `docker-compose restart postgres` |
| Out of memory | Add `NODE_OPTIONS=--max-old-space-size=4096` |
| Migration failed | `docker-compose exec app npm run db:push` |
| Secrets not found | Verify `.env` file and `source .env` |
| Slow queries | Add database indexes |
| Container won't start | `docker-compose logs app` |
| DNS resolution | Check `/etc/hosts` or use service name |
| SSL certificate | Use cert-manager or update Ingress |

## Performance Metrics to Monitor

- **Response Time**: Target < 200ms for 95th percentile
- **CPU**: Should stay < 70% under normal load
- **Memory**: Monitor for leaks, should be stable
- **Database Connections**: Keep below max pool size
- **Queue Depth**: Retry queue should be empty or small
- **Error Rate**: Should be < 1% (ideally 0%)
- **Uptime**: Target 99.9% (5 minutes downtime/month)

---

**Version**: 1.0.0
**Last Updated**: December 2024

For detailed information, see full documentation files:
- [README.md](README.md) - Complete guide
- [DOCKER.md](DOCKER.md) - Docker deployment
- [KUBERNETES.md](KUBERNETES.md) - Kubernetes deployment
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problem solving
