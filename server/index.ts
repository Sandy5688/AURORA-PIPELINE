import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { logger, logInfo, logError } from "./logger";
import { authenticateMiddleware, optionalAuthMiddleware } from "./auth";
import { setupSwagger } from "./swagger";
import { createRateLimiter, rateLimitPresets } from "./rate-limiter";

// ===== STARTUP VALIDATION (ISSUE #02) =====
function validateStartupConfig() {
  const requiredEnvVars = [
    'OPENAI_API_KEY',
    'DATABASE_URL'
  ];

  const missing: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (!value || value.trim() === '') {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error('╔════════════════════════════════════════════════════════╗');
    console.error('║  [FATAL] STARTUP CONFIG VALIDATION FAILED             ║');
    console.error('╚════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('Missing or empty required environment variables:');
    missing.forEach(varName => {
      console.error(`  ❌ ${varName}`);
    });
    console.error('');
    console.error('Service cannot start without required configuration.');
    console.error('Please set all required environment variables and try again.');
    console.error('');
    
    logError('Startup validation failed - missing required env vars', new Error('Missing env vars'), { missing });
    
    process.exit(1);
  }

  console.log('✓ Startup config validation passed');
  logInfo('Startup config validation passed', { validated: requiredEnvVars });
}

// Run validation before anything else
validateStartupConfig();
// ===== END STARTUP VALIDATION =====

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Setup Swagger/OpenAPI documentation
setupSwagger(app);

// Rate limiters
const apiLimiter = createRateLimiter('api');
const authLimiter = createRateLimiter('auth');
const pipelineLimiter = createRateLimiter('pipeline');

// Apply rate limiting to API endpoints
app.use('/api/', apiLimiter.middleware());
app.use('/api/auth/login', authLimiter.middleware());
app.use('/api/auth/register', authLimiter.middleware());
app.use('/api/runs/trigger', pipelineLimiter.middleware());

// Optional authentication for all API routes
app.use('/api/', optionalAuthMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
      logInfo(logLine, {
        method: req.method,
        path,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
      });
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    logError("Request error", err, { message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      logInfo(`Aurora Pipeline server started on port ${port}`, {
        env: process.env.NODE_ENV,
        port,
      });
    },
  );

  // Graceful shutdown handlers (production readiness)
  process.on('SIGTERM', async () => {
    log('SIGTERM received, starting graceful shutdown...', 'shutdown');
    logInfo('SIGTERM received - graceful shutdown initiated', { signal: 'SIGTERM' });
    httpServer.close(async () => {
      log('HTTP server closed', 'shutdown');
      logInfo('HTTP server closed successfully', {});
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      log('Force shutdown due to timeout', 'shutdown');
      logError('Force shutdown due to timeout', new Error('Graceful shutdown timeout'));
      process.exit(1);
    }, 30000);
  });

  process.on('SIGINT', async () => {
    log('SIGINT received, starting graceful shutdown...', 'shutdown');
    logInfo('SIGINT received - graceful shutdown initiated', { signal: 'SIGINT' });
    httpServer.close(async () => {
      log('HTTP server closed', 'shutdown');
      logInfo('HTTP server closed successfully', {});
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      log('Force shutdown due to timeout', 'shutdown');
      logError('Force shutdown due to timeout', new Error('Graceful shutdown timeout'));
      process.exit(1);
    }, 30000);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`, 'error');
    logError('Uncaught exception', err, { fatal: true });
    console.error(err.stack);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at ${promise}: ${reason}`, 'error');
    logError('Unhandled rejection', new Error(String(reason)), { promise: String(promise) });
    process.exit(1);
  });
})();
