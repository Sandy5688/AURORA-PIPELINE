import crypto from 'crypto';

/**
 * Generate a hash for payload deduplication in DLQ
 */
export function generatePayloadHash(payload: any): string {
  const payloadString = JSON.stringify(payload);
  return crypto.createHash('sha256').update(payloadString).digest('hex');
}
