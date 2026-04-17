/**
 * Retry utility with exponential backoff for handling rate limits
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = defaultShouldRetry
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // If this is the last attempt or error shouldn't be retried, throw
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay for next attempt
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

function defaultShouldRetry(error: any): boolean {
  // Retry on rate limit errors (429)
  if (error?.message?.includes('429') || 
      error?.details?.includes('429') || 
      error?.shortMessage?.includes('429') ||
      error?.message?.includes('Too Many Requests')) {
    return true;
  }

  // Retry on network errors
  if (error?.message?.includes('network') || 
      error?.message?.includes('timeout') ||
      error?.message?.includes('ECONNRESET')) {
    return true;
  }

  return false;
}

/**
 * Create a retry wrapper for wagmi write functions
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}
