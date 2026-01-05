# Hygieia Platform - Security Implementation Guide

## Overview

This guide provides comprehensive security specifications and implementation requirements for the Hygieia Platform, covering authentication, authorization, data protection, and security monitoring.

## Security Architecture

### Security Layers

1. **Network Security** - TLS, firewalls, VPC isolation
2. **Application Security** - Authentication, authorization, input validation
3. **Data Security** - Encryption at rest and in transit
4. **Infrastructure Security** - Container security, secrets management
5. **Operational Security** - Monitoring, logging, incident response

## Authentication & Authorization

### Supabase Auth Integration

#### JWT Verification Middleware

```javascript
// middleware/auth.js
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

class AuthMiddleware {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.jwtSecret = process.env.SUPABASE_JWT_SECRET;
  }

  async verifyToken(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authorization header required',
            details: { reason: 'missing_authorization_header' }
          }
        });
      }

      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, this.jwtSecret);

      // Verify token with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
            details: { reason: 'token_verification_failed' }
          }
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        role: user.user_metadata.role,
        tenant_id: user.user_metadata.tenant_id
      };

      next();
    } catch (error) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token validation failed',
          details: { reason: error.message }
        }
      });
    }
  }
}

module.exports = new AuthMiddleware();
```

#### Role-Based Access Control (RBAC)

```javascript
// middleware/rbac.js
class RBACMiddleware {
  static hasRole(allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            details: {
              required_role: allowedRoles.join(' OR '),
              current_role: req.user.role
            }
          }
        });
      }

      next();
    };
  }

  static canAccessResource(resourceType, action) {
    return async (req, res, next) => {
      const userRole = req.user.role;
      const userId = req.user.id;
      const tenantId = req.user.tenant_id;

      // Check resource ownership for cleaners
      if (userRole === 'cleaner' && action === 'read') {
        const resourceId = req.params.id;
        const hasAccess = await this.checkCleanerResourceAccess(
          userId, 
          resourceId, 
          resourceType, 
          tenantId
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied to this resource',
              details: { reason: 'resource_not_assigned_to_cleaner' }
            }
          });
        }
      }

      // Set tenant context for database queries
      req.tenantId = tenantId;
      next();
    };
  }

  static async checkCleanerResourceAccess(userId, resourceId, resourceType, tenantId) {
    // Check if resource is assigned to this cleaner
    switch (resourceType) {
      case 'work_order':
        const workOrder = await db.query(
          'SELECT id FROM work_orders WHERE id = $1 AND assigned_cleaner_id = $2 AND tenant_id = $3',
          [resourceId, userId, tenantId]
        );
        return workOrder.rows.length > 0;
      
      case 'facility_task':
        const facilityTask = await db.query(
          `SELECT ft.id FROM facility_tasks ft
           JOIN work_orders wo ON ft.work_order_id = wo.id
           WHERE ft.id = $1 AND wo.assigned_cleaner_id = $2 AND wo.tenant_id = $3`,
          [resourceId, userId, tenantId]
        );
        return facilityTask.rows.length > 0;
      
      default:
        return false;
    }
  }
}

module.exports = RBACMiddleware;
```

### Session Management

#### Token Configuration

```javascript
// config/jwt.js
module.exports = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'hygieia-platform',
  audience: 'hygieia-api',
  clockTolerance: 30 // seconds
};
```

#### Session Validation

```javascript
// services/sessionService.js
class SessionService {
  static async validateSession(token) {
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
      
      // Check if session is revoked
      const revokedSession = await redis.get(`revoked_token:${decoded.jti}`);
      if (revokedSession) {
        throw new Error('Token has been revoked');
      }

      // Check user status
      const user = await db.query(
        'SELECT status FROM users WHERE supabase_user_id = $1',
        [decoded.sub]
      );

      if (user.rows[0]?.status !== 'active') {
        throw new Error('User account is not active');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  static async revokeToken(jti) {
    // Add to revoked tokens with TTL
    await redis.setex(`revoked_token:${jti}`, 7 * 24 * 60 * 60, 'true');
  }
}
```

## Data Protection

### Encryption at Rest

#### Database Encryption

```sql
-- Enable Transparent Data Encryption (TDE) for sensitive columns
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypted email storage
ALTER TABLE users ADD COLUMN email_encrypted BYTEA;
UPDATE users SET email_encrypted = pgp_sym_encrypt(email, current_setting('app.encryption_key'));

-- Function to encrypt/decrypt emails
CREATE OR REPLACE FUNCTION encrypt_email(email TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(email, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_email(encrypted_email BYTEA)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_email, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### File Storage Encryption

```javascript
// services/encryptionService.js
const crypto = require('crypto');
const algorithm = 'aes-256-gcm';

class EncryptionService {
  static encryptBuffer(buffer) {
    const key = Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  static decryptBuffer(encryptedData, iv, authTag) {
    const key = Buffer.from(process.env.FILE_ENCRYPTION_KEY, 'hex');
    const decipher = crypto.createDecipher(algorithm, key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    return Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);
  }
}

module.exports = EncryptionService;
```

### Encryption in Transit

#### TLS Configuration

```javascript
// config/ssl.js
module.exports = {
  // Production SSL configuration
  production: {
    key: fs.readFileSync('/etc/ssl/certs/hygieia.key'),
    cert: fs.readFileSync('/etc/ssl/certs/hygieia.crt'),
    ca: fs.readFileSync('/etc/ssl/certs/ca-bundle.crt'),
    minVersion: 'TLSv1.2',
    ciphers: [
      'ECDHE-ECDSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-ECDSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-ECDSA-CHACHA20-POLY1305',
      'ECDHE-RSA-CHACHA20-POLY1305'
    ].join(':'),
    honorCipherOrder: true,
    rejectUnauthorized: true
  }
};
```

## Input Validation & Sanitization

### Request Validation

```javascript
// middleware/validation.js
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

class ValidationMiddleware {
  static validate(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: {
              errors: error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                code: detail.type
              }))
            }
          }
        });
      }

      // Sanitize HTML content
      req.body = this.sanitizeInput(value);
      next();
    };
  }

  static sanitizeInput(data) {
    if (typeof data === 'string') {
      return DOMPurify.sanitize(data, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: []
      });
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    if (data && typeof data === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return data;
  }
}

// Validation schemas
const schemas = {
  createLead: Joi.object({
    company_name: Joi.string().max(255).allow(null),
    contact_name: Joi.string().required().max(255),
    primary_email: Joi.string().email().allow(null),
    primary_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow(null),
    notes: Joi.string().max(5000).allow(null),
    lead_source_id: Joi.string().uuid().allow(null)
  }),

  createFacility: Joi.object({
    name: Joi.string().required().max(255),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zip: Joi.string().required(),
      country: Joi.string().default('US')
    }).required(),
    square_feet: Joi.number().positive().allow(null),
    access_instructions: Joi.string().max(2000).allow(null)
  })
};

module.exports = { ValidationMiddleware, schemas };
```

### SQL Injection Prevention

```javascript
// services/databaseService.js
class DatabaseService {
  static async safeQuery(sql, params = []) {
    try {
      // Use parameterized queries only
      const result = await db.query(sql, params);
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        sql: sql.replace(/\s+/g, ' ').trim(),
        params: params.map(p => typeof p === 'string' ? '[REDACTED]' : p),
        error: error.message
      });
      throw error;
    }
  }

  // Example safe query method
  static async getLeadsByTenant(tenantId, filters = {}) {
    const whereClauses = ['tenant_id = $1'];
    const queryParams = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      whereClauses.push(`status = $${paramIndex++}`);
      queryParams.push(filters.status);
    }

    if (filters.search) {
      whereClauses.push(`(
        company_name ILIKE $${paramIndex++} OR 
        contact_name ILIKE $${paramIndex++} OR 
        primary_email ILIKE $${paramIndex++}
      )`);
      const searchTerm = `%${filters.search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const sql = `
      SELECT id, company_name, contact_name, primary_email, status, created_at
      FROM leads
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY created_at DESC
    `;

    return this.safeQuery(sql, queryParams);
  }
}
```

## Rate Limiting & DDoS Protection

### Rate Limiting Configuration

```javascript
// middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('redis');

const redis = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
});

const rateLimitConfig = {
  // General API rate limiting
  general: rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:general:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        details: { retryAfter: 900 }
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Authentication endpoints
  auth: rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 20, // 20 auth attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication attempts',
        details: { retryAfter: 900 }
      }
    }
  }),

  // File upload endpoints
  upload: rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rl:upload:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    keyGenerator: (req) => req.user?.id || req.ip,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Upload limit exceeded',
        details: { retryAfter: 3600 }
      }
    }
  })
};

module.exports = rateLimitConfig;
```

### IP-based Protection

```javascript
// middleware/ipProtection.js
const geoip = require('geoip-lite');

class IPProtectionMiddleware {
  static async blockSuspiciousIPs(req, res, next) {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check IP reputation
    const isBlocked = await this.checkIPReputation(clientIP);
    if (isBlocked) {
      return res.status(403).json({
        error: {
          code: 'IP_BLOCKED',
          message: 'Access from this IP is not allowed'
        }
      });
    }

    // Check geolocation restrictions (if applicable)
    const geo = geoip.lookup(clientIP);
    if (this.isRestrictedCountry(geo?.country)) {
      return res.status(403).json({
        error: {
          code: 'GEO_BLOCKED',
          message: 'Access from this location is not allowed'
        }
      });
    }

    // Track request patterns
    await this.trackRequestPattern(clientIP, req.path);
    next();
  }

  static async checkIPReputation(ip) {
    const key = `ip:reputation:${ip}`;
    const reputation = await redis.get(key);
    
    if (reputation) {
      const data = JSON.parse(reputation);
      return data.blocked || data.score < -50;
    }

    return false;
  }

  static isRestrictedCountry(country) {
    const restrictedCountries = process.env.RESTRICTED_COUNTRIES?.split(',') || [];
    return restrictedCountries.includes(country);
  }
}
```

## Security Monitoring & Logging

### Security Event Logging

```javascript
// services/securityLogger.js
class SecurityLogger {
  static async logSecurityEvent(eventType, details, req = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      details,
      ip_address: req?.ip,
      user_agent: req?.get('User-Agent'),
      user_id: req?.user?.id,
      tenant_id: req?.user?.tenant_id,
      session_id: req?.sessionID,
      request_id: req?.id
    };

    // Log to structured logger
    logger.warn('Security Event', logEntry);

    // Store in security events table
    await db.query(`
      INSERT INTO security_events (
        event_type, details, ip_address, user_agent, 
        user_id, tenant_id, session_id, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      eventType, JSON.stringify(details), logEntry.ip_address,
      logEntry.user_agent, logEntry.user_id, logEntry.tenant_id,
      logEntry.session_id, logEntry.request_id
    ]);

    // Send alerts for critical events
    if (this.isCriticalEvent(eventType)) {
      await this.sendSecurityAlert(logEntry);
    }
  }

  static isCriticalEvent(eventType) {
    const criticalEvents = [
      'UNAUTHORIZED_ACCESS_ATTEMPT',
      'PRIVILEGE_ESCALATION',
      'DATA_EXFILTRATION_ATTEMPT',
      'SUSPICIOUS_PATTERN_DETECTED',
      'BRUTE_FORCE_ATTACK'
    ];
    return criticalEvents.includes(eventType);
  }

  static async sendSecurityAlert(logEntry) {
    // Send to Slack/email monitoring
    await alertService.send({
      channel: '#security-alerts',
      message: `🚨 Critical Security Event: ${logEntry.event_type}`,
      details: logEntry
    });
  }
}

// Security event types
const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  TOKEN_REVOKED: 'TOKEN_REVOKED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PRIVILEGE_ESCALATION: 'PRIVILEGE_ESCALATION',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_IP: 'SUSPICIOUS_IP_DETECTED',
  BRUTE_FORCE: 'BRUTE_FORCE_ATTACK',
  SQL_INJECTION_ATTEMPT: 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT: 'XSS_ATTEMPT'
};

module.exports = { SecurityLogger, SECURITY_EVENTS };
```

### Intrusion Detection

```javascript
// services/intrusionDetection.js
class IntrusionDetectionService {
  static async detectAnomalies(req, res, next) {
    const userId = req.user?.id;
    const clientIP = req.ip;
    const userAgent = req.get('User-Agent');

    // Check for multiple failed login attempts
    if (this.isAuthenticationEndpoint(req.path)) {
      const failedAttempts = await this.getFailedLoginAttempts(clientIP);
      if (failedAttempts > 5) {
        await SecurityLogger.logSecurityEvent('BRUTE_FORCE_ATTACK', {
          ip_address: clientIP,
          failed_attempts: failedAttempts,
          time_window: '15 minutes'
        }, req);
        
        // Block IP temporarily
        await this.blockIPTemporarily(clientIP, 15 * 60); // 15 minutes
      }
    }

    // Check for suspicious request patterns
    const suspiciousPatterns = await this.detectSuspiciousPatterns(userId, clientIP);
    if (suspiciousPatterns.length > 0) {
      await SecurityLogger.logSecurityEvent('SUSPICIOUS_PATTERN_DETECTED', {
        patterns: suspiciousPatterns,
        risk_score: this.calculateRiskScore(suspiciousPatterns)
      }, req);
    }

    // Check for data access anomalies
    if (this.isDataAccessEndpoint(req.path)) {
      const dataAnomaly = await this.detectDataAccessAnomaly(userId, req.method, req.path);
      if (dataAnomaly) {
        await SecurityLogger.logSecurityEvent('DATA_EXFILTRATION_ATTEMPT', {
          anomaly_type: dataAnomaly.type,
          baseline_access: dataAnomaly.baseline,
          current_access: dataAnomaly.current
        }, req);
      }
    }

    next();
  }

  static async getFailedLoginAttempts(ip) {
    const key = `login_attempts:${ip}`;
    const attempts = await redis.lrange(key, 0, -1);
    const recent = attempts.filter(time => Date.now() - parseInt(time) < 15 * 60 * 1000);
    
    // Update redis with recent attempts only
    await redis.del(key);
    if (recent.length > 0) {
      await redis.lpush(key, ...recent);
      await redis.expire(key, 15 * 60);
    }
    
    return recent.length;
  }

  static async blockIPTemporarily(ip, duration) {
    await redis.setex(`blocked_ip:${ip}`, duration, 'true');
  }

  static calculateRiskScore(patterns) {
    const riskWeights = {
      'UNUSUAL_ACCESS_TIME': 3,
      'UNUSUAL_LOCATION': 5,
      'HIGH_DATA_VOLUME': 4,
      'UNUSUAL_ENDPOINTS': 3,
      'RAPID_REQUESTS': 2
    };

    return patterns.reduce((total, pattern) => {
      return total + (riskWeights[pattern.type] || 1);
    }, 0);
  }
}
```

## Secrets Management

### Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hygieia
DB_ENCRYPTION_KEY=your-32-character-hex-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# File Encryption
FILE_ENCRYPTION_KEY=your-64-character-hex-key

# External Services
QUICKBOOKS_CLIENT_ID=your-qb-client-id
QUICKBOOKS_CLIENT_SECRET=your-qb-client-secret
RESEND_API_KEY=your-resend-api-key

# Security
JWT_SECRET=your-jwt-secret
RESTRICTED_COUNTRIES=CN,RU,KP,NP
RATE_LIMIT_REDIS_URL=redis://localhost:6379
```

### AWS Secrets Manager Integration

```javascript
// services/secretsManager.js
class SecretsManager {
  static async getSecret(secretName) {
    if (process.env.NODE_ENV === 'production') {
      // Use AWS Secrets Manager in production
      const AWS = require('aws-sdk');
      const secretsManager = new AWS.SecretsManager();
      
      const data = await secretsManager.getSecretValue({
        SecretId: secretName
      }).promise();
      
      return JSON.parse(data.SecretString);
    } else {
      // Use environment variables in development
      return process.env[secretName.toUpperCase()];
    }
  }

  static async initializeSecrets() {
    const secrets = await this.getSecret('hygieia-secrets');
    
    // Set process environment variables
    Object.keys(secrets).forEach(key => {
      process.env[key] = secrets[key];
    });
  }
}
```

## Security Headers & CORS

### Security Headers Middleware

```javascript
// middleware/securityHeaders.js
const helmet = require('helmet');

const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.API_BASE_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

module.exports = securityHeaders;
```

### CORS Configuration

```javascript
// middleware/cors.js
const cors = require('cors');

const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://app.hygieia.com',
      'https://admin.hygieia.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ];

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Trace-ID'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Trace-ID'],
  maxAge: 86400 // 24 hours
});

module.exports = corsConfig;
```

## Security Testing

### Security Test Suite

```javascript
// tests/security/auth.test.js
describe('Security Authentication Tests', () => {
  test('should reject requests without token', async () => {
    const response = await request(app)
      .get('/api/v1/leads')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.error.details.reason).toBe('missing_authorization_header');
  });

  test('should reject invalid tokens', async () => {
    const response = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  test('should prevent privilege escalation', async () => {
    const cleanerToken = await generateToken('cleaner');
    
    const response = await request(app)
      .delete('/api/v1/users/some-user-id')
      .set('Authorization', `Bearer ${cleanerToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

// tests/security/inputValidation.test.js
describe('Input Validation Tests', () => {
  test('should sanitize HTML input', async () => {
    const maliciousInput = {
      name: '<script>alert("xss")</script>',
      notes: '<img src=x onerror=alert("xss")>'
    };

    const response = await request(app)
      .post('/api/v1/leads')
      .send(maliciousInput)
      .expect(200);

    // Verify HTML tags are stripped
    expect(response.body.data.name).toBe('alert("xss")');
    expect(response.body.data.notes).toBe('');
  });

  test('should prevent SQL injection', async () => {
    const sqlInjection = {
      search: "'; DROP TABLE leads; --"
    };

    const response = await request(app)
      .get('/api/v1/leads')
      .query(sqlInjection)
      .expect(200);

    // Verify leads table still exists
    const leadsCount = await db.query('SELECT COUNT(*) FROM leads');
    expect(leadsCount.rows[0].count).toBeGreaterThan(0);
  });
});
```

---

**This security implementation guide is mandatory. All security features must be implemented exactly as specified. Any deviations require security team approval.**