# Hygieia Platform - API Error Handling Specification

## Overview

This specification defines comprehensive error handling standards for the Hygieia Platform REST API to ensure consistent, secure, and debuggable error responses across all endpoints.

## Error Response Format

### Standard Error Response Structure

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": {
      "field": "string",
      "reason": "string",
      "request_id": "string"
    },
    "timestamp": "ISO8601",
    "path": "string"
  },
  "meta": {
    "request_id": "string",
    "trace_id": "string"
  }
}
```

### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| error.code | string | Yes | Machine-readable error code |
| error.message | string | Yes | Human-readable error message |
| error.details | object | No | Additional error context |
| error.details.field | string | No | Field name for validation errors |
| error.details.reason | string | No | Specific reason for failure |
| error.timestamp | string | Yes | ISO8601 timestamp |
| error.path | string | Yes | Request path |
| meta.request_id | string | Yes | Unique request identifier |
| meta.trace_id | string | Yes | Distributed tracing ID |

## HTTP Status Code Mappings

### Client Errors (4xx)

| Status | Error Code | Description |
|--------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request body or parameters |
| 401 | UNAUTHORIZED | Authentication required or failed |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict or duplicate |
| 422 | UNPROCESSABLE_ENTITY | Validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 400 | INVALID_TOKEN | Expired or invalid JWT |
| 403 | INSUFFICIENT_SCOPE | User lacks required role |

### Server Errors (5xx)

| Status | Error Code | Description |
|--------|------------|-------------|
| 500 | INTERNAL_SERVER_ERROR | Unexpected server error |
| 502 | BAD_GATEWAY | External service unavailable |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |
| 504 | GATEWAY_TIMEOUT | External service timeout |

## Validation Errors

### Field Validation Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "code": "INVALID_EMAIL"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters",
          "code": "PASSWORD_TOO_SHORT"
        }
      ]
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/auth/login"
  },
  "meta": {
    "request_id": "req_123456789",
    "trace_id": "trace_987654321"
  }
}
```

### Validation Error Codes

| Field | Code | Description |
|-------|------|-------------|
| email | INVALID_EMAIL | Invalid email format |
| email | EMAIL_REQUIRED | Email field required |
| password | PASSWORD_TOO_SHORT | Password minimum length |
| password | PASSWORD_WEAK | Password strength insufficient |
| phone | INVALID_PHONE | Invalid phone format |
| required | FIELD_REQUIRED | Required field missing |
| format | INVALID_FORMAT | Invalid field format |

## Authentication & Authorization Errors

### Authentication Error Response

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "reason": "missing_authorization_header",
      "hint": "Include 'Authorization: Bearer <token>' header"
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/users"
  }
}
```

### Authorization Error Response

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions",
    "details": {
      "required_role": "admin",
      "current_role": "manager",
      "action": "delete_user"
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/users/123"
  }
}
```

## Rate Limiting

### Rate Limit Response

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_time": "2024-01-04T16:00:00Z",
      "retry_after": 1800
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/leads"
  }
}
```

### Rate Limiting Headers

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Request limit per window |
| X-RateLimit-Remaining | Remaining requests |
| X-RateLimit-Reset | Reset time (Unix timestamp) |
| Retry-After | Seconds to wait before retry |

## Business Logic Errors

### Business Rule Violation

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "Pricing override requires admin approval",
    "details": {
      "rule": "pricing_override_requires_approval",
      "current_user_role": "manager",
      "approval_required": true,
      "approver_role": "admin"
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/proposals/123/pricing"
  }
}
```

### Resource State Error

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Cannot transition lead from 'lost' to 'proposal_sent'",
    "details": {
      "current_state": "lost",
      "target_state": "proposal_sent",
      "valid_transitions": ["lost", "reopened"]
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/leads/123"
  }
}
```

## External Service Errors

### QuickBooks Integration Error

```json
{
  "error": {
    "code": "EXTERNAL_SERVICE_ERROR",
    "message": "QuickBooks service unavailable",
    "details": {
      "service": "quickbooks",
      "error_code": "QB-503",
      "retry_suggested": true,
      "max_retries": 3,
      "backoff_seconds": 60
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/integrations/quickbooks/sync"
  }
}
```

### Email Service Error

```json
{
  "error": {
    "code": "EMAIL_DELIVERY_FAILED",
    "message": "Failed to send proposal email",
    "details": {
      "recipient": "client@example.com",
      "template": "proposal_sent",
      "error_code": "RESend-422",
      "retry_possible": true
    },
    "timestamp": "2024-01-04T15:30:00Z",
    "path": "/api/v1/proposals/123/send"
  }
}
```

## Error Handling Implementation

### Middleware Structure

```javascript
// Error handling middleware
const errorHandler = (err, req, res, next) => {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const traceId = req.headers['x-trace-id'] || generateTraceId();
  
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let errorMessage = 'An unexpected error occurred';
  let details = {};
  
  // Handle specific error types
  if (err instanceof ValidationError) {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Request validation failed';
    details.errors = err.details;
  } else if (err instanceof AuthenticationError) {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    errorMessage = 'Authentication required';
    details.reason = err.reason;
  } else if (err instanceof AuthorizationError) {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    errorMessage = 'Insufficient permissions';
    details = err.details;
  }
  
  // Log error
  logger.error('API Error', {
    error: err.message,
    stack: err.stack,
    requestId,
    traceId,
    path: req.path,
    method: req.method,
    statusCode
  });
  
  // Send error response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage,
      details,
      timestamp: new Date().toISOString(),
      path: req.path
    },
    meta: {
      request_id: requestId,
      trace_id: traceId
    }
  });
};
```

## Client-Side Error Handling

### Error Response Processing

```javascript
// Client-side error handler
class ApiErrorHandler {
  static handleError(error) {
    if (!error.response) {
      // Network error
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        retryable: true
      };
    }
    
    const { status, data } = error.response;
    const { error: errorData } = data;
    
    switch (status) {
      case 401:
        return {
          type: 'AUTHENTICATION_ERROR',
          message: 'Please log in again',
          action: 'redirect_to_login',
          retryable: false
        };
      
      case 403:
        return {
          type: 'AUTHORIZATION_ERROR',
          message: 'You do not have permission for this action',
          retryable: false
        };
      
      case 422:
        return {
          type: 'VALIDATION_ERROR',
          message: errorData.message,
          fieldErrors: errorData.details.errors,
          retryable: true
        };
      
      case 429:
        return {
          type: 'RATE_LIMIT_ERROR',
          message: 'Too many requests',
          retryAfter: errorData.details.retry_after,
          retryable: true
        };
      
      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred',
          retryable: true
        };
    }
  }
}
```

## Monitoring & Alerting

### Error Metrics

Track the following metrics:

1. **Error Rate by Endpoint**
   - 4xx errors per minute
   - 5xx errors per minute
   - Error rate percentage

2. **Error Response Time**
   - Average error response time
   - P95 error response time

3. **Error Distribution**
    - Top error codes by frequency
    - Error rate by user role

4. **External Service Errors**
   - QuickBooks error rate
   - Email service error rate
   - Storage service error rate

### Alert Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| 5xx error rate | > 5% | Critical |
| 4xx error rate | > 20% | High |
| Authentication errors | > 50/hour | Medium |
| External service errors | > 10/min | High |
| Response time (errors) | > 5s | Medium |

## Security Considerations

### Information Disclosure

- Never expose internal system details
- Sanitize error messages for external users
- Log full error details but send sanitized responses
- Include request IDs for debugging

### Error Injection Prevention

- Validate all error inputs
- Sanitize user-provided data in error messages
- Prevent error message injection attacks
- Rate limit error endpoints

## Testing Error Scenarios

### Required Error Tests

1. **Authentication Errors**
   - Missing token
   - Invalid token
   - Expired token
   - Malformed token

2. **Authorization Errors**
   - Insufficient role
   - Cross-tenant access attempt
   - Resource ownership check

3. **Validation Errors**
   - Required fields missing
   - Invalid formats
   - Business rule violations

4. **External Service Errors**
   - Service unavailable
   - Timeout scenarios
   - Rate limiting

5. **Edge Cases**
   - Database connection errors
   - Memory constraints
   - File upload failures

---

**This specification is mandatory for all API development. Any deviation requires explicit architectural approval.**