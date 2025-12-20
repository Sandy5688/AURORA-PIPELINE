import limits from '../config/limits.json';

export async function withRetry<T>(fn: () => Promise<T>, retries = limits.maxRetries): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (e: any) {
      console.warn(`Retry attempt ${attempt + 1}/${retries}`);
      if (e.rateLimit) {
        await new Promise(r => setTimeout(r, (limits.rateLimitBackoffBaseMs * (2 ** attempt))));
      } else {
        // If it's not a rate limit, maybe we still retry? 
        // For this demo, we retry everything.
        await new Promise(r => setTimeout(r, 1000));
      }
      attempt++;
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}
