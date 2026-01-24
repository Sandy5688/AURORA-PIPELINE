import { assertEnv } from './guards/envGuard';
import { createRunId } from './guards/runId';
import { createRunDirs } from './guards/storage';
import { getTopic } from './topic-engine';
import { generateText, validateTextPayload } from './text-engine';
import { generateAudio } from './voice-engine';
import { generateVideo } from './video-engine';
import { dispatch } from './distribution';
import { storage } from '../storage'; // Database storage
import { generatePayloadHash } from './utils/hash';

export async function runPipeline() {
  assertEnv();
  const runId = createRunId();
  const runDir = createRunDirs(runId);

  // 1. Create Run Record
  const dbRun = await storage.createRun({
    status: "running",
  });

  const log = async (level: string, message: string, metadata?: any) => {
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
    await storage.createLog({
      runId: dbRun.id,
      level,
      message,
      metadata
    });
  };

  // Helper function to persist job to DLQ on terminal failure
  const persistToDLQ = async (operation: string, error: Error, payload?: any) => {
    try {
      // Check if already exists in DLQ (guard against re-enqueue)
      const exists = await storage.checkDLQExists(dbRun.id, operation);
      if (exists) {
        console.log(`[DLQ_BLOCKED] Job already exists in DLQ: run_id=${dbRun.id}, operation=${operation}`);
        await log('warn', `DLQ entry already exists for ${operation}`, { operation, runId: dbRun.id });
        return;
      }

      const payloadHash = payload ? generatePayloadHash(payload) : undefined;
      
      await storage.createDLQEntry({
        runId: dbRun.id,
        operation,
        status: 'pending',
        error: error.message,
        payload,
        payloadHash,
        maxRetries: 3
      });
      
      console.log(`[DLQ] Persisted failed job: run_id=${dbRun.id}, operation=${operation}`);
      await log('error', `Job persisted to DLQ: ${operation}`, { operation, error: error.message });
    } catch (dlqError: any) {
      console.error('[DLQ] Failed to persist to DLQ:', dlqError.message);
      await log('error', 'Failed to persist to DLQ', { dlqError: dlqError.message });
    }
  };

  try {
    await log('info', 'Pipeline started', { runId, runDir });

    // 2. Topic
    const topic = await getTopic(runId);
    await log('info', 'Topic selected', { topic });

    // 3. Text Generation
    try {
      const text = await generateText(topic, runId);
      validateTextPayload(text);
      await storage.createAsset({
        runId: dbRun.id,
        type: 'text',
        status: 'generated',
        metadata: text
      });
      await log('info', 'Text generated');
    } catch (textError: any) {
      await persistToDLQ('text_generation', textError, { topic });
      throw textError;
    }

    // Get text for next steps
    const textAssets = await storage.getAssets(dbRun.id);
    const textAsset = textAssets.find(a => a.type === 'text');
    if (!textAsset || !textAsset.metadata) {
      throw new Error('Text asset not found');
    }
    const text = textAsset.metadata as any;

    // 4. Audio Generation
    let audioPath: string;
    try {
      audioPath = await generateAudio(text.primary, runId);
      await storage.createAsset({
        runId: dbRun.id,
        type: 'audio',
        path: audioPath,
        status: 'generated'
      });
      await log('info', 'Audio generated', { path: audioPath });
    } catch (audioError: any) {
      await persistToDLQ('voice_generation', audioError, { text: text.primary });
      throw audioError;
    }

    // 5. Video Generation
    let videoPath: string;
    try {
      videoPath = await generateVideo(audioPath, runId);
      await storage.createAsset({
        runId: dbRun.id,
        type: 'video',
        path: videoPath,
        status: 'generated'
      });
      await log('info', 'Video generated', { path: videoPath });
    } catch (videoError: any) {
      await persistToDLQ('video_generation', videoError, { audioPath });
      throw videoError;
    }

    // 6. Distribution
    try {
      const receipts = await dispatch({ text, audioPath, videoPath, runId });
      await log('info', 'Assets distributed', { receipts });
    } catch (distError: any) {
      await persistToDLQ('distribution', distError, { text, audioPath, videoPath });
      throw distError;
    }

    // 7. Complete
    await storage.updateRun(dbRun.id, {
      status: 'completed',
      completedAt: new Date()
    });
    await log('info', 'Pipeline completed successfully');

  } catch (e: any) {
    console.error('[PIPELINE ERROR]', e);
    await log('error', 'Pipeline failed', { error: e.message, stack: e.stack });
    await storage.updateRun(dbRun.id, {
      status: 'failed',
      error: e.message,
      completedAt: new Date()
    });
    
    // Ensure error is logged before process might exit
    throw e;
  }
}
