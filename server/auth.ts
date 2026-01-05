import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logInfo, logWarn } from './logger';

declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      role: 'admin' | 'user' | 'viewer';
      permissions: string[];
      createdAt: Date;
    }
  }

  namespace Express {
    interface Request {
      user?: Express.User;
      apiKey?: string;
    }
  }
}

// In-memory user store (should be database in production)
const userStore = new Map<string, Express.User>();
const apiKeyStore = new Map<string, Express.User>();
const sessionStore = new Map<string, { user: Express.User; expiresAt: Date }>();

// Default admin user (create on startup)
const defaultAdminUser: Express.User = {
  id: crypto.randomUUID(),
  username: 'admin',
  role: 'admin',
  permissions: ['*'],
  createdAt: new Date(),
};

userStore.set(defaultAdminUser.id, defaultAdminUser);

/**
 * Hash password using SHA-256
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return `sk_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Register new user
 */
export function registerUser(
  username: string,
  password: string,
  role: 'admin' | 'user' | 'viewer' = 'user',
): { user: Express.User; apiKey: string } {
  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const apiKey = generateApiKey();

  const user: Express.User = {
    id: userId,
    username,
    role,
    permissions: getPermissionsByRole(role),
    createdAt: new Date(),
  };

  userStore.set(userId, user);
  apiKeyStore.set(apiKey, user);

  logInfo('New user registered', { username, role });

  return { user, apiKey };
}

/**
 * Get user by ID
 */
export function getUserById(userId: string): Express.User | undefined {
  return userStore.get(userId);
}

/**
 * Get user by API key
 */
export function getUserByApiKey(apiKey: string): Express.User | undefined {
  return apiKeyStore.get(apiKey);
}

/**
 * Get permissions by role
 */
function getPermissionsByRole(role: 'admin' | 'user' | 'viewer'): string[] {
  const permissions: Record<string, string[]> = {
    admin: ['*'],
    user: ['read:runs', 'write:runs', 'read:logs', 'trigger:pipeline'],
    viewer: ['read:runs', 'read:logs'],
  };
  return permissions[role] || [];
}

/**
 * Check if user has permission
 */
export function hasPermission(user: Express.User, requiredPermission: string): boolean {
  if (user.permissions.includes('*')) {
    return true;
  }
  return user.permissions.includes(requiredPermission);
}

/**
 * Create session token
 */
export function createSessionToken(user: Express.User): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  sessionStore.set(token, { user, expiresAt });

  return token;
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): Express.User | null {
  const session = sessionStore.get(token);

  if (!session) {
    return null;
  }

  if (new Date() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }

  return session.user;
}

/**
 * Middleware: Authentication via API key or session
 */
export function authenticateMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Try API key first
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = getUserByApiKey(apiKey);
      if (user) {
        req.user = user;
        req.apiKey = apiKey;
        return next();
      }
    }

    // Try session token
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') as string;
    if (sessionToken) {
      const user = verifySessionToken(sessionToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    logWarn('Authentication failed - no valid credentials provided', {
      hasApiKey: !!apiKey,
      hasSession: !!sessionToken,
      path: req.path,
    });

    res.status(401).json({
      status: 'error',
      message: 'Unauthorized - please provide valid credentials',
    });
  } catch (error) {
    logWarn('Authentication error', { error: String(error) });
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Middleware: Authorization check
 */
export function authorizeMiddleware(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      });
      return;
    }

    if (!hasPermission(req.user, requiredPermission)) {
      logWarn('Authorization failed - insufficient permissions', {
        username: req.user.username,
        requiredPermission,
        userPermissions: req.user.permissions,
        path: req.path,
      });

      res.status(403).json({
        status: 'error',
        message: 'Forbidden - insufficient permissions',
        requiredPermission,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Optional authentication (doesn't fail, just populates req.user if available)
 */
export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Try API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      const user = getUserByApiKey(apiKey);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // Try session token
    const sessionToken = req.headers['authorization']?.replace('Bearer ', '') as string;
    if (sessionToken) {
      const user = verifySessionToken(sessionToken);
      if (user) {
        req.user = user;
        return next();
      }
    }

    // No auth provided, continue
    next();
  } catch (error) {
    logWarn('Optional auth error', { error: String(error) });
    next();
  }
}

/**
 * Get authentication info
 */
export function getAuthInfo() {
  return {
    userCount: userStore.size,
    sessionCount: sessionStore.size,
    apiKeyCount: apiKeyStore.size,
    users: Array.from(userStore.values()).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
    })),
  };
}
