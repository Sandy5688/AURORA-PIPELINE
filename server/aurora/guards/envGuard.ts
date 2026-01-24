const REQUIRED = [
  'PIPELINE_ENABLED',
  'MAX_RETRIES',
  'RUN_FREQUENCY',
  'DATABASE_URL',
  'OPENAI_API_KEY'
];

// These can be optional but will log warnings
const OPTIONAL = [
  'VOICE_API_KEY',
  'VIDEO_API_KEY',
  'TWITTER_API_KEY',
  'YOUTUBE_API_KEY'
];

export function assertEnv() {
  const missing = REQUIRED.filter(k => !process.env[k] || process.env[k]!.trim() === '');
  const missingOptional = OPTIONAL.filter(k => !process.env[k]);
  
  // Hard fail on required vars
  if (missing.length) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
    console.error('[FATAL] Service cannot start without required configuration');
    process.exit(1);
  }
  
  // Warn on optional vars
  if (missingOptional.length) {
    console.warn(`[WARN] Missing optional env vars (media features disabled): ${missingOptional.join(', ')}`);
  }
  
  console.log('[OK] All required environment variables present');
}
