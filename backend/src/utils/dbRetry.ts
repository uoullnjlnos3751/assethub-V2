/**
 * Database connection retry utilities
 * Handles transient connection errors with exponential backoff
 */

export class DBRetryError extends Error {
  constructor(message: string, public readonly originalError: any) {
    super(message);
    this.name = 'DBRetryError';
  }
}

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Retry a database operation with exponential backoff
 * @param operation Async function to retry
 * @param options Retry configuration
 * @returns Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  operationName: string = 'DB operation',
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;

      const error: any = err;
      // Check if it's a connection error
      const isConnectionError =
        error?.message?.includes('Can\'t reach database server') ||
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT') ||
        error?.message?.includes('connection terminated unexpectedly') ||
        error?.code?.includes('P');

      if (!isConnectionError || attempt === config.maxRetries) {
        // Not a connection error or we're out of retries
        throw err;
      }

      // Log retry attempt
      console.warn(
        JSON.stringify({
          type: 'DB_RETRY',
          timestamp: new Date().toISOString(),
          operation: operationName,
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          nextRetryInMs: delay,
          error: error?.message,
        })
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  throw new DBRetryError(
    `${operationName} failed after ${config.maxRetries} retries`,
    lastError
  );
}

/**
 * Check if the error is a transient database connection error
 */
export function isTransientError(err: any): boolean {
  if (!err) return false;

  const errorMessage = String(err?.message || '').toLowerCase();
  const errorCode = String(err?.code || '').toLowerCase();

  return (
    errorMessage.includes('can\'t reach database server') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('etimedout') ||
    errorCode.includes('econnrefused') ||
    errorCode.includes('etimedout') ||
    errorCode.startsWith('p')
  );
}
