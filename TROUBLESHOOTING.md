# Deployment Troubleshooting Guide

## Common Issues and Solutions

### Docker Compose Issues

#### 1. Database Connection Timeout

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: database is not available
```

**Causes:**
- PostgreSQL container not running
- DATABASE_URL incorrect
- Network connectivity issues

**Solutions:**
```bash
# Check if postgres is running
docker-compose ps

# Check postgres logs
docker-compose logs postgres

# Verify the container is healthy
docker-compose ps postgres

# Restart postgres
docker-compose restart postgres

# Check network connectivity
docker-compose exec app ping postgres

# Verify DATABASE_URL environment variable
docker-compose exec app env | grep DATABASE_URL

# Re-create containers
docker-compose down -v
docker-compose up -d
```

#### 2. Port Already in Use

**Symptoms:**
```
Error: bind: address already in use
Error: EADDRINUSE: address already in use :::3000
```

**Solutions:**
```bash
# Find what's using the port
lsof -i :3000
netstat -tulpn | grep 3000

# Kill the process (Linux/Mac)
kill -9 <PID>

# Or use different ports in docker-compose
docker-compose up -p aurora_custom -d

# Or change ports in docker-compose.yml
# ports:
#   - "3001:3000"
```

#### 3. Out of Memory

**Symptoms:**
```
Error: JavaScript heap out of memory
Error: FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
```

**Solutions:**
```bash
# Increase Node memory via environment variable
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Or in docker-compose.yml
environment:
  - NODE_OPTIONS=--max-old-space-size=4096

# Increase Docker memory limit
docker update --memory=4g aurora-app

# For docker-compose
services:
  app:
    deploy:
      resources:
        limits:
          memory: 2G
```

#### 4. Migration Failures

**Symptoms:**
```
Error: No schema file found
Error: relation "runs" does not exist
```

**Solutions:**
```bash
# Check schema file exists
ls -la shared/schema.ts

# Run migrations
docker-compose exec app npm run db:push

# Check database connection
docker-compose exec postgres psql -U aurora -d aurora_pipeline -c "\dt"

# View migration logs
docker-compose logs app | grep -i migration

# Manually run migrations
docker-compose exec app npx drizzle-kit push
```

#### 5. Build Failures

**Symptoms:**
```
Error during build: Command failed
Error: Cannot find module 'xyz'
```

**Solutions:**
```bash
# Clean and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Check build logs
docker-compose logs app

# Verify package.json dependencies
npm ci

# Rebuild image
docker-compose build --no-cache app
```

#### 6. Service Won't Stay Running

**Symptoms:**
- Container keeps restarting
- Immediate exit after start
- Health check failing

**Solutions:**
```bash
# Check exit code and logs
docker-compose logs app

# View extended logs
docker logs --timestamps --all aurora-app

# Check the Dockerfile CMD/ENTRYPOINT
cat Dockerfile | grep -A5 "ENTRYPOINT\|CMD"

# Test manually
docker-compose exec app node dist/index.cjs

# Check process health
docker-compose ps
```

### Production Docker Issues

#### 1. Image Pull Failures

**Symptoms:**
```
Error response from daemon: pull access denied for aurora-pipeline
Error: authentication required
```

**Solutions:**
```bash
# Ensure image exists
docker images | grep aurora

# Rebuild locally
docker build -t aurora-pipeline:latest .

# Or tag with registry
docker tag aurora-pipeline:latest myregistry.azurecr.io/aurora:latest

# Log in to registry
docker login myregistry.azurecr.io

# Push to registry
docker push myregistry.azurecr.io/aurora:latest

# Update image path in docker-compose.yml or k8s manifests
```

#### 2. Volume Permission Issues

**Symptoms:**
```
Error: EACCES: permission denied, open '/app/runs/file'
Error: permission denied while trying to connect to Docker daemon
```

**Solutions:**
```bash
# Check volume permissions
ls -la runs/
ls -la logs/

# Fix permissions
chmod 755 runs logs
chmod -R 755 runs/* logs/*

# Or change ownership
sudo chown -R $USER:$USER runs logs

# In docker-compose, set proper user
services:
  app:
    user: node
    
# Create directories with proper permissions
mkdir -p runs logs
chmod 775 runs logs
```

#### 3. Secrets Not Available

**Symptoms:**
```
Error: Cannot read property of undefined (reading 'OPENAI_API_KEY')
Error: DATABASE_URL is not defined
```

**Solutions:**
```bash
# Verify secrets are set
env | grep DATABASE_URL
env | grep OPENAI_API_KEY

# Check .env file exists
ls -la .env

# Verify .env format
cat .env

# Reload environment
source .env

# Check Docker environment
docker inspect aurora-app | grep -i "env"

# Verify secrets in docker-compose
docker-compose config | grep DATABASE_URL
```

### Kubernetes Issues

#### 1. Pod Won't Start

**Symptoms:**
```
CrashLoopBackOff
Error: ImagePullBackOff
```

**Solutions:**
```bash
# Check pod status
kubectl describe pod <pod-name> -n aurora

# View pod logs
kubectl logs <pod-name> -n aurora

# View previous logs (if crashed)
kubectl logs <pod-name> -n aurora --previous

# Check image availability
kubectl get pods -n aurora -o wide

# Check events
kubectl get events -n aurora --sort-by='.lastTimestamp'
```

#### 2. Database Connection Issues

**Symptoms:**
```
Unable to connect to database
Connection pool exhausted
```

**Solutions:**
```bash
# Check database pod
kubectl get pods -n aurora -l app=postgres

# Check service
kubectl get svc -n aurora

# Test connectivity
kubectl exec -it <app-pod> -n aurora -- sh
# Inside pod: psql postgresql://user:pass@postgres-service:5432/db

# Check logs
kubectl logs -n aurora deployment/postgres

# Verify environment variables
kubectl set env pod/<pod-name> --list -n aurora
```

#### 3. Storage Issues

**Symptoms:**
```
PersistentVolumeClaim pending
Error: no persistent volumes available
```

**Solutions:**
```bash
# Check PVC status
kubectl get pvc -n aurora

# Check PV status
kubectl get pv

# Describe PVC for details
kubectl describe pvc <pvc-name> -n aurora

# Create PV if needed
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: aurora-pv
spec:
  capacity:
    storage: 50Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/data/aurora"
EOF
```

#### 4. Resource Quotas Exceeded

**Symptoms:**
```
Error: pods "aurora-app-xyz" is forbidden: exceeded quota
```

**Solutions:**
```bash
# Check resource quotas
kubectl get quota -n aurora

# View quota details
kubectl describe quota -n aurora

# Check actual usage
kubectl top pods -n aurora
kubectl top nodes

# Increase quota
kubectl edit quota <quota-name> -n aurora

# Or delete quota
kubectl delete quota <quota-name> -n aurora
```

#### 5. Ingress Not Working

**Symptoms:**
- Cannot reach service via ingress URL
- 404 or 502 errors

**Solutions:**
```bash
# Check ingress
kubectl get ingress -n aurora

# Describe ingress
kubectl describe ingress aurora-ingress -n aurora

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check service
kubectl get svc -n aurora

# Test endpoint directly
kubectl port-forward svc/aurora-service 3000:80 -n aurora
curl localhost:3000

# Check DNS
nslookup aurora.example.com
```

### Application Issues

#### 1. High Memory Usage

**Symptoms:**
```
Memory constantly increasing
OOMKilled container
```

**Monitoring:**
```bash
# Check memory usage
docker stats

# Or in Kubernetes
kubectl top pod <pod-name> -n aurora

# View process details
docker exec aurora-app ps aux

# Check for memory leaks
# Add monitoring: npm install clinic
# npm clinic doctor -- node dist/index.cjs
```

**Solutions:**
```bash
# Increase memory limit
docker update --memory=4g aurora-app

# Or in docker-compose
deploy:
  resources:
    limits:
      memory: 2G

# Optimize application
# - Implement pagination for queries
# - Cache frequently accessed data
# - Profile with node --prof
# - Use memory profiling tools
```

#### 2. Slow Database Queries

**Symptoms:**
```
Requests timing out
High database CPU usage
```

**Debugging:**
```bash
# Enable query logging
docker-compose exec postgres psql -U aurora -d aurora_pipeline
postgres=# SET log_statement = 'all';
postgres=# SELECT query FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

# Analyze slow queries
postgres=# EXPLAIN ANALYZE SELECT ...;
```

**Solutions:**
```sql
-- Add indexes
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_logs_run_id ON pipeline_logs(runId);
CREATE INDEX idx_assets_run_id ON assets(runId);

-- Update statistics
VACUUM ANALYZE;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

#### 3. API Endpoints Returning Errors

**Symptoms:**
```
500 Internal Server Error
502 Bad Gateway
Connection refused
```

**Solutions:**
```bash
# Check application health
curl http://localhost:3000/health

# View detailed logs
docker-compose logs app | tail -100

# Check all routes are registered
curl http://localhost:3000/api/runs

# Check database availability
docker-compose exec app npm run db:push

# Test basic connectivity
docker-compose exec app wget -q -O- http://localhost:3000
```

## Monitoring and Diagnostics

### Container Diagnostics

```bash
# Full container details
docker inspect aurora-app | jq

# Resource usage
docker stats

# Process inside container
docker top aurora-app

# Network statistics
docker network inspect aurora-pipeline_aurora-network

# Logs with timestamps
docker logs --timestamps aurora-app
```

### Database Diagnostics

```bash
# Connect to database
docker-compose exec postgres psql -U aurora -d aurora_pipeline

# Check tables
postgres=# \dt

# Check table sizes
postgres=# SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

# Check connections
postgres=# SELECT datname, usename, count(*) FROM pg_stat_activity GROUP BY datname, usename;

# Check locks
postgres=# SELECT * FROM pg_locks WHERE NOT granted;

# View slow queries
postgres=# SELECT query, calls, mean_exec_time FROM pg_stat_statements
  ORDER BY mean_exec_time DESC LIMIT 10;
```

### Application Diagnostics

```bash
# Check running processes
docker-compose exec app ps aux

# Check open ports
docker-compose exec app netstat -tulpn

# Check file descriptors
docker-compose exec app lsof

# Check environment variables
docker-compose exec app env | sort

# Check application version
docker-compose exec app cat package.json | grep version
```

## Performance Profiling

### CPU Profiling

```bash
# Start profiling
node --prof dist/index.cjs

# Process results
node --prof-process isolate-0x*.log > processed.txt

# View results
cat processed.txt
```

### Memory Profiling

```bash
# Install clinic tools
npm install -g clinic

# Profile application
clinic doctor -- node dist/index.cjs

# Open results
clinic doctor --open
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Create load test
cat > load-test.yml <<EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: 'API Load Test'
    flow:
      - get:
          url: '/api/runs'
EOF

# Run test
artillery run load-test.yml
```

## Health Check Verification

```bash
# Simple health check
curl -f http://localhost:3000/health || echo "Unhealthy"

# With verbose output
curl -v http://localhost:3000/health

# Check response code
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health

# Continuous monitoring
while true; do
  curl -s http://localhost:3000/health
  sleep 5
done
```

## Getting Help

### Collect Diagnostic Information

```bash
# Create diagnostic bundle
mkdir aurora-diagnostics
docker-compose ps > aurora-diagnostics/ps.txt
docker-compose logs > aurora-diagnostics/logs.txt
docker inspect aurora-app > aurora-diagnostics/inspect.json
docker stats --no-stream > aurora-diagnostics/stats.txt
env | grep -i aurora > aurora-diagnostics/env.txt
cat .env | sed 's/=.*/=***/' > aurora-diagnostics/env-sanitized.txt

# Create tarball
tar czf aurora-diagnostics.tar.gz aurora-diagnostics/

# Share safely (remove secrets first)
```

### Debug Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Debugging Guide](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Express.js Debugging](https://expressjs.com/en/guide/debugging.html)

### Ask for Support

When requesting help, include:
1. Error message (full stack trace)
2. Steps to reproduce
3. Environment details (OS, versions)
4. Diagnostic output (logs, env vars)
5. What you've already tried

---

For general information, see [README.md](README.md)
For Docker details, see [DOCKER.md](DOCKER.md)
For Kubernetes details, see [KUBERNETES.md](KUBERNETES.md)
