/**
 * Orbit Layer - Main Index
 * Topic normalization layer connecting TrendRadar to Aurora
 */

// Export all modules
export * from './types';
export * from './ingestor';
export * from './scorer';
export * from './memory';
export { orbitRouter } from './api';

// Convenience function to get a single topic
import { fetchTopicsFromTrendRadar } from './ingestor';
import { scoreTopics } from './scorer';
import { filterUnusedTopics, markTopicUsed } from './memory';
import { OrbitTopic, DEFAULT_ORBIT_CONFIG } from './types';

/**
 * Get the next best topic from TrendRadar
 * This is the main entry point for programmatic access
 */
export async function getNextTopic(): Promise<OrbitTopic | null> {
    console.log('[Orbit] Getting next topic...');

    // Fetch from TrendRadar
    const rawTopics = fetchTopicsFromTrendRadar(DEFAULT_ORBIT_CONFIG.maxTopicsToFetch);

    if (rawTopics.length === 0) {
        console.warn('[Orbit] No topics available from TrendRadar');
        return null;
    }

    // Score topics
    const scoredTopics = scoreTopics(rawTopics);

    // Filter unused
    const unusedTopics = filterUnusedTopics(scoredTopics);

    if (unusedTopics.length === 0) {
        console.warn('[Orbit] All topics have been used recently');
        return null;
    }

    // Get top topic and mark as used
    const topTopic = unusedTopics[0];
    markTopicUsed(topTopic);

    console.log(`[Orbit] Selected topic: "${topTopic.label}"`);
    return topTopic;
}

/**
 * Health check for Orbit layer
 */
export function checkOrbitHealth(): { status: string; message: string } {
    try {
        const rawTopics = fetchTopicsFromTrendRadar(1);

        if (rawTopics.length === 0) {
            return {
                status: 'warning',
                message: 'No TrendRadar data available',
            };
        }

        return {
            status: 'healthy',
            message: `TrendRadar connected, ${rawTopics.length} topics available`,
        };
    } catch (error: any) {
        return {
            status: 'unhealthy',
            message: error.message,
        };
    }
}
