# Authentication & Authorization Guide

## Overview

This guide describes the authentication and authorization architecture for Hygieia Platform, a single-tenant application.

**Note:** Hygieia is designed as a single-tenant system. Unlike multi-tenant applications, there is no tenant isolation. All users belong to the same organization and access the same database.

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   User Authentication                      │
├─────────────────────────────────────────────────────────────┤
│ 1. User enters credentials                            │
│ 2. Frontend sends login request to API                 │
│ 3. API validates against Supabase Auth                 │
│ 4. Supabase returns JWT token                          │
│ 5. API returns token to frontend                       │
│ 6. Frontend stores token (localStorage/httpOnly cookie)    │
│ 7. Subsequent requests include Authorization header        │
│ 8. API validates JWT on each protected route              │
└─────────────────────────────────────────────────────────────┘
```

## Supabase Integration

### Environment Configuration

```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

### JWT Verification Middleware

```typescript
// apps/api/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export class AuthMiddleware {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  private jwtSecret = process.env.SUPABASE_JWT_SECRET!;

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
        full_name: user.user_metadata.full_name
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
```

### Role-Based Access Control (RBAC)

```typescript
// apps/api/src/middleware/rbac.ts
export class RBACMiddleware {
  static hasRole(allowedRoles: string[]) {
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
}
```

## User Roles

### System Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| **owner** | Full system access | All permissions |
| **admin** | CRM, proposals, contracts, reporting | CRM, proposals, contracts, reporting |
| **manager** | Estimates, facilities, tasks, cleaners | Estimates, facilities, tasks, cleaners |
| **cleaner** | Assigned work orders only | View and update assigned tasks |

### Role Definition

```typescript
// apps/api/src/types/roles.ts
export type UserRole = 'owner' | 'admin' | 'manager' | 'cleaner';

export interface RolePermissions {
  [key: string]: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  owner: {
    all: true,
    users: true,
    settings: true,
    billing: true
  },
  admin: {
    crm: true,
    proposals: true,
    contracts: true,
    reporting: true,
    users_read: true
  },
  manager: {
    estimates: true,
    facilities: true,
    tasks: true,
    cleaners: true,
    reports_read: true
  },
  cleaner: {
    work_orders: true,
    own_tasks_only: true,
    facilities_read: true
  }
};
```

## Session Management

### Token Configuration

```typescript
// apps/api/src/config/jwt.ts
export const jwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'hygieia-platform',
  audience: 'hygieia-api',
  clockTolerance: 30 // seconds
};
```

### Token Validation

```typescript
// apps/api/src/services/sessionService.ts
export class SessionService {
  static async validateSession(token: string) {
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);

      // Check if user is active
      const { data: user } = await supabase.auth.admin.getUserById(decoded.sub);
      if (!user || user.user?.banned_until) {
        throw new Error('User account is not active');
      }

      return decoded;
    } catch (error) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  static async revokeToken(token: string) {
    const decoded = jwt.decode(token) as { jti: string };

    // Add to revoked tokens with TTL
    await redis.setex(`revoked_token:${decoded.jti}`, 7 * 24 * 60 * 60, 'true');
  }
}
```

## Protected Routes

### Applying Authentication

```typescript
// apps/api/src/routes/leads.ts
import express from 'express';
import { AuthMiddleware } from '../middleware/auth';
import { RBACMiddleware } from '../middleware/rbac';

const router = express.Router();

// Require authentication
router.get(
  '/api/v1/leads',
  AuthMiddleware.verifyToken,
  RBACMiddleware.hasRole(['admin', 'manager']),
  async (req, res) => {
    // Handle request - req.user is available
    const leads = await leadsService.list(req.query, req.user);
    res.json({ data: leads });
  }
);

// Public route (no authentication)
router.post('/api/v1/auth/login', async (req, res) => {
  // Public login endpoint
});
```

## Security Best Practices

### 1. Password Security
- Never store passwords in plain text
- Use bcrypt for password hashing
- Minimum password length: 8 characters
- Enforce complexity requirements

### 2. Token Security
- Use short-lived access tokens (15 minutes)
- Store tokens in httpOnly cookies when possible
- Implement token rotation
- Invalidate tokens on password change
- Store revoked tokens in Redis with TTL

### 3. Authorization Checks
- Always verify user permissions before resource access
- Implement resource ownership checks
- Log all authorization failures
- Use role-based access control consistently

### 4. Session Management
- Implement session timeout
- Provide logout functionality
- Clear tokens on logout
- Track active sessions

## API Authentication Examples

### Login Request

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@hygieia.com",
    "password": "secure_password"
  }'
```

### Protected API Request

```bash
curl -X GET http://localhost:3001/api/v1/leads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Error Handling

### Authentication Errors

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| INVALID_TOKEN | 401 | Token is invalid or expired |
| FORBIDDEN | 403 | User lacks required permissions |
| TOKEN_EXPIRED | 401 | Access token has expired |

### Authorization Errors

| Error Code | HTTP Status | Description |
|-----------|-------------|-------------|
| INSUFFICIENT_SCOPE | 403 | User lacks required role |
| RESOURCE_NOT_OWNED | 403 | User does not own requested resource |

## Testing Authentication

### Unit Tests

```typescript
// apps/api/src/routes/__tests__/auth.test.ts
describe('Authentication Middleware', () => {
  test('should reject requests without token', async () => {
    const response = await request(app)
      .get('/api/v1/leads')
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  test('should reject requests with invalid token', async () => {
    const response = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  test('should reject insufficient role', async () => {
    const cleanerToken = await generateToken('cleaner');

    const response = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${cleanerToken}`)
      .expect(403);

    expect(response.body.error.code).toBe('INSUFFICIENT_SCOPE');
  });
});
```

## Migration Notes

### From Multi-Tenant to Single-Tenant

If migrating from a multi-tenant architecture:

1. **Remove tenant_id** columns from all tables
2. **Simplify RBAC** - Remove tenant context checks
3. **Update middleware** - Remove tenant isolation logic
4. **Simplify queries** - Remove tenant filtering
5. **Update integration** - Use single account for external services (QuickBooks)

For more details, see [Security Implementation Guide](./Security_Implementation_Guide.md).
