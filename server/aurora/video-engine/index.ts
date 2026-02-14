import path from 'path';
import fs from 'fs';

interface HeyGenVideoResponse {
  error: any;
  data: {
    video_id: string;
  };
}

interface HeyGenStatusResponse {
  error: any;
  data: {
    status: 'processing' | 'completed' | 'failed' | 'pending';
    video_url?: string;
    video_url_caption?: string;
  };
}

async function pollHeyGenVideo(videoId: string, apiKey: string, maxWaitMs: number = 600000): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 15000; // 15 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': apiKey,
        },
      });

      if (!response.ok) {
        console.warn(`[WARN] HeyGen poll error: ${response.status}`);
        await new Promise(r => setTimeout(r, pollInterval));
        continue;
      }

      const result = await response.json() as HeyGenStatusResponse;
      console.log(`[INFO] HeyGen video ${videoId}: ${result.data?.status}`);

      if (result.data?.status === 'completed' && result.data?.video_url) {
        return result.data.video_url;
      }

      if (result.data?.status === 'failed') {
        console.error(`[ERROR] HeyGen video generation failed`);
        return null;
      }

      await new Promise(r => setTimeout(r, pollInterval));
    } catch (err: any) {
      console.warn(`[WARN] HeyGen poll exception: ${err.message}`);
      await new Promise(r => setTimeout(r, pollInterval));
    }
  }

  console.error(`[ERROR] HeyGen video timed out after ${maxWaitMs / 1000}s`);
  return null;
}

export async function generateVideo(audioPath: string, runId: string) {
  const videoApiKey = process.env.VIDEO_API_KEY;

  if (!videoApiKey) {
    console.warn('[WARN] VIDEO_API_KEY not set, using mock video generation');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const filePath = path.join(process.cwd(), 'runs', runId, 'video', 'main.mp4');
    fs.writeFileSync(filePath, "Mock Video Content (HeyGen disabled)");
    return filePath;
  }

  try {
    console.log(`[INFO] Calling HeyGen API for video generation...`);

    // Read the script text for the video
    const textDir = path.join(process.cwd(), 'runs', runId, 'text');
    let scriptText = 'Breaking news from Aurora Content Engine.';

    if (fs.existsSync(textDir)) {
      const textFiles = fs.readdirSync(textDir);
      for (const file of textFiles) {
        if (file.endsWith('.json')) {
          try {
            const textData = JSON.parse(fs.readFileSync(path.join(textDir, file), 'utf-8'));
            const primary = textData.primary || textData.text || '';
            if (primary) {
              scriptText = primary.substring(0, 1500);
              break;
            }
          } catch (e) { }
        }
      }
    }

    // HeyGen v2 - Generate video with avatar
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': videoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: 'Aditya_public_1',  // Aditya in Blue blazer
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: scriptText.substring(0, 1500),
              voice_id: 'd92994ae0de34b2e8659b456a2f388b8', // John Doe (English)
            },
            background: {
              type: 'color',
              value: '#1a1a2e',
            },
          },
        ],
        dimension: {
          width: 720,
          height: 1280, // 720p Vertical for Shorts/Reels (compatible with lower tier plans)
        },
      }),
    });

    const responseText = await response.text();
    console.log(`[DEBUG] HeyGen response: ${response.status} - ${responseText.substring(0, 300)}`);

    if (!response.ok) {
      throw new Error(`HeyGen API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText) as HeyGenVideoResponse;

    if (data.error) {
      throw new Error(`HeyGen error: ${JSON.stringify(data.error)}`);
    }

    const videoId = data.data?.video_id;
    if (!videoId) {
      throw new Error('HeyGen did not return a video_id');
    }

    console.log(`[OK] HeyGen video task created: ${videoId}`);
    console.log(`[INFO] Polling for video completion (may take 2-5 minutes)...`);

    // Poll for completion
    const videoUrl = await pollHeyGenVideo(videoId, videoApiKey);

    if (!videoUrl) {
      console.warn('[WARN] HeyGen video did not complete, using placeholder');
      const filePath = path.join(process.cwd(), 'runs', runId, 'video', 'main.mp4');
      fs.writeFileSync(filePath, "Video generation timed out - placeholder");
      return filePath;
    }

    // Download the generated video
    console.log(`[INFO] Downloading generated video from HeyGen...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const filePath = path.join(process.cwd(), 'runs', runId, 'video', 'main.mp4');
    fs.writeFileSync(filePath, Buffer.from(videoBuffer));

    console.log(`[OK] Video generated and saved: ${filePath} (${(videoBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`);
    return filePath;
  } catch (error: any) {
    console.error('[ERROR] HeyGen video generation failed:', error.message);
    console.log('[INFO] Falling back to mock video generation');

    const filePath = path.join(process.cwd(), 'runs', runId, 'video', 'main.mp4');
    fs.writeFileSync(filePath, "Fallback Mock Video Content");
    return filePath;
  }
}
