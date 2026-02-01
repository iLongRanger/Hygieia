import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';
import { logSecurityEvent } from '../lib/logger';
import type { Request, Response } from 'express';

const RATE_LIMIT_ENABLED = process.env.RATE_LIMIT_ENABLED !== 'false';

// Helper to create Redis store with proper typing
function createRedisStore(prefix: string) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      return redis.call(args[0], ...args.slice(1)) as Promise<number | string>;
    },
    prefix,
  });
}

// Global rate limiter: 100 requests per 15 minutes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMIT_ENABLED,
  store: createRedisStore('ratelimit:global:'),
  handler: (req: Request, res: Response) => {
    logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    });
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests, please try again later',
      },
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// Auth rate limiter: 5 requests per minute (stricter for auth endpoints)
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMIT_ENABLED,
  store: createRedisStore('ratelimit:auth:'),
  handler: (req: Request, res: Response) => {
    logSecurityEvent('auth_rate_limit_exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email ? '[REDACTED]' : undefined,
    });
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts, please try again later',
      },
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

// Sensitive operations rate limiter: 10 requests per minute
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !RATE_LIMIT_ENABLED,
  store: createRedisStore('ratelimit:sensitive:'),
  handler: (req: Request, res: Response) => {
    logSecurityEvent('sensitive_rate_limit_exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests for this operation',
      },
    });
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
