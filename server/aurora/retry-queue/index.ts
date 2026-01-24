import limits from '../config/limits.json';
import { storage } from '../../storage';
import { generatePayloadHash } from '../utils/hash';

interface RetryContext {
  runId?: string;
  operation?: string;
  payload?: any;
}

export async function withRetry<T>(
  fn: () => Promise<T>, 
  retries = limits.maxRetries,
  context?: RetryContext
): Promise<T> {
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < retries) {
    try {
      return await fn();
    } catch (e: any) {
      lastError = e;
      console.warn(`Retry attempt ${attempt + 1}/${retries}: ${e.message}`);
      
      if (e.rateLimit) {
        await new Promise(r => setTimeout(r, (limits.rateLimitBackoffBaseMs * (2 ** attempt))));
      } else {
        // Exponential backoff for other errors
        await new Promise(r => setTimeout(r, 1000 * (2 ** attempt)));
      }
      attempt++;
    }
  }
  
  // Retries exhausted - persist to DLQ before throwing
  if (context && context.runId && context.operation) {
    try {
      console.error(`[DLQ] Terminal failure after ${retries} retries. Persisting to DLQ...`);
      
      const payloadHash = context.payload ? generatePayloadHash(context.payload) : undefined;
      
      await storage.createDLQEntry({
        runId: context.runId,
        operation: context.operation,
        status: 'pending',
        error: lastError?.message || 'Unknown error after retries',
        payload: context.payload,
        payloadHash,
        maxRetries: limits.maxRetries
      });
      
      console.log(`[DLQ] Entry created for run ${context.runId}, operation: ${context.operation}`);
    } catch (dlqError: any) {
      console.error('[DLQ] Failed to persist to DLQ:', dlqError.message);
      // Don't throw here - we want to throw the original error
    }
  }
  
  throw new Error(`Failed after ${retries} retries: ${lastError?.message || 'Unknown error'}`);
}
