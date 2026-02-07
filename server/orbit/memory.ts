/**
 * Orbit Layer - Topic Memory
 * Tracks used topics to prevent duplicate content
 */

import * as fs from 'fs';
import * as path from 'path';
import { TopicMemory, TopicMemoryEntry, OrbitTopic, OrbitConfig, DEFAULT_ORBIT_CONFIG } from './types';

const MEMORY_FILE = path.resolve(__dirname, '..', '..', 'orbit-memory.json');

/**
 * Load topic memory from disk
 */
function loadMemory(): TopicMemory {
    try {
        if (fs.existsSync(MEMORY_FILE)) {
            const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
            return JSON.parse(data) as TopicMemory;
        }
    } catch (error: any) {
        console.warn('[Orbit/Memory] Failed to load memory:', error.message);
    }

    return {
        entries: [],
        lastUpdated: new Date().toISOString(),
    };
}

/**
 * Save topic memory to disk
 */
function saveMemory(memory: TopicMemory): void {
    try {
        memory.lastUpdated = new Date().toISOString();
        fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
    } catch (error: any) {
        console.error('[Orbit/Memory] Failed to save memory:', error.message);
    }
}

/**
 * Clean expired entries from memory
 */
function cleanExpiredEntries(
    memory: TopicMemory,
    windowHours: number
): TopicMemory {
    const cutoff = Date.now() - (windowHours * 60 * 60 * 1000);

    const validEntries = memory.entries.filter(entry => {
        const entryTime = new Date(entry.usedAt).getTime();
        return entryTime > cutoff;
    });

    if (validEntries.length !== memory.entries.length) {
        console.log(`[Orbit/Memory] Cleaned ${memory.entries.length - validEntries.length} expired entries`);
    }

    return {
        entries: validEntries,
        lastUpdated: memory.lastUpdated,
    };
}

/**
 * Check if a topic title was recently used
 */
export function wasRecentlyUsed(
    title: string,
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): boolean {
    const memory = loadMemory();
    const cleaned = cleanExpiredEntries(memory, config.memoryWindowHours);

    // Check for similar titles (case-insensitive, trimmed)
    const normalizedTitle = title.toLowerCase().trim();

    return cleaned.entries.some(entry =>
        entry.title.toLowerCase().trim() === normalizedTitle
    );
}

/**
 * Mark a topic as used
 */
export function markTopicUsed(
    topic: OrbitTopic,
    runId?: string,
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): void {
    const memory = loadMemory();
    const cleaned = cleanExpiredEntries(memory, config.memoryWindowHours);

    const entry: TopicMemoryEntry = {
        topicId: topic.id,
        title: topic.label,
        usedAt: new Date().toISOString(),
        runId,
    };

    cleaned.entries.push(entry);
    saveMemory(cleaned);

    console.log(`[Orbit/Memory] Marked topic as used: "${topic.label}"`);
}

/**
 * Filter out recently used topics
 */
export function filterUnusedTopics(
    topics: OrbitTopic[],
    config: OrbitConfig = DEFAULT_ORBIT_CONFIG
): OrbitTopic[] {
    const memory = loadMemory();
    const cleaned = cleanExpiredEntries(memory, config.memoryWindowHours);
    saveMemory(cleaned); // Save cleaned memory

    const usedTitles = new Set(
        cleaned.entries.map(e => e.title.toLowerCase().trim())
    );

    const unused = topics.filter(topic =>
        !usedTitles.has(topic.label.toLowerCase().trim())
    );

    console.log(`[Orbit/Memory] Filtered: ${topics.length} total, ${unused.length} unused`);
    return unused;
}

/**
 * Get memory statistics
 */
export function getMemoryStats(): { totalEntries: number; lastUpdated: string } {
    const memory = loadMemory();
    return {
        totalEntries: memory.entries.length,
        lastUpdated: memory.lastUpdated,
    };
}

/**
 * Clear all memory (for testing)
 */
export function clearMemory(): void {
    const emptyMemory: TopicMemory = {
        entries: [],
        lastUpdated: new Date().toISOString(),
    };
    saveMemory(emptyMemory);
    console.log('[Orbit/Memory] Memory cleared');
}
