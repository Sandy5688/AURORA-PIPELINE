import { Request, Response, NextFunction } from 'express';
import { logWarn } from './logger';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

interface ClientRecord {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private store: Map<string, ClientRecord> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later.',
      ...config,
    };

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private getClientKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }
    // Default: use IP address
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime + this.config.windowMs) {
        this.store.delete(key);
      }
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getClientKey(req);
      const now = Date.now();
      let record = this.store.get(key);

      // Initialize or reset record if window expired
      if (!record || now > record.resetTime + this.config.windowMs) {
        record = {
          count: 0,
          resetTime: now,
        };
        this.store.set(key, record);
      }

      // Check if client is temporarily blocked
      if (record.blockedUntil && now < record.blockedUntil) {
        const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
        logWarn('Rate limit exceeded - client blocked', {
          clientKey: key,
          retryAfter,
        });

        res.status(429).set('Retry-After', retryAfter.toString()).json({
          status: 'error',
          message: this.config.message,
          retryAfter,
        });
        return;
      }

      // Increment counter
      record.count++;

      // Add rate limit headers
      const timeUntilReset = Math.ceil(
        (record.resetTime + this.config.windowMs - now) / 1000,
      );
      res.set('X-RateLimit-Limit', this.config.maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, this.config.maxRequests - record.count).toString());
      res.set('X-RateLimit-Reset', new Date(record.resetTime + this.config.windowMs).toISOString());

      // Check if limit exceeded
      if (record.count > this.config.maxRequests) {
        // Block client for 1 minute after first violation
        if (!record.blockedUntil) {
          record.blockedUntil = now + 60000;
          logWarn('Rate limit exceeded - client blocked for 1 minute', {
            clientKey: key,
            requests: record.count,
            limit: this.config.maxRequests,
          });
        }

        res.status(429).set('Retry-After', '60').json({
          status: 'error',
          message: this.config.message,
          retryAfter: 60,
        });
        return;
      }

      next();
    };
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  resetAll(): void {
    this.store.clear();
  }

  getStatus(key: string) {
    return this.store.get(key);
  }
}

// Preset configurations
export const rateLimitPresets = {
  // General API: 100 requests per 15 minutes
  api: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
  },

  // Auth endpoints: 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
  },

  // Webhook endpoints: 1000 requests per 1 hour
  webhook: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 1000,
  },

  // Pipeline triggers: 10 per hour
  pipeline: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 10,
  },

  // Strict for file uploads: 20 per hour
  upload: {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  },
};

// Factory function to create rate limiters
export function createRateLimiter(preset: keyof typeof rateLimitPresets) {
  return new RateLimiter(rateLimitPresets[preset]);
}
