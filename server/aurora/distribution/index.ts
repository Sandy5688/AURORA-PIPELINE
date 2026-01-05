import path from 'path';
import fs from 'fs';

interface DistributionAssets {
  text: any;
  audioPath: string;
  videoPath: string;
  runId: string;
}

interface DistributionReceipt {
  platform: string;
  status: 'delivered' | 'failed' | 'pending';
  runId: string;
  timestamp: string;
  message?: string;
}

async function postToTwitter(assets: DistributionAssets): Promise<DistributionReceipt> {
  const twitterApiKey = process.env.TWITTER_API_KEY;
  const twitterApiSecret = process.env.TWITTER_API_SECRET;

  if (!twitterApiKey || !twitterApiSecret) {
    console.warn('[WARN] Twitter credentials not set, skipping Twitter post');
    return {
      platform: 'twitter',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'Twitter credentials not configured'
    };
  }

  try {
    console.log('[INFO] Posting to Twitter...');
    
    // Tweet content from text derivatives
    const tweetContent = assets.text.derivatives
      .find((d: any) => d.id === 'tweet')?.content || assets.text.primary.substring(0, 280);
    
    // Twitter API v2 endpoint
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${twitterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log(`[OK] Posted to Twitter: ${data.data.id}`);
    
    return {
      platform: 'twitter',
      status: 'delivered',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: `Tweet ID: ${data.data.id}`
    };
  } catch (error: any) {
    console.error('[ERROR] Twitter posting failed:', error.message);
    return {
      platform: 'twitter',
      status: 'failed',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: error.message
    };
  }
}

async function postToYouTube(assets: DistributionAssets): Promise<DistributionReceipt> {
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;

  if (!youtubeApiKey) {
    console.warn('[WARN] YouTube credentials not set, skipping YouTube upload');
    return {
      platform: 'youtube',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'YouTube credentials not configured'
    };
  }

  try {
    console.log('[INFO] Uploading to YouTube...');
    
    // Check if video file exists
    if (!fs.existsSync(assets.videoPath)) {
      throw new Error(`Video file not found: ${assets.videoPath}`);
    }

    // YouTube Data API v3
    const videoTitle = assets.text.derivatives
      .find((d: any) => d.id === 'linkedin')?.content.substring(0, 100) || assets.text.primary.substring(0, 100);
    
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${youtubeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: videoTitle,
          description: assets.text.primary,
          tags: ['aurora', 'generated-content', 'ai'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log(`[OK] Uploaded to YouTube: ${data.id}`);
    
    return {
      platform: 'youtube',
      status: 'delivered',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: `Video ID: ${data.id}`
    };
  } catch (error: any) {
    console.error('[ERROR] YouTube upload failed:', error.message);
    return {
      platform: 'youtube',
      status: 'failed',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: error.message
    };
  }
}

async function postToLinkedIn(assets: DistributionAssets): Promise<DistributionReceipt> {
  const linkedinApiKey = process.env.LINKEDIN_API_KEY;

  if (!linkedinApiKey) {
    console.warn('[WARN] LinkedIn credentials not set, skipping LinkedIn post');
    return {
      platform: 'linkedin',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'LinkedIn credentials not configured'
    };
  }

  try {
    console.log('[INFO] Posting to LinkedIn...');
    
    const linkedinContent = assets.text.derivatives
      .find((d: any) => d.id === 'linkedin')?.content || assets.text.primary;
    
    // LinkedIn API endpoint
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${linkedinApiKey}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202312',
      },
      body: JSON.stringify({
        content: {
          contentEntities: [
            {
              entity: `urn:li:digitalmediaAsset:${assets.runId}`,
            },
          ],
          title: 'Aurora Generated Content',
        },
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetAudiences: [
            {
              seniorities: [],
              industries: [],
              nations: [],
              jobFunctions: [],
            },
          ],
        },
        owner: `urn:li:person:${linkedinApiKey}`,
        text: {
          text: linkedinContent,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json() as any;
    console.log(`[OK] Posted to LinkedIn`);
    
    return {
      platform: 'linkedin',
      status: 'delivered',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: `Post URN: ${data.id}`
    };
  } catch (error: any) {
    console.error('[ERROR] LinkedIn posting failed:', error.message);
    return {
      platform: 'linkedin',
      status: 'failed',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: error.message
    };
  }
}

export async function dispatch(assets: DistributionAssets): Promise<DistributionReceipt[]> {
  console.log(`[INFO] Starting distribution for run: ${assets.runId}`);
  
  const receipts: DistributionReceipt[] = [];

  // Dispatch to enabled platforms
  const twitterReceipt = await postToTwitter(assets);
  receipts.push(twitterReceipt);

  const youtubeReceipt = await postToYouTube(assets);
  receipts.push(youtubeReceipt);

  const linkedinReceipt = await postToLinkedIn(assets);
  receipts.push(linkedinReceipt);

  console.log(`[OK] Distribution completed with ${receipts.filter(r => r.status === 'delivered').length}/${receipts.length} successful posts`);
  
  return receipts;
}
