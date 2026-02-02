/**
 * Frontend logging utility
 * - In development: logs to console
 * - In production: suppresses sensitive details, optionally sends to logging service
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

const isDevelopment = import.meta.env.DEV;

// Sensitive keys to redact in production
const SENSITIVE_KEYS = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'key', 'authorization'];

/**
 * Redact sensitive information from context
 */
function redactSensitive(context: LogContext): LogContext {
  if (isDevelopment) return context;

  const redacted = { ...context };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * Format log message with timestamp
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  // In production, only log warnings and errors to console
  if (!isDevelopment && level !== 'warn' && level !== 'error') {
    return;
  }

  const formattedMessage = formatMessage(level, message);
  const safeContext = context ? redactSensitive(context) : undefined;

  const logFn = console[level] || console.log;

  if (safeContext && Object.keys(safeContext).length > 0) {
    logFn(formattedMessage, safeContext);
  } else {
    logFn(formattedMessage);
  }

  // In production, could send to logging service
  // if (!isDevelopment && (level === 'error' || level === 'warn')) {
  //   sendToLoggingService({ level, message, context: safeContext });
  // }
}

/**
 * Logger instance with typed methods
 */
export const logger = {
  /**
   * Debug level - only shown in development
   */
  debug: (message: string, context?: LogContext): void => {
    log('debug', message, context);
  },

  /**
   * Info level - only shown in development
   */
  info: (message: string, context?: LogContext): void => {
    log('info', message, context);
  },

  /**
   * Warning level - shown in all environments
   */
  warn: (message: string, context?: LogContext): void => {
    log('warn', message, context);
  },

  /**
   * Error level - shown in all environments
   * Use for caught exceptions and error states
   */
  error: (message: string, context?: LogContext): void => {
    log('error', message, context);
  },

  /**
   * Log API errors with safe context
   */
  apiError: (message: string, error: unknown, context?: LogContext): void => {
    const errorContext: LogContext = {
      ...context,
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    // In development, include stack trace
    if (isDevelopment && error instanceof Error) {
      errorContext.stack = error.stack;
    }

    log('error', message, errorContext);
  },
};

export default logger;
