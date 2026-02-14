import { withRetry } from '../retry-queue';
import path from 'path';
import fs from 'fs';

export async function generateAudio(text: string, runId: string) {
  const voiceApiKey = process.env.VOICE_API_KEY;

  if (!voiceApiKey) {
    console.warn('[WARN] VOICE_API_KEY not set, using mock audio generation');
    await new Promise(resolve => setTimeout(resolve, 500));
    const filePath = path.join(process.cwd(), 'runs', runId, 'audio', 'main.mp3');
    fs.writeFileSync(filePath, "Mock Audio Content (ElevenLabs disabled)");
    return filePath;
  }

  try {
    return await withRetry(async () => {
      console.log(`[INFO] Calling ElevenLabs API for voice generation (${text.substring(0, 50)}...)`);

      // River voice - Relaxed, Neutral, Informative (good for news)
      const voiceId = process.env.ELEVENLABS_VOICE_ID || 'SAz9YHcvj6GT2YYXdXww';
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': voiceApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.substring(0, 5000),
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errBody.substring(0, 200)}`);
      }

      // Write audio to file
      const buffer = await response.arrayBuffer();
      const filePath = path.join(process.cwd(), 'runs', runId, 'audio', 'main.mp3');
      fs.writeFileSync(filePath, Buffer.from(buffer));

      console.log(`[OK] Audio generated successfully: ${filePath} (${(buffer.byteLength / 1024).toFixed(1)}KB)`);
      return filePath;
    }, undefined, {
      runId,
      operation: 'voice_generation',
      payload: { text: text.substring(0, 100) }
    });
  } catch (error: any) {
    // Graceful fallback — don't crash the pipeline
    console.warn(`[WARN] Voice generation failed after retries: ${error.message}`);
    console.warn('[WARN] Falling back to mock audio — pipeline will continue');
    const filePath = path.join(process.cwd(), 'runs', runId, 'audio', 'main.mp3');
    fs.writeFileSync(filePath, "Mock Audio (ElevenLabs failed, pipeline continuing)");
    return filePath;
  }
}
