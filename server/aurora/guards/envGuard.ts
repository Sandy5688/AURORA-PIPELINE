const REQUIRED = [
  'PIPELINE_ENABLED',
  'MAX_RETRIES',
  'RUN_FREQUENCY',
  'DATABASE_URL'
];

// These can be optional but will log warnings
const OPTIONAL = [
  'OPENAI_API_KEY',
  'VOICE_API_KEY',
  'VIDEO_API_KEY'
];

export function assertEnv() {
  const missing = REQUIRED.filter(k => !process.env[k]);
  const missingOptional = OPTIONAL.filter(k => !process.env[k]);
  
  // Hard fail on required vars
  if (missing.length) {
    throw new Error(`[FATAL] Missing required env vars: ${missing.join(', ')}`);
  }
  
  // Warn on optional vars
  if (missingOptional.length) {
    console.warn(`[WARN] Missing optional env vars (media features disabled): ${missingOptional.join(', ')}`);
  }
  
  console.log('[OK] All required environment variables present');
}
