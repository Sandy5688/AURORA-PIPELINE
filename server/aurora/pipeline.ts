import { assertEnv } from './guards/envGuard';
import { createRunId } from './guards/runId';
import { createRunDirs } from './guards/storage';
import { getTopic } from './topic-engine';
import { generateText, validateTextPayload } from './text-engine';
import { generateAudio } from './voice-engine';
import { generateVideo } from './video-engine';
import { dispatch } from './distribution';
import { storage } from '../storage'; // Database storage

export async function runPipeline() {
  assertEnv();
  const runId = createRunId();
  const runDir = createRunDirs(runId);

  // 1. Create Run Record
  const dbRun = await storage.createRun({
    id: runId,
    status: "running",
  });

  const log = async (level: string, message: string, metadata?: any) => {
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
    await storage.createLog({
      runId,
      level,
      message,
      metadata
    });
  };

  try {
    await log('info', 'Pipeline started', { runId, runDir });

    // 2. Topic
    const topic = await getTopic(runId);
    await log('info', 'Topic selected', { topic });

    // 3. Text
    const text = await generateText(topic, runId);
    validateTextPayload(text);
    await storage.createAsset({
      runId,
      type: 'text',
      status: 'generated',
      metadata: text
    });
    await log('info', 'Text generated');

    // 4. Audio
    const audioPath = await generateAudio(text.primary, runId);
    await storage.createAsset({
      runId,
      type: 'audio',
      path: audioPath,
      status: 'generated'
    });
    await log('info', 'Audio generated', { path: audioPath });

    // 5. Video
    const videoPath = await generateVideo(audioPath, runId);
    await storage.createAsset({
      runId,
      type: 'video',
      path: videoPath,
      status: 'generated'
    });
    await log('info', 'Video generated', { path: videoPath });

    // 6. Distribution
    const receipts = await dispatch({ text, audioPath, videoPath, runId });
    await log('info', 'Assets distributed', { receipts });

    // 7. Complete
    await storage.updateRun(runId, {
      status: 'completed',
      completedAt: new Date()
    });
    await log('info', 'Pipeline completed successfully');

  } catch (e: any) {
    console.error(e);
    await log('error', 'Pipeline failed', { error: e.message });
    await storage.updateRun(runId, {
      status: 'failed',
      error: e.message,
      completedAt: new Date()
    });
  }
}
