/**
 * RecruitmentConditionCache - Caching system for recruitment condition checks
 * 
 * This class provides performance optimization by caching the results of
 * recruitment condition evaluations to avoid redundant calculations.
 * 
 * Features:
 * - LRU (Least Recently Used) cache for condition results
 * - Context-aware caching with invalidation
 * - Memory-efficient storage with automatic cleanup
 * - Performance monitoring and statistics
 */

import {
    RecruitmentCondition,
    RecruitmentContext,
    RecruitmentProgress,
    RecruitmentUtils
} from '../../types/recruitment';

export interface CacheEntry {
    /** Cached result of condition check */
    result: boolean;
    /** Timestamp when entry was created */
    timestamp: number;
    /** Number of times this entry has been accessed */
    accessCount: number;
    /** Last access timestamp */
    lastAccessed: number;
    /** Context hash for invalidation */
    contextHash: string;
}

export interface CacheKey {
    /** Unit ID being checked */
    unitId: string;
    /** Condition ID */
    conditionId: string;
    /** Context hash for cache invalidation */
    contextHash: string;
}

export interface CacheStatistics {
    /** Total number of cache entries */
    totalEntries: number;
    /** Number of cache hits */
    hits: number;
    /** Number of cache misses */
    misses: number;
    /** Cache hit ratio (0-1) */
    hitRatio: number;
    /** Memory usage in bytes (estimated) */
    memoryUsage: number;
    /** Average access time in milliseconds */
    averageAccessTime: number;
    /** Number of cache evictions */
    evictions: number;
}

export interface CacheConfig {
    /** Maximum number of entries to keep in cache */
    maxEntries: number;
    /** Time to live for cache entries in milliseconds */
    ttl: number;
    /** Enable performance monitoring */
    enableMonitoring: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
    /** Maximum memory usage in bytes */
    maxMemoryUsage: number;
}

/**
 * High-performance cache for recruitment condition check results
 */
export class RecruitmentConditionCache {
    private cache: Map<string, CacheEntry>;
    private config: CacheConfig;
    private statistics: CacheStatistics;
    private cleanupTimer?: NodeJS.Timeout;
    private accessTimes: number[];

    // Default configuration
    private static readonly DEFAULT_CONFIG: CacheConfig = {
        maxEntries: 1000,
        ttl: 30000, // 30 seconds
        enableMonitoring: true,
        cleanupInterval: 10000, // 10 seconds
        maxMemoryUsage: 1024 * 1024 // 1MB
    };

    constructor(config?: Partial<CacheConfig>) {
        this.cache = new Map();
        this.config = { ...RecruitmentConditionCache.DEFAULT_CONFIG, ...config };
        this.statistics = this.initializeStatistics();
        this.accessTimes = [];

        this.startCleanupTimer();
    }

    /**
     * Initialize statistics object
     */
    private initializeStatistics(): CacheStatistics {
        return {
            totalEntries: 0,
            hits: 0,
            misses: 0,
            hitRatio: 0,
            memoryUsage: 0,
            averageAccessTime: 0,
            evictions: 0
        };
    }

    /**
     * Generate cache key from unit ID, condition, and context
     */
    private generateCacheKey(unitId: string, condition: RecruitmentCondition, context: RecruitmentContext): string {
        const contextHash = this.generateContextHash(context);
        return `${unitId}:${condition.id}:${contextHash}`;
    }

    /**
     * Generate hash from recruitment context for cache invalidation
     */
    private generateContextHash(context: RecruitmentContext): string {
        // Create a hash based on relevant context properties
        const relevantData = {
            attackerId: context.attacker.id,
            targetHP: context.target.currentHP,
            targetMaxHP: context.target.stats.maxHP,
            damage: context.damage,
            turn: context.turn,
            // Include positions for location-based conditions
            attackerPos: context.attacker.position,
            targetPos: context.target.position,
            // Include ally/enemy counts for formation-based conditions
            allyCount: context.alliedUnits?.length || 0,
            enemyCount: context.enemyUnits?.length || 0,
            npcCount: context.npcUnits?.length || 0
        };

        // Simple hash function (in production, consider using a proper hash library)
        return this.simpleHash(JSON.stringify(relevantData));
    }

    /**
     * Simple hash function for context data
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Check if a condition result is cached and valid
     */
    has(unitId: string, condition: RecruitmentCondition, context: RecruitmentContext): boolean {
        const key = this.generateCacheKey(unitId, condition, context);
        const entry = this.cache.get(key);

        if (!entry) {
            return false;
        }

        // Check if entry has expired
        const now = Date.now();
        if (now - entry.timestamp > this.config.ttl) {
            this.cache.delete(key);
            this.updateStatistics();
            return false;
        }

        return true;
    }

    /**
     * Get cached condition result
     */
    get(unitId: string, condition: RecruitmentCondition, context: RecruitmentContext): boolean | null {
        const startTime = this.config.enableMonitoring ? performance.now() : 0;
        const key = this.generateCacheKey(unitId, condition, context);
        const entry = this.cache.get(key);

        if (!entry) {
            this.statistics.misses++;
            this.updateStatistics();
            return null;
        }

        // Check if entry has expired
        const now = Date.now();
        if (now - entry.timestamp > this.config.ttl) {
            this.cache.delete(key);
            this.statistics.misses++;
            this.updateStatistics();
            return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = now;
        this.statistics.hits++;

        // Record access time
        if (this.config.enableMonitoring) {
            const accessTime = performance.now() - startTime;
            this.recordAccessTime(accessTime);
        }

        this.updateStatistics();
        return entry.result;
    }

    /**
     * Store condition result in cache
     */
    set(unitId: string, condition: RecruitmentCondition, context: RecruitmentContext, result: boolean): void {
        const key = this.generateCacheKey(unitId, condition, context);
        const now = Date.now();
        const contextHash = this.generateContextHash(context);

        const entry: CacheEntry = {
            result: result,
            timestamp: now,
            accessCount: 1,
            lastAccessed: now,
            contextHash: contextHash
        };

        // Check if we need to evict entries
        if (this.cache.size >= this.config.maxEntries) {
            this.evictLeastRecentlyUsed();
        }

        // Check memory usage
        if (this.getEstimatedMemoryUsage() > this.config.maxMemoryUsage) {
            this.evictOldestEntries();
        }

        this.cache.set(key, entry);
        this.updateStatistics();
    }

    /**
     * Invalidate cache entries for a specific unit
     */
    invalidateUnit(unitId: string): void {
        const keysToDelete: string[] = [];

        for (const key of this.cache.keys()) {
            if (key.startsWith(`${unitId}:`)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        this.updateStatistics();
    }

    /**
     * Invalidate cache entries based on context changes
     */
    invalidateContext(context: RecruitmentContext): void {
        const contextHash = this.generateContextHash(context);
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (entry.contextHash !== contextHash) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        this.updateStatistics();
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.statistics = this.initializeStatistics();
        this.accessTimes = [];
    }

    /**
     * Evict least recently used entries
     */
    private evictLeastRecentlyUsed(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.statistics.evictions++;
        }
    }

    /**
     * Evict oldest entries to free memory
     */
    private evictOldestEntries(): void {
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Remove oldest 25% of entries
        const toRemove = Math.ceil(entries.length * 0.25);
        for (let i = 0; i < toRemove; i++) {
            this.cache.delete(entries[i][0]);
            this.statistics.evictions++;
        }
    }

    /**
     * Cleanup expired entries
     */
    private cleanupExpiredEntries(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.config.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
        this.updateStatistics();
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.config.cleanupInterval);
    }

    /**
     * Record access time for performance monitoring
     */
    private recordAccessTime(accessTime: number): void {
        this.accessTimes.push(accessTime);

        // Keep only last 1000 access times
        if (this.accessTimes.length > 1000) {
            this.accessTimes.shift();
        }
    }

    /**
     * Update cache statistics
     */
    private updateStatistics(): void {
        this.statistics.totalEntries = this.cache.size;

        const totalRequests = this.statistics.hits + this.statistics.misses;
        this.statistics.hitRatio = totalRequests > 0 ? this.statistics.hits / totalRequests : 0;

        this.statistics.memoryUsage = this.getEstimatedMemoryUsage();

        if (this.accessTimes.length > 0) {
            const sum = this.accessTimes.reduce((a, b) => a + b, 0);
            this.statistics.averageAccessTime = sum / this.accessTimes.length;
        }
    }

    /**
     * Estimate memory usage of cache
     */
    private getEstimatedMemoryUsage(): number {
        let totalSize = 0;

        for (const [key, entry] of this.cache.entries()) {
            // Estimate size of key (string)
            totalSize += key.length * 2; // UTF-16 encoding

            // Estimate size of entry object
            totalSize += 8; // result (boolean)
            totalSize += 8; // timestamp (number)
            totalSize += 8; // accessCount (number)
            totalSize += 8; // lastAccessed (number)
            totalSize += entry.contextHash.length * 2; // contextHash (string)
            totalSize += 64; // object overhead
        }

        return totalSize;
    }

    /**
     * Get cache statistics
     */
    getStatistics(): CacheStatistics {
        this.updateStatistics();
        return { ...this.statistics };
    }

    /**
     * Get cache configuration
     */
    getConfig(): CacheConfig {
        return { ...this.config };
    }

    /**
     * Update cache configuration
     */
    updateConfig(newConfig: Partial<CacheConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Restart cleanup timer if interval changed
        if (newConfig.cleanupInterval !== undefined) {
            this.startCleanupTimer();
        }

        // Clean up if max entries or memory limit changed
        if (newConfig.maxEntries !== undefined && this.cache.size > newConfig.maxEntries) {
            while (this.cache.size > newConfig.maxEntries) {
                this.evictLeastRecentlyUsed();
            }
        }

        if (newConfig.maxMemoryUsage !== undefined && this.getEstimatedMemoryUsage() > newConfig.maxMemoryUsage) {
            this.evictOldestEntries();
        }
    }

    /**
     * Get cache entries for debugging
     */
    getDebugInfo(): { key: string; entry: CacheEntry }[] {
        return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
    }

    /**
     * Optimize cache performance
     */
    optimize(): void {
        // Remove expired entries
        this.cleanupExpiredEntries();

        // If hit ratio is low, consider reducing TTL
        if (this.statistics.hitRatio < 0.3 && this.config.ttl > 5000) {
            this.config.ttl = Math.max(5000, this.config.ttl * 0.8);
        }

        // If memory usage is high, reduce max entries
        if (this.statistics.memoryUsage > this.config.maxMemoryUsage * 0.9) {
            this.config.maxEntries = Math.max(100, Math.floor(this.config.maxEntries * 0.8));
            while (this.cache.size > this.config.maxEntries) {
                this.evictLeastRecentlyUsed();
            }
        }
    }

    /**
     * Destroy cache and cleanup resources
     */
    destroy(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }

        this.clear();
    }
}

/**
 * Utility functions for cache management
 */
export class CacheUtils {
    /**
     * Create optimized cache configuration based on game requirements
     */
    static createOptimizedConfig(
        expectedUnits: number,
        expectedConditions: number,
        memoryBudget: number
    ): CacheConfig {
        const estimatedEntries = expectedUnits * expectedConditions * 2; // 2x for safety margin
        const maxEntries = Math.min(estimatedEntries, Math.floor(memoryBudget / 200)); // ~200 bytes per entry

        return {
            maxEntries: maxEntries,
            ttl: 15000, // 15 seconds for active gameplay
            enableMonitoring: true,
            cleanupInterval: 5000, // 5 seconds
            maxMemoryUsage: memoryBudget
        };
    }

    /**
     * Analyze cache performance and suggest optimizations
     */
    static analyzePerformance(statistics: CacheStatistics): {
        recommendations: string[];
        severity: 'low' | 'medium' | 'high';
    } {
        const recommendations: string[] = [];
        let severity: 'low' | 'medium' | 'high' = 'low';

        // Check hit ratio
        if (statistics.hitRatio < 0.5) {
            recommendations.push('Low cache hit ratio - consider increasing TTL or reducing cache invalidation frequency');
            severity = 'medium';
        }

        // Check memory usage
        if (statistics.memoryUsage > 1024 * 1024) { // 1MB
            recommendations.push('High memory usage - consider reducing max entries or TTL');
            severity = 'high';
        }

        // Check access time
        if (statistics.averageAccessTime > 1.0) { // 1ms
            recommendations.push('Slow cache access - consider optimizing hash function or reducing cache size');
            severity = 'medium';
        }

        // Check eviction rate
        const totalRequests = statistics.hits + statistics.misses;
        const evictionRate = totalRequests > 0 ? statistics.evictions / totalRequests : 0;
        if (evictionRate > 0.1) { // 10% eviction rate
            recommendations.push('High eviction rate - consider increasing max entries');
            severity = 'medium';
        }

        return { recommendations, severity };
    }
}