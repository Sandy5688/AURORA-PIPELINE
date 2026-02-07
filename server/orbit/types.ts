/**
 * Orbit Layer - TypeScript Types
 * Defines interfaces for TrendRadar data and Aurora topic format
 */

// Raw item from TrendRadar SQLite database
export interface TrendRadarItem {
  id: number;
  title: string;
  platform_id: string;
  rank: number;
  url: string;
  mobile_url?: string;
  first_crawl_time: string;
  last_crawl_time: string;
  crawl_count?: number;
}

// Normalized topic ready for Aurora pipeline
export interface OrbitTopic {
  id: string;
  label: string;     // The headline/topic title
  weight: number;    // Priority score (0-1, higher = better)
  metadata: {
    source: 'trendradar';
    platform: string;
    url: string;
    rank: number;
    fetchedAt: string;
    originalId: number;
  };
}

// Memory entry for tracking used topics
export interface TopicMemoryEntry {
  topicId: string;
  title: string;
  usedAt: string;
  runId?: string;
}

// Topic memory store
export interface TopicMemory {
  entries: TopicMemoryEntry[];
  lastUpdated: string;
}

// Orbit configuration
export interface OrbitConfig {
  trendRadarPath: string;
  memoryFile: string;
  memoryWindowHours: number;  // Don't reuse topics within this window
  maxTopicsToFetch: number;
  scoringWeights: {
    rank: number;
    recency: number;
    platformDiversity: number;
  };
}

// Default configuration
export const DEFAULT_ORBIT_CONFIG: OrbitConfig = {
  trendRadarPath: '../Aurora-Pipeline-TrendRadar/output/news',
  memoryFile: './orbit-memory.json',
  memoryWindowHours: 48,
  maxTopicsToFetch: 50,
  scoringWeights: {
    rank: 0.5,
    recency: 0.3,
    platformDiversity: 0.2,
  },
};
