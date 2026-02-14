import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

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

// ========== OAuth 1.0a Helpers for Twitter ==========

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  // Sort and encode parameters
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map(key => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBase = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(paramString)}`;

  // Create signing key
  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;

  // Generate HMAC-SHA1 signature
  const hmac = crypto.createHmac('sha1', signingKey);
  hmac.update(signatureBase);
  return hmac.digest('base64');
}

function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string,
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Combine oauth params with any extra params for signature
  const allParams = { ...oauthParams, ...extraParams };
  const signature = generateOAuthSignature(method, url, allParams, consumerSecret, accessTokenSecret);
  oauthParams['oauth_signature'] = signature;

  // Build Authorization header
  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${percentEncode(key)}="${percentEncode(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

// ========== Platform Posting Functions ==========

async function postToTwitter(assets: DistributionAssets): Promise<DistributionReceipt> {
  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    console.warn('[WARN] Twitter OAuth credentials not set, skipping Twitter post');
    return {
      platform: 'twitter',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'Twitter OAuth credentials not configured'
    };
  }

  try {
    console.log('[INFO] Posting to Twitter via OAuth 1.0a...');

    // Extract tweet content from text derivatives
    let tweetContent: string;
    if (assets.text?.derivatives) {
      const tweetDeriv = assets.text.derivatives.find((d: any) => d.id === 'tweet');
      tweetContent = tweetDeriv?.content || '';
    }
    if (!tweetContent) {
      tweetContent = typeof assets.text?.primary === 'string'
        ? assets.text.primary.substring(0, 280)
        : 'Aurora generated content';
    }

    // Ensure tweet is within character limit
    if (tweetContent.length > 280) {
      tweetContent = tweetContent.substring(0, 277) + '...';
    }

    const url = 'https://api.twitter.com/2/tweets';

    const authHeader = generateOAuthHeader(
      'POST',
      url,
      consumerKey,
      consumerSecret,
      accessToken,
      accessTokenSecret
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetContent,
      }),
    });

    const responseText = await response.text();
    console.log(`[DEBUG] Twitter API response: ${response.status} - ${responseText}`);

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log(`[OK] Posted to Twitter: ${data.data?.id}`);

    return {
      platform: 'twitter',
      status: 'delivered',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: `Tweet ID: ${data.data?.id}`
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
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret) {
    console.warn('[WARN] YouTube credentials not set, skipping YouTube upload');
    return {
      platform: 'youtube',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'YouTube credentials not configured'
    };
  }

  if (!refreshToken) {
    console.warn('[WARN] YouTube refresh token not set - OAuth flow needed. Skipping upload.');
    return {
      platform: 'youtube',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'YouTube OAuth refresh token not configured - run OAuth flow first'
    };
  }

  try {
    console.log('[INFO] Uploading to YouTube...');

    // Check if video file exists
    if (!fs.existsSync(assets.videoPath)) {
      throw new Error(`Video file not found: ${assets.videoPath}`);
    }

    // Exchange refresh token for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error(`YouTube token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json() as any;
    const accessToken = tokenData.access_token;

    // YouTube Data API v3
    const videoTitle = assets.text.derivatives
      ?.find((d: any) => d.id === 'linkedin')?.content?.substring(0, 100)
      || (typeof assets.text.primary === 'string' ? assets.text.primary.substring(0, 100) : 'Aurora Content');

    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: videoTitle,
          description: typeof assets.text.primary === 'string' ? assets.text.primary : 'Aurora Generated Content',
          tags: ['aurora', 'ai-generated', 'trending'],
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
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const linkedinPersonId = process.env.LINKEDIN_PERSON_ID;

  if (!accessToken) {
    console.warn('[WARN] LinkedIn access token not set, skipping LinkedIn post');
    return {
      platform: 'linkedin',
      status: 'pending',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: 'LinkedIn access token not configured - run OAuth flow first'
    };
  }

  try {
    console.log('[INFO] Posting to LinkedIn...');

    let linkedinContent: string;
    if (assets.text?.derivatives) {
      const linkedinDeriv = assets.text.derivatives.find((d: any) => d.id === 'linkedin');
      linkedinContent = linkedinDeriv?.content || '';
    }
    if (!linkedinContent) {
      linkedinContent = typeof assets.text?.primary === 'string'
        ? assets.text.primary
        : 'Aurora generated content';
    }

    const authorUrn = linkedinPersonId
      ? `urn:li:person:${linkedinPersonId}`
      : 'urn:li:person:me';

    // LinkedIn Community Management API (v2)
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: linkedinContent,
            },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;
    console.log(`[OK] Posted to LinkedIn`);

    return {
      platform: 'linkedin',
      status: 'delivered',
      runId: assets.runId,
      timestamp: new Date().toISOString(),
      message: `Post ID: ${data.id}`
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
