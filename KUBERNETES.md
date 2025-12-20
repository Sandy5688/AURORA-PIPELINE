# Kubernetes Deployment Guide

This document provides Kubernetes manifest templates for deploying Aurora Pipeline.

## Prerequisites

- Kubernetes cluster (1.24+)
- kubectl configured
- PostgreSQL instance or separate PostgreSQL chart
- Image registry (Docker Hub, ECR, GCR, etc.)

## Namespace Setup

```bash
# Create namespace
kubectl create namespace aurora

# Set as default namespace
kubectl config set-context --current --namespace=aurora
```

## ConfigMap and Secrets

### ConfigMap (Non-sensitive Configuration)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: aurora-config
  namespace: aurora
data:
  NODE_ENV: "production"
  PIPELINE_ENABLED: "true"
  RUN_FREQUENCY: "0 */12 * * *"
  LOG_LEVEL: "info"
  DB_MAX_CONNECTIONS: "10"
```

### Secret (Sensitive Configuration)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aurora-secrets
  namespace: aurora
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:password@postgres-service:5432/aurora_pipeline
  OPENAI_API_KEY: sk-proj-xxxxxxxxxxxx
  ELEVENLABS_API_KEY: sk_xxxxxxxxxxxxxxx
  RUNWAYML_API_KEY: xxxxxxxxxxxxxxx
```

### Create Secrets from Command Line

```bash
# Create secret
kubectl create secret generic aurora-secrets \
  --from-literal=DATABASE_URL=postgresql://user:pass@postgres:5432/db \
  --from-literal=OPENAI_API_KEY=sk-xxx \
  -n aurora

# Create from .env file
kubectl create secret generic aurora-secrets \
  --from-env-file=.env \
  -n aurora

# View secrets
kubectl get secrets -n aurora
```

## PostgreSQL Deployment (Optional)

If not using external PostgreSQL:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: aurora
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: aurora
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: aurora_pipeline
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "aurora"]
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command: ["pg_isready", "-U", "aurora"]
          initialDelaySeconds: 5
          periodSeconds: 10
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: aurora
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: postgres
  type: ClusterIP
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: aurora
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Aurora Application Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aurora-app
  namespace: aurora
  labels:
    app: aurora
    version: v1
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: aurora
  template:
    metadata:
      labels:
        app: aurora
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
    spec:
      serviceAccountName: aurora
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
      - name: aurora
        image: aurora-pipeline:latest
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: aurora-config
              key: NODE_ENV
        - name: PIPELINE_ENABLED
          valueFrom:
            configMapKeyRef:
              name: aurora-config
              key: PIPELINE_ENABLED
        - name: RUN_FREQUENCY
          valueFrom:
            configMapKeyRef:
              name: aurora-config
              key: RUN_FREQUENCY
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: DATABASE_URL
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: OPENAI_API_KEY
        - name: ELEVENLABS_API_KEY
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: ELEVENLABS_API_KEY
        - name: RUNWAYML_API_KEY
          valueFrom:
            secretKeyRef:
              name: aurora-secrets
              key: RUNWAYML_API_KEY
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        volumeMounts:
        - name: runs
          mountPath: /app/runs
        - name: logs
          mountPath: /app/logs
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: false
          capabilities:
            drop:
            - ALL
      volumes:
      - name: runs
        persistentVolumeClaim:
          claimName: aurora-runs-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: aurora-logs-pvc
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - aurora
              topologyKey: kubernetes.io/hostname
---
apiVersion: v1
kind: Service
metadata:
  name: aurora-service
  namespace: aurora
  labels:
    app: aurora
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: aurora
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: aurora-runs-pvc
  namespace: aurora
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: aurora-logs-pvc
  namespace: aurora
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aurora
  namespace: aurora
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: aurora-role
  namespace: aurora
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: aurora-rolebinding
  namespace: aurora
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: aurora-role
subjects:
- kind: ServiceAccount
  name: aurora
  namespace: aurora
```

## Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aurora-hpa
  namespace: aurora
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aurora-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
      - type: Pods
        value: 2
        periodSeconds: 15
      selectPolicy: Max
```

## Ingress Configuration

### NGINX Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aurora-ingress
  namespace: aurora
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - aurora.example.com
    secretName: aurora-tls
  rules:
  - host: aurora.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aurora-service
            port:
              number: 80
```

## Monitoring with Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: aurora-monitor
  namespace: aurora
spec:
  selector:
    matchLabels:
      app: aurora
  endpoints:
  - port: http
    interval: 30s
    path: /metrics
```

## Deployment Instructions

```bash
# 1. Create namespace
kubectl create namespace aurora

# 2. Create secrets
kubectl create secret generic aurora-secrets \
  --from-literal=DATABASE_URL=postgresql://user:pass@postgres:5432/db \
  --from-literal=OPENAI_API_KEY=sk-xxx \
  -n aurora

# 3. Create ConfigMap
kubectl apply -f configmap.yaml

# 4. Deploy PostgreSQL (if needed)
kubectl apply -f postgres-deployment.yaml

# 5. Deploy application
kubectl apply -f aurora-deployment.yaml

# 6. Deploy autoscaler
kubectl apply -f hpa.yaml

# 7. Deploy ingress
kubectl apply -f ingress.yaml

# 8. Verify deployment
kubectl get pods -n aurora
kubectl get services -n aurora
kubectl get ingress -n aurora

# 9. Check logs
kubectl logs -n aurora deployment/aurora-app

# 10. Port forward (if needed)
kubectl port-forward -n aurora svc/aurora-service 3000:80
```

## Scaling Operations

```bash
# Manual scaling
kubectl scale deployment aurora-app --replicas=5 -n aurora

# View scaling status
kubectl get hpa -n aurora

# Watch autoscaling in action
kubectl get hpa aurora-hpa -n aurora -w
```

## Updates and Rollbacks

```bash
# Update image
kubectl set image deployment/aurora-app \
  aurora=aurora-pipeline:v2.0.0 \
  -n aurora

# Check rollout status
kubectl rollout status deployment/aurora-app -n aurora

# View rollout history
kubectl rollout history deployment/aurora-app -n aurora

# Rollback to previous version
kubectl rollout undo deployment/aurora-app -n aurora

# Rollback to specific revision
kubectl rollout undo deployment/aurora-app --to-revision=2 -n aurora
```

## Debugging

```bash
# Get pod details
kubectl describe pod <pod-name> -n aurora

# View logs
kubectl logs <pod-name> -n aurora

# Stream logs
kubectl logs -f <pod-name> -n aurora

# Execute commands in pod
kubectl exec -it <pod-name> -n aurora -- /bin/sh

# Port forward for testing
kubectl port-forward <pod-name> 3000:3000 -n aurora

# Check resource usage
kubectl top pods -n aurora
kubectl top nodes
```

## Cleanup

```bash
# Delete deployment
kubectl delete deployment aurora-app -n aurora

# Delete all aurora resources
kubectl delete all -l app=aurora -n aurora

# Delete namespace
kubectl delete namespace aurora

# Delete persistent volumes
kubectl delete pvc -n aurora --all
```

## Best Practices

1. **Use ResourceQuotas**: Limit resource consumption per namespace
2. **Network Policies**: Restrict traffic between pods
3. **Pod Disruption Budgets**: Ensure minimum availability during disruptions
4. **Probes**: Configure liveness and readiness probes
5. **RBAC**: Use least privilege principle for service accounts
6. **Monitoring**: Integrate with Prometheus/Grafana
7. **Logging**: Use centralized logging (ELK, Loki, etc.)
8. **Secrets Management**: Use sealed secrets or external secret operators
9. **Image Registry**: Use private registries with authentication
10. **Backup**: Regular backups of persistent data

---

For more information, see the main [README.md](README.md) and [DOCKER.md](DOCKER.md)
