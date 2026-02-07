/**
 * Orbit Layer - API Routes
 * Exposes HTTP endpoints for Aurora topic-engine to consume
 */

import { Router, Request, Response } from 'express';
import { fetchTopicsFromTrendRadar, getPlatformStats } from './ingestor';
import { scoreTopics } from './scorer';
import { filterUnusedTopics, markTopicUsed, getMemoryStats } from './memory';
import { OrbitTopic, DEFAULT_ORBIT_CONFIG } from './types';

export const orbitRouter = Router();

/**
 * GET /api/orbit/topic
 * Returns the top-priority unused topic for Aurora pipeline
 * Format matches Aurora's topic-engine expected structure
 */
orbitRouter.get('/topic', async (req: Request, res: Response) => {
    try {
        console.log('[Orbit/API] Topic requested');

        // 1. Fetch topics from TrendRadar
        const rawTopics = fetchTopicsFromTrendRadar(DEFAULT_ORBIT_CONFIG.maxTopicsToFetch);

        if (rawTopics.length === 0) {
            console.warn('[Orbit/API] No topics available from TrendRadar');
            return res.status(404).json({
                error: 'No topics available',
                message: 'TrendRadar has no recent topics. Run TrendRadar to fetch new topics.',
            });
        }

        // 2. Score and rank topics
        const scoredTopics = scoreTopics(rawTopics);

        // 3. Filter out recently used topics
        const unusedTopics = filterUnusedTopics(scoredTopics);

        if (unusedTopics.length === 0) {
            console.warn('[Orbit/API] All topics have been used recently');
            return res.status(404).json({
                error: 'No unused topics',
                message: 'All available topics have been used recently. Wait or run TrendRadar for new topics.',
            });
        }

        // 4. Get top topic
        const topTopic = unusedTopics[0];

        // 5. Mark as used (optional: wait until pipeline confirms success)
        // For now, we mark it immediately
        markTopicUsed(topTopic);

        console.log(`[Orbit/API] Returning topic: "${topTopic.label}" (score: ${topTopic.weight})`);

        // Return in Aurora topic-engine expected format
        res.json({
            id: topTopic.id,
            label: topTopic.label,
            weight: topTopic.weight,
            metadata: topTopic.metadata,
        });

    } catch (error: any) {
        console.error('[Orbit/API] Error fetching topic:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
        });
    }
});

/**
 * GET /api/orbit/topics
 * Returns list of available topics (for debugging/monitoring)
 */
orbitRouter.get('/topics', async (req: Request, res: Response) => {
    try {
        const limit = parseInt(req.query.limit as string) || 20;

        const rawTopics = fetchTopicsFromTrendRadar(DEFAULT_ORBIT_CONFIG.maxTopicsToFetch);
        const scoredTopics = scoreTopics(rawTopics);
        const unusedTopics = filterUnusedTopics(scoredTopics);

        res.json({
            total: scoredTopics.length,
            unused: unusedTopics.length,
            topics: unusedTopics.slice(0, limit),
        });

    } catch (error: any) {
        console.error('[Orbit/API] Error listing topics:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/orbit/stats
 * Returns Orbit statistics
 */
orbitRouter.get('/stats', async (req: Request, res: Response) => {
    try {
        const platformStats = getPlatformStats();
        const memoryStats = getMemoryStats();
        const rawTopics = fetchTopicsFromTrendRadar(DEFAULT_ORBIT_CONFIG.maxTopicsToFetch);
        const scoredTopics = scoreTopics(rawTopics);
        const unusedTopics = filterUnusedTopics(scoredTopics);

        res.json({
            trendradar: {
                totalTopics: rawTopics.length,
                platforms: platformStats,
            },
            orbit: {
                scoredTopics: scoredTopics.length,
                unusedTopics: unusedTopics.length,
                topScore: scoredTopics[0]?.weight || 0,
            },
            memory: memoryStats,
        });

    } catch (error: any) {
        console.error('[Orbit/API] Error fetching stats:', error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/orbit/refresh
 * Manually trigger TrendRadar data refresh (optional endpoint)
 */
orbitRouter.post('/refresh', async (req: Request, res: Response) => {
    // This would trigger a TrendRadar run
    // For now, just return info about where to run it
    res.json({
        message: 'Manual TrendRadar refresh not implemented yet',
        hint: 'Run TrendRadar manually: cd Aurora-Pipeline-TrendRadar && source venv/bin/activate && python -m trendradar',
    });
});
