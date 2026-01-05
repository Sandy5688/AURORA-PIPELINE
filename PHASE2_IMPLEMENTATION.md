# Aurora Pipeline - Phase 2 Implementation Guide

**Date**: January 5, 2026  
**Status**: Phase-2 Features Implemented ✅  
**Last Updated**: Phase 1 → Phase 2 Upgrade Complete

---

## Overview

Phase 2 of the Aurora Pipeline adds essential production-grade features including structured logging, authentication, rate limiting, FFmpeg video post-processing, Kubernetes deployment, and comprehensive API documentation.

---

## 🎯 Phase 2 Features Implemented

### 1. ✅ Structured JSON Logging with Winston

**File**: [server/logger.ts](server/logger.ts)

**Features**:
- JSON-formatted logs for easy parsing
- Multiple transports (console, file, rotating files)
- Log levels: debug, info, warn, error
- Automatic daily log rotation
- Configurable retention (30 days default)
- Error stack traces

**Usage**:
```typescript
import { logger, logInfo, logError, logWarn } from './logger';

// Simple logging
logInfo('Pipeline started', { runId: '123' });
logError('Failed to generate video', error, { runId: '123' });
logWarn('API rate limit warning', { client: 'ip' });

// Direct logger access
logger.info('Custom message', { custom: 'metadata' });
```

**Log Files** (Production):
```
logs/
  2026-01-05-combined.log      # All logs
  2026-01-05-errors.log        # Errors only
  2026-01-06-combined.log      # Rotates daily
```

**Environment Variables**:
```env
LOG_LEVEL=info                 # debug|info|warn|error
```

---

### 2. ✅ FFmpeg Video Post-Processing

**File**: [server/aurora/video-processor.ts](server/aurora/video-processor.ts)

**Features**:
- Real FFmpeg integration for video conversion
- Quality presets (low, medium, high)
- Format support (mp4, webm, mov)
- Resolution scaling (720p, 1080p, 2k)
- Batch video processing
- Metadata extraction
- Thumbnail generation
- Automatic fallback on error

**Usage**:
```typescript
import { processVideo, batchProcessVideos, generateThumbnail } from './aurora/video-processor';

// Single video processing
const result = await processVideo({
  inputPath: '/path/to/video.mov',
  outputPath: '/path/to/video.mp4',
  quality: 'high',
  format: 'mp4',
  resolution: '1080p',
  fps: 30,
});

// Batch processing
const results = await batchProcessVideos([
  { inputPath: 'vid1.mov', outputPath: 'vid1.mp4', quality: 'medium' },
  { inputPath: 'vid2.mov', outputPath: 'vid2.mp4', quality: 'high' },
]);

// Generate thumbnail
await generateThumbnail('video.mp4', 'thumbnail.jpg', '00:00:05');
```

**Requirements**:
```bash
# Install FFmpeg on your system
apt-get install ffmpeg          # Ubuntu/Debian
brew install ffmpeg             # macOS
choco install ffmpeg            # Windows
```

**Pipeline Integration**:
```typescript
// In video-engine, after HeyGen generates video:
await processVideo({
  inputPath: videoPath,
  outputPath: processedPath,
  quality: process.env.VIDEO_QUALITY || 'medium',
});
```

---

### 3. ✅ Rate Limiting

**File**: [server/rate-limiter.ts](server/rate-limiter.ts)

**Features**:
- Per-IP rate limiting
- Configurable time windows and max requests
- Preset configurations (API, auth, pipeline, upload)
- Automatic client blocking after violations
- Retry-After headers
- Custom key generators

**Presets**:
```typescript
- api: 100 requests per 15 minutes
- auth: 5 attempts per 15 minutes
- webhook: 1000 requests per 1 hour
- pipeline: 10 triggers per hour
- upload: 20 uploads per hour
```

**Implementation**:
```typescript
import { createRateLimiter } from './rate-limiter';

const limiter = createRateLimiter('api');
app.use('/api/', limiter.middleware());

// Custom limits
const customLimiter = new RateLimiter({
  windowMs: 60000,        // 1 minute
  maxRequests: 10,
  message: 'Too many requests'
});
```

**Environment Variables**:
```env
RATE_LIMIT_API_WINDOW_MS=900000
RATE_LIMIT_API_MAX_REQUESTS=100
RATE_LIMIT_PIPELINE_WINDOW_MS=3600000
RATE_LIMIT_PIPELINE_MAX_REQUESTS=10
```

**Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-01-05T12:30:00Z
```

---

### 4. ✅ Authentication & Authorization

**File**: [server/auth.ts](server/auth.ts)

**Features**:
- User registration and login
- Role-based access control (RBAC)
- API key generation
- Session token management
- Permission-based authorization
- Roles: admin, user, viewer

**Roles & Permissions**:
```typescript
admin:   ['*']                              // All permissions
user:    ['read:runs', 'write:runs', 'read:logs', 'trigger:pipeline']
viewer:  ['read:runs', 'read:logs']
```

**API Usage**:
```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "secure-password",
    "role": "user"
  }'

# Response
{
  "status": "success",
  "user": { "id": "uuid", "username": "john", "role": "user" },
  "apiKey": "sk_..."
}

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "john", "password": "secure-password" }'

# Response
{
  "status": "success",
  "token": "session-token-here",
  "user": { "username": "john", "role": "user" }
}
```

**Using Credentials**:
```bash
# With API key
curl -H "x-api-key: sk_..." http://localhost:3000/api/runs

# With session token
curl -H "Authorization: Bearer token-here" http://localhost:3000/api/runs
```

**Middleware Usage**:
```typescript
import { authenticateMiddleware, authorizeMiddleware } from './auth';

// Protected endpoint
app.get('/api/admin', 
  authenticateMiddleware, 
  authorizeMiddleware('admin'),
  (req, res) => {
    res.json({ message: 'Admin only' });
  }
);

// Optional auth (doesn't fail if no credentials)
import { optionalAuthMiddleware } from './auth';
app.use('/api/', optionalAuthMiddleware);
```

---

### 5. ✅ Swagger/OpenAPI Documentation

**Files**: 
- [server/swagger.ts](server/swagger.ts) - Documentation setup
- `/api-docs` - Interactive UI
- `/api-spec.json` - OpenAPI JSON
- `/api-spec.yaml` - OpenAPI YAML

**Access Documentation**:
```
http://localhost:3000/api-docs          # Interactive Swagger UI
http://localhost:3000/api-spec.json     # OpenAPI JSON spec
http://localhost:3000/api-spec.yaml     # OpenAPI YAML spec
```

**Features**:
- Interactive API testing
- Endpoint documentation
- Request/response schemas
- Authentication documentation
- Try-it-out functionality
- Download spec files

**Endpoints Documented**:
```
GET  /health                  - Service health
GET  /ready                   - Readiness probe
GET  /metrics                 - Prometheus metrics
GET  /api/runs                - List runs
GET  /api/runs/{runId}        - Get run details
POST /api/runs/trigger        - Trigger pipeline
POST /api/auth/register       - Register user
POST /api/auth/login          - Login user
GET  /api/auth/info           - Auth info (protected)
```

---

### 6. ✅ Kubernetes Manifests

**File**: [k8s-manifests.yaml](k8s-manifests.yaml)

**Includes**:
- Namespace configuration
- ConfigMaps for environment
- Secrets management
- Deployment (2 replicas)
- Service exposure
- Horizontal Pod Autoscaler (HPA)
- Pod Disruption Budget
- RBAC setup
- ServiceMonitor for Prometheus
- Alert rules

**Quick Deploy**:
```bash
# Apply manifests
kubectl apply -f k8s-manifests.yaml

# Check deployment
kubectl get pods -n aurora-pipeline
kubectl get svc -n aurora-pipeline

# View logs
kubectl logs -n aurora-pipeline -l app=aurora-pipeline -f

# Scale manually
kubectl scale deployment aurora-pipeline -n aurora-pipeline --replicas=5

# Access service
kubectl port-forward -n aurora-pipeline svc/aurora-pipeline-service 3000:80
```

**Configuration**:
- 2 replicas (minimum)
- Auto-scale to 10 on high CPU/memory
- Pod anti-affinity (spread across nodes)
- Resource requests: 256Mi memory, 250m CPU
- Resource limits: 512Mi memory, 500m CPU
- Health checks: liveness + readiness probes
- Security: non-root user, read-only filesystem

**Monitoring Integration**:
- Prometheus metrics export
- Alert rules for down, errors, memory
- ServiceMonitor for automatic scraping

---

## 📊 New Dependencies

### Added to package.json:
```json
{
  "dependencies": {
    "winston": "^3.14.2",
    "winston-daily-rotate-file": "^4.7.1",
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  },
  "devDependencies": {
    "@types/swagger-ui-express": "^4.1.6"
  }
}
```

**Installation**:
```bash
npm install
```

---

## 🔧 Configuration

### Environment Variables

```env
# Logging
LOG_LEVEL=info                           # debug|info|warn|error

# Video Processing
FFMPEG_ENABLED=false                     # Enable FFmpeg processing
VIDEO_QUALITY=medium                     # low|medium|high
VIDEO_FORMAT=mp4                         # mp4|webm|mov

# Authentication
SESSION_SECRET=your-random-key           # For session encryption

# Rate Limiting
RATE_LIMIT_API_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_API_MAX_REQUESTS=100
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5
RATE_LIMIT_PIPELINE_WINDOW_MS=3600000    # 1 hour
RATE_LIMIT_PIPELINE_MAX_REQUESTS=10
```

---

## 🚀 Integration with Phase 1

### Video Pipeline Enhancement:
```typescript
import { processVideo } from './aurora/video-processor';

// In video-engine after HeyGen generation:
if (process.env.FFMPEG_ENABLED === 'true') {
  const result = await processVideo({
    inputPath: videoPath,
    outputPath: processedPath,
    quality: process.env.VIDEO_QUALITY || 'medium',
    format: process.env.VIDEO_FORMAT || 'mp4',
  });
  
  if (result.success) {
    return { path: result.outputPath, ...result };
  }
}
```

### Protected API Endpoints:
```typescript
import { authenticateMiddleware, authorizeMiddleware } from './auth';

// Admin-only endpoint
app.post('/api/admin/triggers',
  authenticateMiddleware,
  authorizeMiddleware('admin'),
  (req, res) => {
    // Only admins can access
  }
);
```

### Structured Logging:
```typescript
import { logInfo, logError } from './logger';

// Replace console.log with structured logging
logInfo('Pipeline execution started', {
  runId: run.id,
  topic: run.topic,
  timestamp: new Date().toISOString(),
});

logError('Video generation failed', error, {
  runId: run.id,
  step: 'video-generation',
});
```

---

## 📈 Monitoring & Observability

### Health Checks:
```bash
# Service health
curl http://localhost:3000/health
# Response: { status: 'healthy', timestamp, uptime }

# Readiness (for Kubernetes)
curl http://localhost:3000/ready
# Response: { status: 'ready', database: 'connected', scheduler: 'running' }

# Metrics (Prometheus format)
curl http://localhost:3000/metrics
```

### Kubernetes Monitoring:
```bash
# View Prometheus alerts
kubectl get promalert -n aurora-pipeline

# Check ServiceMonitor
kubectl get servicemonitor -n aurora-pipeline

# View metrics
kubectl exec -it pod/prometheus-0 -- promtool query instant \
  'up{job="aurora-pipeline"}'
```

### Log Aggregation:
```bash
# View structured logs
tail -f logs/2026-01-05-combined.log | jq .

# Filter errors
cat logs/2026-01-05-errors.log | jq '.level == "error"'

# Search for specific run
cat logs/2026-01-05-combined.log | jq 'select(.runId == "123")'
```

---

## 🔒 Security Considerations

### Best Practices:
1. **API Keys**: Store securely in environment variables
2. **Sessions**: Use encrypted session cookies in production
3. **Rates Limiting**: Prevent brute force and DoS attacks
4. **HTTPS**: Always use TLS in production
5. **RBAC**: Enforce principle of least privilege
6. **Audit Logs**: All authentication attempts are logged

### Example Production Setup:
```yaml
# Docker Compose with TLS
services:
  aurora:
    image: aurora-pipeline:latest
    environment:
      NODE_ENV: production
      SESSION_SECRET: ${SECURE_RANDOM_KEY}
      DATABASE_URL: ${DB_URL}
      OPENAI_API_KEY: ${API_KEY}
    ports:
      - "443:3000"  # HTTPS
    volumes:
      - ./certs/ssl.crt:/app/certs/ssl.crt:ro
      - ./certs/ssl.key:/app/certs/ssl.key:ro
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 📚 API Reference

### Authentication Endpoints

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john",
  "password": "secure-password",
  "role": "user"
}

Response (201):
{
  "status": "success",
  "user": { "id": "uuid", "username": "john", "role": "user" },
  "apiKey": "sk_..."
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "john",
  "password": "secure-password"
}

Response (200):
{
  "status": "success",
  "token": "session-token",
  "user": { "username": "john", "role": "user" }
}
```

#### Get Auth Info
```
GET /api/auth/info
x-api-key: sk_...

Response (200):
{
  "status": "success",
  "user": { ... },
  "authInfo": {
    "userCount": 5,
    "sessionCount": 2,
    "apiKeyCount": 3
  }
}
```

---

## 🧪 Testing

### Test API Endpoints:
```bash
# Test rate limiting
for i in {1..110}; do 
  curl -s http://localhost:3000/api/runs | head -c 50
done

# Test authentication
curl -H "x-api-key: invalid" http://localhost:3000/api/runs
# Response: 401 Unauthorized

# Test logging (check logs directory)
npm run dev
# Check logs/YYYY-MM-DD-combined.log
```

### Test FFmpeg Processing:
```bash
# Create test video
ffmpeg -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 test.mp4

# Process with Aurora
node -e "
  import { processVideo } from './server/aurora/video-processor.ts';
  processVideo({
    inputPath: 'test.mp4',
    outputPath: 'test-processed.mp4',
    quality: 'high',
    resolution: '720p'
  }).then(console.log);
"
```

---

## 🎓 Next Steps (Phase 3)

Suggested Phase-3 enhancements:
1. API rate limiting by user tier (premium, basic, free)
2. Advanced error recovery and chaos engineering
3. Multi-region replication
4. Caching layer (Redis)
5. Message queue (RabbitMQ/Kafka) for async processing
6. Distributed tracing (Jaeger/OpenTelemetry)
7. GraphQL API
8. Mobile app with push notifications
9. Advanced analytics dashboard
10. Machine learning for content optimization

---

## 📞 Troubleshooting

### FFmpeg Not Found:
```bash
# Verify FFmpeg is installed
ffmpeg -version

# Add to PATH if needed
export PATH="/usr/local/bin:$PATH"
```

### Rate Limiting Too Strict:
```env
# Increase limits in .env
RATE_LIMIT_API_MAX_REQUESTS=200
RATE_LIMIT_API_WINDOW_MS=1800000  # 30 minutes
```

### Logs Not Rotating:
```bash
# Check permissions
ls -la logs/
chmod 755 logs/

# Verify winston config
cat server/logger.ts  # Check maxDays setting
```

### Authentication Issues:
```bash
# Check session store
curl -H "x-api-key: test" http://localhost:3000/api/auth/info

# Verify env variables
echo $SESSION_SECRET
```

---

## 📋 Checklist: Phase-2 Complete

- ✅ Structured JSON logging with Winston
- ✅ Daily log rotation
- ✅ FFmpeg video post-processing
- ✅ Rate limiting (5 presets)
- ✅ Authentication/Authorization system
- ✅ Session management
- ✅ API key support
- ✅ Role-based access control
- ✅ Swagger/OpenAPI documentation
- ✅ Interactive API docs
- ✅ Kubernetes manifests
- ✅ Prometheus monitoring
- ✅ Alert rules
- ✅ Environment variables updated
- ✅ Dependencies added
- ✅ Security hardening

---

**Implementation Date**: January 5, 2026  
**Status**: Phase-2 Complete ✅  
**Ready for**: Production deployment with advanced features 🚀
