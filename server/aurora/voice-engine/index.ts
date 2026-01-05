import { withRetry } from '../retry-queue';
import path from 'path';
import fs from 'fs';

export async function generateAudio(text: string, runId: string) {
  return withRetry(async () => {
    const voiceApiKey = process.env.VOICE_API_KEY;
    
    if (!voiceApiKey) {
      console.warn('[WARN] VOICE_API_KEY not set, using mock audio generation');
      // Fallback to mock for demo
      await new Promise(resolve => setTimeout(resolve, 500));
      const filePath = path.join(process.cwd(), 'runs', runId, 'audio', 'main.mp3');
      fs.writeFileSync(filePath, "Mock Audio Content (ElevenLabs disabled)");
      return filePath;
    }

    // Real ElevenLabs API call
    try {
      console.log(`[INFO] Calling ElevenLabs API for voice generation (${text.substring(0, 50)}...)`);
      
      // ElevenLabs API endpoint
      const voiceId = 'pNInz6obpgDQGcFmaJqB'; // Default voice ID
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': voiceApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      // Write audio stream to file
      const buffer = await response.arrayBuffer();
      const filePath = path.join(process.cwd(), 'runs', runId, 'audio', 'main.mp3');
      fs.writeFileSync(filePath, Buffer.from(buffer));
      
      console.log(`[OK] Audio generated successfully: ${filePath}`);
      return filePath;
    } catch (error: any) {
      console.error('[ERROR] ElevenLabs API call failed:', error.message);
      throw error;
    }
  });
}
