/**
 * Orbit Layer - Topic Scorer
 * Ranks topics by priority using multiple factors
 */

import { TrendRadarItem, OrbitTopic, OrbitConfig, DEFAULT_ORBIT_CONFIG } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Calculate priority score for a topic
 * Score is 0-1, higher = better priority
 */
function calculateScore(
    item: TrendRadarItem,
    platformCounts: Map<string, number>,
    totalTopics: number,
    config: OrbitConfig
): number {
    const weights = config.scoringWeights;

    // 1. Rank score (lower rank = higher score)
    // Rank 1 = 1.0, Rank 50 = 0.0
    const maxRank = 50;
    const rankScore = Math.max(0, (maxRank - item.rank) / maxRank);

    // 2. Recency score (more recent = higher score)
    const crawlTime = new Date(item.last_crawl_time).getTime();
    const now = Date.now();
    const hoursSinceCrawl = (now - crawlTime) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - (hoursSinceCrawl / 24)); // Full score if < 24h

    // 3. Platform diversity score (prefer less common platforms)
    const platformCount = platformCounts.get(item.platform_id) || 1;
    const diversityScore = 1 - (platformCount / totalTopics);

    // Weighted average
    const finalScore =
        (weights.rank * rankScore) +
        (weights.recency * recencyScore) +
        (weights.platformDiversity * diversityScore);

    return Math.round(finalScore * 1000) / 1000; // Round to 3 decimals
}

/**
 * Convert TrendRadar item to Orbit topic format
 */
function toOrbitTopic(item: TrendRadarItem, score: number): OrbitTopic {
    return {
        id: uuidv4(),
        label: item.title,
        weight: score,
        metadata: {
            source: 'trendradar',
            platform: item.platform_id,
            url: item.url || '',
            rank: item.rank,
            fetchedAt: new Date().toISOString(),
            originalId: item.id,
        },
    };
}

/**
 * Score and rank topics from TrendRadar
 * Returns sorted array of OrbitTopics (highest score first)
 */
export function scoreTopics(
    items: TrendRadarItem[],
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): OrbitTopic[] {
    if (items.length === 0) {
        return [];
    }

    // Count topics per platform for diversity scoring
    const platformCounts = new Map<string, number>();
    for (const item of items) {
        platformCounts.set(
            item.platform_id,
            (platformCounts.get(item.platform_id) || 0) + 1
        );
    }

    // Score each topic
    const scoredTopics = items.map(item => {
        const score = calculateScore(item, platformCounts, items.length, config);
        return toOrbitTopic(item, score);
    });

    // Sort by score descending
    scoredTopics.sort((a, b) => b.weight - a.weight);

    console.log(`[Orbit/Scorer] Scored ${scoredTopics.length} topics`);
    if (scoredTopics.length > 0) {
        console.log(`[Orbit/Scorer] Top topic: "${scoredTopics[0].label}" (score: ${scoredTopics[0].weight})`);
    }

    return scoredTopics;
}

/**
 * Get top N topics after scoring
 */
export function getTopTopics(
    items: TrendRadarItem[],
    limit: number = 10,
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): OrbitTopic[] {
    const scored = scoreTopics(items, config);
    return scored.slice(0, limit);
}
