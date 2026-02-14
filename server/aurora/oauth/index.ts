import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const oauthRouter = Router();

// ========== YouTube OAuth 2.0 Flow ==========

oauthRouter.get('/youtube/auth', (req: Request, res: Response) => {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'YOUTUBE_CLIENT_ID not configured' });
    }

    // Determine redirect URI based on host
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/oauth/youtube/callback`;

    const scope = [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube',
    ].join(' ');

    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    console.log(`[OAuth/YouTube] Redirecting to Google consent screen`);
    console.log(`[OAuth/YouTube] Callback URL: ${redirectUri}`);

    res.redirect(authUrl.toString());
});

oauthRouter.get('/youtube/callback', async (req: Request, res: Response) => {
    const { code, error } = req.query;

    if (error) {
        return res.status(400).send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#ff4444;">❌ YouTube OAuth Error</h1>
        <p>Error: ${error}</p>
        <a href="/api/oauth/youtube/auth" style="color:#4ecdc4;">Try again</a>
      </body></html>
    `);
    }

    if (!code) {
        return res.status(400).send('Missing authorization code');
    }

    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'YouTube client credentials not configured' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/oauth/youtube/callback`;

    try {
        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code as string,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }).toString(),
        });

        const tokenData = await tokenResponse.json() as any;

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
        }

        const refreshToken = tokenData.refresh_token;
        const accessToken = tokenData.access_token;

        console.log(`[OAuth/YouTube] ✅ Token exchange successful!`);
        console.log(`[OAuth/YouTube] Refresh token obtained: ${refreshToken ? 'YES' : 'NO'}`);

        // Save the refresh token to a file for persistence
        const tokenFile = path.join('/app', 'oauth-tokens.json');
        let tokens: any = {};
        if (fs.existsSync(tokenFile)) {
            tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
        }
        tokens.youtube = {
            refreshToken,
            accessToken,
            obtainedAt: new Date().toISOString(),
        };
        fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));

        // Also set in process.env for immediate use
        if (refreshToken) {
            process.env.YOUTUBE_REFRESH_TOKEN = refreshToken;
        }

        res.send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#4ecdc4;">✅ YouTube Connected!</h1>
        <p style="color:#aaa;">Refresh token saved. Aurora can now upload videos to YouTube.</p>
        <pre style="background:#16213e;padding:15px;border-radius:8px;color:#4ecdc4;overflow-x:auto;">
Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'NOT PROVIDED (access_type may need "offline")'}
Access Token: ${accessToken ? accessToken.substring(0, 20) + '...' : 'NONE'}
        </pre>
        <p><strong>⚠️ IMPORTANT:</strong> Add this to your server <code>.env</code> file for persistence across restarts:</p>
        <pre style="background:#16213e;padding:15px;border-radius:8px;color:#ffd93d;">YOUTUBE_REFRESH_TOKEN=${refreshToken || 'TOKEN_NOT_PROVIDED'}</pre>
        <br/>
        <a href="/api/oauth/linkedin/auth" style="color:#4ecdc4;font-size:18px;">→ Next: Connect LinkedIn</a>
      </body></html>
    `);
    } catch (err: any) {
        console.error('[OAuth/YouTube] Token exchange error:', err.message);
        res.status(500).send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#ff4444;">❌ YouTube Token Error</h1>
        <p>${err.message}</p>
        <a href="/api/oauth/youtube/auth" style="color:#4ecdc4;">Try again</a>
      </body></html>
    `);
    }
});

// ========== LinkedIn OAuth 2.0 Flow ==========

oauthRouter.get('/linkedin/auth', (req: Request, res: Response) => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'LINKEDIN_CLIENT_ID not configured' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/oauth/linkedin/callback`;

    const scope = 'openid profile w_member_social';
    const state = crypto.randomBytes(16).toString('hex');

    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);

    console.log(`[OAuth/LinkedIn] Redirecting to LinkedIn consent screen`);
    console.log(`[OAuth/LinkedIn] Callback URL: ${redirectUri}`);

    res.redirect(authUrl.toString());
});

oauthRouter.get('/linkedin/callback', async (req: Request, res: Response) => {
    const { code, error, error_description } = req.query;

    if (error) {
        return res.status(400).send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#ff4444;">❌ LinkedIn OAuth Error</h1>
        <p>Error: ${error} - ${error_description}</p>
        <a href="/api/oauth/linkedin/auth" style="color:#4ecdc4;">Try again</a>
      </body></html>
    `);
    }

    if (!code) {
        return res.status(400).send('Missing authorization code');
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'LinkedIn client credentials not configured' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.get('x-forwarded-proto') || 'http';
    const redirectUri = `${protocol}://${host}/api/oauth/linkedin/callback`;

    try {
        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code as string,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }).toString(),
        });

        const tokenData = await tokenResponse.json() as any;

        if (!tokenResponse.ok) {
            throw new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`);
        }

        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in; // Usually 60 days

        console.log(`[OAuth/LinkedIn] ✅ Token exchange successful!`);
        console.log(`[OAuth/LinkedIn] Token expires in: ${expiresIn} seconds`);

        // Get the user's LinkedIn profile (person ID)
        let personId = '';
        try {
            const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` },
            });
            const profileData = await profileResponse.json() as any;
            personId = profileData.sub || '';
            console.log(`[OAuth/LinkedIn] Person ID: ${personId}`);
        } catch (profileErr: any) {
            console.warn('[OAuth/LinkedIn] Could not fetch profile:', profileErr.message);
        }

        // Save the access token
        const tokenFile = path.join('/app', 'oauth-tokens.json');
        let tokens: any = {};
        if (fs.existsSync(tokenFile)) {
            tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
        }
        tokens.linkedin = {
            accessToken,
            personId,
            expiresIn,
            obtainedAt: new Date().toISOString(),
        };
        fs.writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));

        // Set in process.env for immediate use
        process.env.LINKEDIN_ACCESS_TOKEN = accessToken;
        if (personId) {
            process.env.LINKEDIN_PERSON_ID = personId;
        }

        const expiryDate = new Date(Date.now() + expiresIn * 1000).toISOString().split('T')[0];

        res.send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#4ecdc4;">✅ LinkedIn Connected!</h1>
        <p style="color:#aaa;">Access token saved. Aurora can now post to LinkedIn.</p>
        <pre style="background:#16213e;padding:15px;border-radius:8px;color:#4ecdc4;overflow-x:auto;">
Access Token: ${accessToken.substring(0, 20)}...
Person ID: ${personId || 'Unknown'}
Expires: ${expiryDate} (~60 days)
        </pre>
        <p><strong>⚠️ IMPORTANT:</strong> Add these to your server <code>.env</code> file for persistence:</p>
        <pre style="background:#16213e;padding:15px;border-radius:8px;color:#ffd93d;">LINKEDIN_ACCESS_TOKEN=${accessToken}
LINKEDIN_PERSON_ID=${personId}</pre>
        <br/>
        <h2 style="color:#4ecdc4;">🎉 All Platforms Configured!</h2>
        <p>Aurora is now connected to:</p>
        <ul>
          <li>✅ Twitter/X (OAuth 1.0a - waiting for credits)</li>
          <li>✅ YouTube (OAuth 2.0)</li>
          <li>✅ LinkedIn (OAuth 2.0)</li>
        </ul>
      </body></html>
    `);
    } catch (err: any) {
        console.error('[OAuth/LinkedIn] Token exchange error:', err.message);
        res.status(500).send(`
      <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
        <h1 style="color:#ff4444;">❌ LinkedIn Token Error</h1>
        <p>${err.message}</p>
        <a href="/api/oauth/linkedin/auth" style="color:#4ecdc4;">Try again</a>
      </body></html>
    `);
    }
});

// ========== Status Page ==========

oauthRouter.get('/status', async (req: Request, res: Response) => {
    const twitter = !!(process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_ACCESS_TOKEN);
    const youtube = !!(process.env.YOUTUBE_REFRESH_TOKEN);
    const linkedin = !!(process.env.LINKEDIN_ACCESS_TOKEN);

    // Load saved tokens if available
    const tokenFile = path.join('/app', 'oauth-tokens.json');
    let savedTokens: any = {};
    if (fs.existsSync(tokenFile)) {
        try {
            savedTokens = JSON.parse(fs.readFileSync(tokenFile, 'utf-8'));
        } catch (e) { }
    }

    const youtubeFromFile = !!savedTokens.youtube?.refreshToken;
    const linkedinFromFile = !!savedTokens.linkedin?.accessToken;

    res.send(`
    <html><body style="font-family:monospace;padding:40px;background:#1a1a2e;color:#e0e0e0;">
      <h1 style="color:#4ecdc4;">🔐 Aurora OAuth Status</h1>
      <table style="border-collapse:collapse;width:100%;max-width:600px;">
        <tr style="border-bottom:1px solid #333;">
          <td style="padding:12px;">Twitter/X</td>
          <td style="padding:12px;">${twitter ? '✅ Connected' : '❌ Not Connected'}</td>
          <td style="padding:12px;color:#888;">OAuth 1.0a (needs API credits)</td>
        </tr>
        <tr style="border-bottom:1px solid #333;">
          <td style="padding:12px;">YouTube</td>
          <td style="padding:12px;">${youtube || youtubeFromFile ? '✅ Connected' : '❌ Not Connected'}</td>
          <td style="padding:12px;">${youtube || youtubeFromFile ? '' : '<a href="/api/oauth/youtube/auth" style="color:#4ecdc4;">→ Connect YouTube</a>'}</td>
        </tr>
        <tr style="border-bottom:1px solid #333;">
          <td style="padding:12px;">LinkedIn</td>
          <td style="padding:12px;">${linkedin || linkedinFromFile ? '✅ Connected' : '❌ Not Connected'}</td>
          <td style="padding:12px;">${linkedin || linkedinFromFile ? '' : '<a href="/api/oauth/linkedin/auth" style="color:#4ecdc4;">→ Connect LinkedIn</a>'}</td>
        </tr>
      </table>
      ${savedTokens.youtube ? `<p style="color:#666;margin-top:20px;">YouTube token obtained: ${savedTokens.youtube.obtainedAt}</p>` : ''}
      ${savedTokens.linkedin ? `<p style="color:#666;">LinkedIn token obtained: ${savedTokens.linkedin.obtainedAt} (expires ~60 days)</p>` : ''}
    </body></html>
  `);
});

export { oauthRouter };
