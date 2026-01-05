# Hygieia Platform - Integration Specifications & Error Handling

## Overview

This specification defines integration requirements, error handling strategies, and implementation patterns for all external services integrated with Hygieia Platform.

## Integration Architecture

### Service Integration Patterns

```
Hygieia API
├── Authentication (Supabase)
├── Email Service (Resend)
├── Accounting (QuickBooks Online)
├── File Storage (S3-compatible)
├── Analytics (Optional)
└── Webhooks (Various)
```

### Integration Principles

1. **Circuit Breaker Pattern:** Prevent cascade failures
2. **Retry with Exponential Backoff:** Handle transient failures
3. **Graceful Degradation:** Core features work when integrations fail
4. **Comprehensive Logging:** All integration events tracked
5. **Error Bubbling:** Integration errors surface with context

## QuickBooks Online Integration

### Configuration

```typescript
// apps/api/src/services/quickbooks/config.ts
export interface QuickBooksConfig {
  environment: 'sandbox' | 'production';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  refreshToken: string;
  accessToken: string;
  realmId: string;
  minorVersion: string;
}

export const quickBooksConfig = {
  sandbox: {
    baseUrl: 'https://sandbox-quickbooks.api.intuit.com',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2'
  },
  production: {
    baseUrl: 'https://quickbooks.api.intuit.com',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2'
  }
};
```

### OAuth2 Implementation

```typescript
// apps/api/src/services/quickbooks/auth.ts
import { QuickBooksConfig } from './config';
import { RedisService } from '../redis';
import { SecurityLogger } from '../security';

export class QuickBooksAuthService {
  private config: QuickBooksConfig;
  private redis = RedisService.getInstance();

  constructor(config: QuickBooksConfig) {
    this.config = config;
  }

  async getAuthUrl(tenantId: string): Promise<string> {
    const state = this.generateState(tenantId);
    await this.redis.setex(`qb_state:${state}`, 600, JSON.stringify({ tenantId }));

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope.join(' '),
      response_type: 'code',
      state
    });

    return `${this.config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<TokenResponse> {
    try {
      // Validate state parameter
      const storedState = await this.redis.get(`qb_state:${state}`);
      if (!storedState) {
        throw new QuickBooksError('INVALID_STATE', 'Invalid or expired state parameter');
      }

      await this.redis.del(`qb_state:${state}`);

      // Exchange authorization code
      const response = await this.makeTokenRequest(code);
      
      await SecurityLogger.logSecurityEvent('QUICKBOOKS_AUTH_SUCCESS', {
        tenantId: JSON.parse(storedState).tenantId,
        realmId: response.realmId
      });

      return response;
    } catch (error) {
      await SecurityLogger.logSecurityEvent('QUICKBOOKS_AUTH_FAILED', {
        error: error.message,
        code
      });
      throw error;
    }
  }

  async refreshToken(tenantId: string): Promise<string> {
    try {
      const tokenData = await this.getStoredTokenData(tenantId);
      
      if (!tokenData) {
        throw new QuickBooksError('TOKEN_NOT_FOUND', 'No refresh token available');
      }

      const response = await this.makeRefreshRequest(tokenData.refreshToken);
      
      // Update stored tokens
      await this.updateTokenData(tenantId, {
        ...tokenData,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || tokenData.refreshToken,
        expiresAt: Date.now() + (response.expiresIn * 1000)
      });

      return response.accessToken;
    } catch (error) {
      await SecurityLogger.logSecurityEvent('QUICKBOOKS_TOKEN_REFRESH_FAILED', {
        tenantId,
        error: error.message
      });
      
      // Invalidate stored tokens on refresh failure
      await this.invalidateTokens(tenantId);
      throw new QuickBooksError('TOKEN_REFRESH_FAILED', 'Failed to refresh access token');
    }
  }

  private async makeTokenRequest(code: string): Promise<TokenResponse> {
    const response = await fetch(`${this.config.baseUrl}/oauth2/v2/tokens/bearer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new QuickBooksError(
        'TOKEN_EXCHANGE_FAILED',
        'Failed to exchange authorization code',
        error
      );
    }

    return response.json();
  }
}
```

### Customer Synchronization

```typescript
// apps/api/src/services/quickbooks/customers.ts
export class QuickBooksCustomerService {
  private auth: QuickBooksAuthService;
  private retryPolicy: RetryPolicy;

  constructor(auth: QuickBooksAuthService) {
    this.auth = auth;
    this.retryPolicy = new RetryPolicy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    });
  }

  async createCustomer(tenantId: string, accountData: AccountCreateInput): Promise<QuickBooksCustomer> {
    return this.retryPolicy.execute(async () => {
      try {
        const accessToken = await this.auth.getValidToken(tenantId);
        const realmId = await this.auth.getRealmId(tenantId);

        const qbCustomer = this.mapAccountToQuickBooks(accountData);
        
        const response = await fetch(
          `${this.config.baseUrl}/v3/company/${realmId}/customer?minorversion=${this.config.minorVersion}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(qbCustomer)
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw this.handleQuickBooksError(error, 'create_customer');
        }

        const result = await response.json();
        const customer = result.Customer;

        // Store QuickBooks customer ID in our database
        await this.updateAccountQboId(accountData.id, customer.Id);

        await SecurityLogger.logSecurityEvent('QUICKBOOKS_CUSTOMER_CREATED', {
          tenantId,
          customerId: customer.Id,
          accountId: accountData.id
        });

        return customer;
      } catch (error) {
        if (error instanceof QuickBooksError) {
          throw error;
        }
        
        throw new QuickBooksError(
          'CUSTOMER_CREATE_FAILED',
          'Failed to create customer in QuickBooks',
          { originalError: error.message }
        );
      }
    });
  }

  async getCustomer(tenantId: string, qboCustomerId: string): Promise<QuickBooksCustomer> {
    return this.retryPolicy.execute(async () => {
      try {
        const accessToken = await this.auth.getValidToken(tenantId);
        const realmId = await this.auth.getRealmId(tenantId);

        const response = await fetch(
          `${this.config.baseUrl}/v3/company/${realmId}/customer/${qboCustomerId}?minorversion=${this.config.minorVersion}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );

        if (response.status === 404) {
          throw new QuickBooksError('CUSTOMER_NOT_FOUND', 'Customer not found in QuickBooks');
        }

        if (!response.ok) {
          const error = await response.json();
          throw this.handleQuickBooksError(error, 'get_customer');
        }

        const result = await response.json();
        return result.Customer;
      } catch (error) {
        if (error instanceof QuickBooksError) {
          throw error;
        }
        
        throw new QuickBooksError(
          'CUSTOMER_GET_FAILED',
          'Failed to retrieve customer from QuickBooks',
          { originalError: error.message }
        );
      }
    });
  }

  private handleQuickBooksError(error: any, operation: string): QuickBooksError {
    const errorCode = error.Fault?.Error?.[0]?.code;
    const errorMessage = error.Fault?.Error?.[0]?.message;

    switch (errorCode) {
      case '3100': // Token expired
        return new QuickBooksError('TOKEN_EXPIRED', 'Access token has expired');
      
      case '3200': // Authentication failed
        return new QuickBooksError('AUTHENTICATION_FAILED', 'QuickBooks authentication failed');
      
      case '6100': // Rate limit exceeded
        return new QuickBooksError('RATE_LIMIT_EXCEEDED', 'QuickBooks API rate limit exceeded');
      
      case '6240': // Customer not found
        return new QuickBooksError('CUSTOMER_NOT_FOUND', 'Customer not found');
      
      case '6245': // Validation error
        return new QuickBooksError('VALIDATION_ERROR', 'Customer data validation failed', {
          details: errorMessage
        });
      
      default:
        return new QuickBooksError(
          'UNKNOWN_QUICKBOOKS_ERROR',
          `QuickBooks error during ${operation}`,
          { errorCode, errorMessage }
        );
    }
  }
}
```

## Email Service Integration (Resend)

### Configuration

```typescript
// apps/api/src/services/email/config.ts
export interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyToEmail?: string;
}

export class EmailService {
  private config: EmailConfig;
  private retryPolicy: RetryPolicy;

  constructor(config: EmailConfig) {
    this.config = config;
    this.retryPolicy = new RetryPolicy({
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 8000
    });
  }

  async sendEmail(template: EmailTemplate): Promise<EmailResponse> {
    return this.retryPolicy.execute(async () => {
      try {
        const emailPayload = this.buildEmailPayload(template);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailPayload)
        });

        if (!response.ok) {
          const error = await response.json();
          throw this.handleResendError(error);
        }

        const result = await response.json();
        
        await SecurityLogger.logSecurityEvent('EMAIL_SENT', {
          template: template.templateId,
          recipient: template.to,
          emailId: result.id
        });

        return result;
      } catch (error) {
        await SecurityLogger.logSecurityEvent('EMAIL_SEND_FAILED', {
          template: template.templateId,
          recipient: template.to,
          error: error.message
        });
        throw error;
      }
    });
  }

  async sendBulkEmails(templates: EmailTemplate[]): Promise<BulkEmailResponse> {
    const results = await Promise.allSettled(
      templates.map(template => this.sendEmail(template))
    );

    const successful = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<EmailResponse>[];
    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];

    return {
      sent: successful.length,
      failed: failed.length,
      total: templates.length,
      failures: failed.map(f => ({
        template: templates[results.indexOf(f)].templateId,
        error: f.reason.message
      }))
    };
  }

  private handleResendError(error: any): EmailError {
    const errorCode = error.error?.code;
    const errorMessage = error.error?.message;

    switch (errorCode) {
      case 'invalid_api_key':
        return new EmailError('INVALID_API_KEY', 'Invalid Resend API key');
      
      case 'rate_limit_exceeded':
        return new EmailError('RATE_LIMIT_EXCEEDED', 'Resend API rate limit exceeded');
      
      case 'invalid_email':
        return new EmailError('INVALID_EMAIL', 'Invalid email address', {
          details: errorMessage
        });
      
      case 'invalid_template':
        return new EmailError('INVALID_TEMPLATE', 'Invalid email template', {
          details: errorMessage
        });
      
      default:
        return new EmailError(
          'UNKNOWN_EMAIL_ERROR',
          'Unknown email service error',
          { errorCode, errorMessage }
        );
    }
  }
}
```

## File Storage Integration (S3)

### Configuration

```typescript
// apps/api/src/services/storage/config.ts
export interface StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string; // For S3-compatible services
  encryptionKey: string;
}

export class StorageService {
  private config: StorageConfig;
  private s3Client: AWS.S3;

  constructor(config: StorageConfig) {
    this.config = config;
    this.s3Client = new AWS.S3({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      region: config.region,
      endpoint: config.endpoint
    });
  }

  async uploadFile(file: FileUpload, options?: UploadOptions): Promise<FileUploadResult> {
    try {
      // Generate unique key
      const key = this.generateFileKey(file, options);
      
      // Encrypt file if required
      const buffer = await this.processFile(file, options);

      // Upload to S3
      const uploadResult = await this.s3Client.upload({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: file.uploadedBy,
          tenantId: file.tenantId
        },
        ServerSideEncryption: 'AES256'
      }).promise();

      // Store file metadata in database
      const fileRecord = await this.createFileRecord({
        key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: buffer.length,
        url: uploadResult.Location,
        tenantId: file.tenantId,
        uploadedBy: file.uploadedBy
      });

      await SecurityLogger.logSecurityEvent('FILE_UPLOADED', {
        fileId: fileRecord.id,
        key,
        size: buffer.length,
        tenantId: file.tenantId
      });

      return {
        id: fileRecord.id,
        key,
        url: uploadResult.Location,
        size: buffer.length,
        mimeType: file.mimetype
      };
    } catch (error) {
      await SecurityLogger.logSecurityEvent('FILE_UPLOAD_FAILED', {
        filename: file.originalname,
        tenantId: file.tenantId,
        error: error.message
      });
      
      throw new StorageError(
        'FILE_UPLOAD_FAILED',
        'Failed to upload file to storage',
        { originalError: error.message }
      );
    }
  }

  async downloadFile(key: string, tenantId: string): Promise<FileDownloadResult> {
    try {
      // Verify tenant access
      const fileRecord = await this.getFileRecord(key, tenantId);
      if (!fileRecord) {
        throw new StorageError('FILE_NOT_FOUND', 'File not found or access denied');
      }

      // Get file from S3
      const s3Object = await this.s3Client.getObject({
        Bucket: this.config.bucket,
        Key: key
      }).promise();

      // Decrypt if encrypted
      const buffer = await this.decryptFile(s3Object.Body as Buffer);

      await SecurityLogger.logSecurityEvent('FILE_DOWNLOADED', {
        fileId: fileRecord.id,
        key,
        tenantId
      });

      return {
        buffer,
        filename: fileRecord.originalName,
        mimeType: fileRecord.mimeType,
        size: buffer.length
      };
    } catch (error) {
      await SecurityLogger.logSecurityEvent('FILE_DOWNLOAD_FAILED', {
        key,
        tenantId,
        error: error.message
      });
      
      throw new StorageError(
        'FILE_DOWNLOAD_FAILED',
        'Failed to download file from storage',
        { originalError: error.message }
      );
    }
  }
}
```

## Error Handling Patterns

### Circuit Breaker Implementation

```typescript
// apps/api/src/services/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: CircuitBreakerOptions,
    private serviceName: string
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitBreakerError(
          'CIRCUIT_OPEN',
          `Service ${this.serviceName} is temporarily unavailable`
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker OPEN for service: ${this.serviceName}`);
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }
}
```

### Retry Policy

```typescript
// apps/api/src/services/retryPolicy.ts
export class RetryPolicy {
  constructor(private options: RetryOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.options.maxRetries) {
      return false;
    }

    // Don't retry on client errors
    if (error instanceof QuickBooksError && error.isClientError()) {
      return false;
    }

    if (error instanceof EmailError && error.isClientError()) {
      return false;
    }

    // Retry on network errors and 5xx
    return this.isRetryableError(error);
  }

  private calculateDelay(attempt: number): number {
    const delay = this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt);
    return Math.min(delay, this.options.maxDelay);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

## Integration Monitoring

### Health Checks

```typescript
// apps/api/src/services/healthChecks.ts
export class IntegrationHealthChecks {
  constructor(
    private quickBooksService: QuickBooksService,
    private emailService: EmailService,
    private storageService: StorageService
  ) {}

  async runAllHealthChecks(): Promise<HealthCheckResult> {
    const checks = await Promise.allSettled([
      this.checkQuickBooks(),
      this.checkEmailService(),
      this.checkStorageService()
    ]);

    return {
      overall: this.calculateOverallHealth(checks),
      services: {
        quickbooks: this.getCheckResult(checks[0]),
        email: this.getCheckResult(checks[1]),
        storage: this.getCheckResult(checks[2])
      },
      timestamp: new Date().toISOString()
    };
  }

  private async checkQuickBooks(): Promise<ServiceHealth> {
    try {
      const response = await this.quickBooksService.healthCheck();
      return {
        status: 'healthy',
        responseTime: response.responseTime,
        details: response
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }

  private async checkEmailService(): Promise<ServiceHealth> {
    try {
      const response = await this.emailService.healthCheck();
      return {
        status: 'healthy',
        responseTime: response.responseTime,
        details: response
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        lastChecked: new Date().toISOString()
      };
    }
  }
}
```

## Webhook Handling

### Webhook Endpoints

```typescript
// apps/api/src/routes/webhooks.ts
router.post('/quickbooks', 
  validateWebhookSignature,
  handleQuickBooksWebhook
);

router.post('/stripe',
  validateWebhookSignature,
  handleStripeWebhook
);

async function handleQuickBooksWebhook(req: Request, res: Response) {
  try {
    const event = req.body;
    
    // Process different event types
    switch (event.eventNotification?.data?.entity?.type) {
      case 'Customer':
        await processCustomerEvent(event);
        break;
      
      case 'Invoice':
        await processInvoiceEvent(event);
        break;
      
      default:
        console.log('Unhandled QuickBooks webhook event:', event);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    await SecurityLogger.logSecurityEvent('WEBHOOK_PROCESSING_FAILED', {
      service: 'quickbooks',
      error: error.message,
      event: req.body
    });
    
    res.status(500).json({
      error: {
        code: 'WEBHOOK_PROCESSING_FAILED',
        message: 'Failed to process webhook'
      }
    });
  }
}
```

---

**This integration specification is mandatory for all external service integrations. All implementations must follow these patterns exactly. Any deviations require integration team approval.**