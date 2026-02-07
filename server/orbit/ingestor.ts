/**
 * Orbit Layer - TrendRadar Ingestor
 * Reads topics from TrendRadar SQLite database
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { TrendRadarItem, OrbitConfig, DEFAULT_ORBIT_CONFIG } from './types';

/**
 * Get the most recent TrendRadar database file
 */
function getLatestDbPath(config: OrbitConfig = DEFAULT_ORBIT_CONFIG): string | null {
    const newsDir = path.resolve(__dirname, '..', '..', config.trendRadarPath);

    if (!fs.existsSync(newsDir)) {
        console.error(`[Orbit/Ingestor] TrendRadar news directory not found: ${newsDir}`);
        return null;
    }

    // List all .db files and sort by date (filename format: YYYY-MM-DD.db)
    const dbFiles = fs.readdirSync(newsDir)
        .filter(f => f.endsWith('.db'))
        .sort()
        .reverse();

    if (dbFiles.length === 0) {
        console.error('[Orbit/Ingestor] No database files found in TrendRadar output');
        return null;
    }

    const latestDb = path.join(newsDir, dbFiles[0]);
    console.log(`[Orbit/Ingestor] Using database: ${dbFiles[0]}`);
    return latestDb;
}

/**
 * Fetch topics from TrendRadar database
 */
export function fetchTopicsFromTrendRadar(
    limit: number = 50,
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): TrendRadarItem[] {
    const dbPath = getLatestDbPath(config);

    if (!dbPath) {
        console.warn('[Orbit/Ingestor] No TrendRadar data available, returning empty');
        return [];
    }

    try {
        const db = new Database(dbPath, { readonly: true });

        // Query recent news items, ordered by rank (lower = better)
        const query = `
      SELECT 
        id,
        title,
        platform_id,
        rank,
        url,
        mobile_url,
        first_crawl_time,
        last_crawl_time,
        crawl_count
      FROM news_items
      ORDER BY rank ASC, last_crawl_time DESC
      LIMIT ?
    `;

        const items = db.prepare(query).all(limit) as TrendRadarItem[];
        db.close();

        console.log(`[Orbit/Ingestor] Fetched ${items.length} topics from TrendRadar`);
        return items;

    } catch (error: any) {
        console.error('[Orbit/Ingestor] Database error:', error.message);
        return [];
    }
}

/**
 * Get platform statistics from TrendRadar
 */
export function getPlatformStats(config: OrbitConfig = DEFAULT_ORBIT_CONFIG): Record<string, number> {
    const dbPath = getLatestDbPath(config);

    if (!dbPath) {
        return {};
    }

    try {
        const db = new Database(dbPath, { readonly: true });

        const query = `
      SELECT platform_id, COUNT(*) as count
      FROM news_items
      GROUP BY platform_id
      ORDER BY count DESC
    `;

        const rows = db.prepare(query).all() as Array<{ platform_id: string; count: number }>;
        db.close();

        const stats: Record<string, number> = {};
        for (const row of rows) {
            stats[row.platform_id] = row.count;
        }

        return stats;

    } catch (error: any) {
        console.error('[Orbit/Ingestor] Error fetching stats:', error.message);
        return {};
    }
}
