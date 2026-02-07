import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { api } from "@shared/routes";
import { startScheduler } from "./aurora/scheduler";
import { startDLQProcessor } from "./aurora/dlq/processor";
import { runPipeline } from "./aurora/pipeline";
import {
  registerUser,
  createSessionToken,
  authenticateMiddleware,
  authorizeMiddleware,
  getAuthInfo,
  hashPassword,
  getUserById,
} from "./auth";
import { logInfo, logError } from "./logger";
import { orbitRouter, checkOrbitHealth } from "./orbit";

// Health check state
let dbHealthy = false;
let schedulerRunning = false;

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

async function seedDatabase() {
  const runs = await storage.getRuns();
  if (runs.length === 0) {
    console.log("Seeding database...");
    const run = await storage.createRun({
      status: "completed"
    });
    await storage.updateRun(run.id, {
      completedAt: new Date()
    });
    await storage.createLog({
      runId: run.id,
      level: "info",
      message: "Pipeline started (Seed Data)"
    });
    await storage.createAsset({
      runId: run.id,
      type: "text",
      status: "generated",
      path: "Seed text content"
    });
    console.log("Database seeded!");
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Health & Readiness Endpoints (added for production)
  app.get('/health', async (req, res) => {
    const healthy = await checkDatabaseHealth();
    dbHealthy = healthy;
    if (healthy) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        reason: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.get('/ready', async (req, res) => {
    const dbReady = await checkDatabaseHealth();
    const schedulerReady = schedulerRunning;

    if (dbReady && schedulerReady) {
      res.status(200).json({
        status: 'ready',
        database: 'connected',
        scheduler: 'running',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        database: dbReady ? 'connected' : 'disconnected',
        scheduler: schedulerReady ? 'running' : 'stopped',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Metrics endpoint (basic)
  app.get('/metrics', async (req, res) => {
    const runs = await storage.getRuns();
    const completedRuns = runs.filter(r => r.status === 'completed').length;
    const failedRuns = runs.filter(r => r.status === 'failed').length;
    const runningRuns = runs.filter(r => r.status === 'running').length;

    res.set('Content-Type', 'text/plain');
    res.send(`# Aurora Pipeline Metrics
# HELP aurora_runs_total Total number of pipeline runs
# TYPE aurora_runs_total gauge
aurora_runs_total{status="completed"} ${completedRuns}
aurora_runs_total{status="failed"} ${failedRuns}
aurora_runs_total{status="running"} ${runningRuns}
aurora_process_uptime_seconds ${process.uptime()}
aurora_nodejs_heap_used_bytes ${process.memoryUsage().heapUsed}
aurora_nodejs_heap_total_bytes ${process.memoryUsage().heapTotal}
`);
  });

  // Seed Data
  await seedDatabase();

  // Start the scheduler and track state
  startScheduler();
  schedulerRunning = true;

  // Start DLQ processor for failed job retries
  startDLQProcessor();

  // Register Orbit layer routes for TrendRadar topic integration
  app.use('/api/orbit', orbitRouter);
  console.log('[Routes] Orbit layer registered at /api/orbit');

  app.get(api.runs.list.path, async (req, res) => {
    const runs = await storage.getRuns();
    res.json(runs);
  });

  app.get(api.runs.get.path, async (req, res) => {
    const run = await storage.getRun(req.params.id);
    if (!run) {
      return res.status(404).json({ message: 'Run not found' });
    }
    const logs = await storage.getLogs(run.id);
    const assets = await storage.getAssets(run.id);
    res.json({ ...run, logs, assets });
  });

  app.post(api.runs.trigger.path, async (req, res) => {
    // Manually trigger the pipeline
    // We don't await this, we just start it
    runPipeline().catch(console.error);
    res.json({ message: "Pipeline triggered", runId: "pending" });
  });

  // Authentication Endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Username and password are required',
        });
      }

      const { user, apiKey } = registerUser(username, password, role || 'user');

      logInfo('New user registered', { username, role: user.role });

      res.status(201).json({
        status: 'success',
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
        apiKey,
      });
    } catch (error) {
      logError('Registration error', error as Error, { body: req.body });
      res.status(500).json({
        status: 'error',
        message: 'Registration failed',
      });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          status: 'error',
          message: 'Username and password are required',
        });
      }

      // TODO: Implement proper user lookup and password verification
      // For now, just create a session for demo purposes
      // In production, hash and verify against database
      const token = createSessionToken({
        id: 'demo-user-id',
        username,
        role: 'user',
        permissions: ['read:runs', 'write:runs'],
        createdAt: new Date(),
      });

      logInfo('User login successful', { username });

      res.json({
        status: 'success',
        token,
        user: {
          username,
          role: 'user',
        },
      });
    } catch (error) {
      logError('Login error', error as Error, { body: req.body });
      res.status(500).json({
        status: 'error',
        message: 'Login failed',
      });
    }
  });

  // Protected endpoint: Get auth info
  app.get('/api/auth/info', authenticateMiddleware, async (req, res) => {
    res.json({
      status: 'success',
      user: req.user,
      authInfo: getAuthInfo(),
    });
  });

  return httpServer;
}
