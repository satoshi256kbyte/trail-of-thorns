/**
 * BattlePerformanceManager - Manages performance optimization and memory management for battle system
 * Provides caching, object pooling, and performance monitoring for battle operations
 */

import { Unit, Position, MapData } from '../types/gameplay';
import { Weapon, AttackRangeResult, BattleResult } from '../types/battle';

/**
 * Cache entry for attack range calculations
 */
interface AttackRangeCacheEntry {
    key: string;
    result: AttackRangeResult;
    timestamp: number;
    accessCount: number;
    lastAccessed: number;
}

/**
 * Performance metrics for monitoring
 */
export interface PerformanceMetrics {
    cacheHitRate: number;
    cacheSize: number;
    objectPoolUtilization: number;
    memoryUsage: number;
    averageCalculationTime: number;
    totalCalculations: number;
    lastCleanupTime: number;
}

/**
 * Configuration for performance manager
 */
export interface PerformanceConfig {
    /** Maximum number of cached attack range results */
    maxCacheSize: number;
    /** Cache entry TTL in milliseconds */
    cacheEntryTTL: number;
    /** Maximum object pool size for each type */
    maxPoolSize: number;
    /** Enable performance monitoring */
    enableMonitoring: boolean;
    /** Cleanup interval in milliseconds */
    cleanupInterval: number;
    /** Memory usage warning threshold (MB) */
    memoryWarningThreshold: number;
}

/**
 * Object pool for reusable game objects
 */
class ObjectPool<T> {
    private pool: T[] = [];
    private createFn: () => T;
    private resetFn: (obj: T) => void;
    private maxSize: number;
    private totalCreated: number = 0;
    private totalReused: number = 0;

    constructor(createFn: () => T, resetFn: (obj: T) => void, maxSize: number = 100) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.maxSize = maxSize;
    }

    /**
     * Get an object from the pool or create a new one
     */
    public acquire(): T {
        if (this.pool.length > 0) {
            const obj = this.pool.pop()!;
            this.resetFn(obj);
            this.totalReused++;
            return obj;
        }

        this.totalCreated++;
        return this.createFn();
    }

    /**
     * Return an object to the pool
     */
    public release(obj: T): void {
        if (this.pool.length < this.maxSize) {
            this.pool.push(obj);
        }
    }

    /**
     * Get pool utilization statistics
     */
    public getUtilization(): number {
        return this.totalReused / (this.totalCreated + this.totalReused);
    }

    /**
     * Clear the pool
     */
    public clear(): void {
        this.pool.length = 0;
        this.totalCreated = 0;
        this.totalReused = 0;
    }

    /**
     * Get current pool size
     */
    public size(): number {
        return this.pool.length;
    }
}

/**
 * Main performance manager class
 */
export class BattlePerformanceManager {
    private config: PerformanceConfig;
    private attackRangeCache: Map<string, AttackRangeCacheEntry>;
    private objectPools: Map<string, ObjectPool<any>>;
    private performanceMetrics: PerformanceMetrics;
    private cleanupTimer: NodeJS.Timeout | null = null;
    private calculationTimes: number[] = [];

    // Default configuration
    private static readonly DEFAULT_CONFIG: PerformanceConfig = {
        maxCacheSize: 1000,
        cacheEntryTTL: 30000, // 30 seconds
        maxPoolSize: 100,
        enableMonitoring: true,
        cleanupInterval: 60000, // 1 minute
        memoryWarningThreshold: 100 // 100MB
    };

    constructor(config?: Partial<PerformanceConfig>) {
        this.config = { ...BattlePerformanceManager.DEFAULT_CONFIG, ...config };
        this.attackRangeCache = new Map();
        this.objectPools = new Map();

        this.performanceMetrics = {
            cacheHitRate: 0,
            cacheSize: 0,
            objectPoolUtilization: 0,
            memoryUsage: 0,
            averageCalculationTime: 0,
            totalCalculations: 0,
            lastCleanupTime: Date.now()
        };

        this.initializeObjectPools();
        this.startCleanupTimer();
    }

    /**
     * Initialize object pools for common battle objects
     */
    private initializeObjectPools(): void {
        // Pool for position arrays
        this.objectPools.set('positions', new ObjectPool<Position[]>(
            () => [],
            (arr) => arr.length = 0,
            this.config.maxPoolSize
        ));

        // Pool for graphics objects (placeholder - would need Phaser integration)
        this.objectPools.set('graphics', new ObjectPool<any>(
            () => ({}), // Placeholder
            (obj) => { }, // Placeholder
            this.config.maxPoolSize
        ));

        // Pool for animation objects
        this.objectPools.set('animations', new ObjectPool<any>(
            () => ({}), // Placeholder
            (obj) => { }, // Placeholder
            this.config.maxPoolSize
        ));
    }

    /**
     * Get cached attack range result or calculate and cache new one
     */
    public getCachedAttackRange(
        attacker: Unit,
        weapon: Weapon,
        mapData?: MapData,
        calculator?: (attacker: Unit, weapon: Weapon, mapData?: MapData) => AttackRangeResult
    ): AttackRangeResult | null {
        const cacheKey = this.generateAttackRangeCacheKey(attacker, weapon, mapData);
        const cached = this.attackRangeCache.get(cacheKey);

        if (cached && this.isCacheEntryValid(cached)) {
            // Update access statistics
            cached.accessCount++;
            cached.lastAccessed = Date.now();

            // Update cache hit rate
            this.updateCacheHitRate(true);

            return cached.result;
        }

        // Cache miss - calculate if calculator provided
        if (calculator) {
            const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const result = calculator(attacker, weapon, mapData);
            const calculationTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

            // Store calculation time for metrics
            this.calculationTimes.push(calculationTime);
            if (this.calculationTimes.length > 100) {
                this.calculationTimes.shift(); // Keep only last 100 measurements
            }

            // Cache the result
            this.cacheAttackRange(cacheKey, result);
            this.updateCacheHitRate(false);

            return result;
        }

        this.updateCacheHitRate(false);
        return null;
    }

    /**
     * Cache an attack range result
     */
    public cacheAttackRange(key: string, result: AttackRangeResult): void {
        // Check cache size limit
        if (this.attackRangeCache.size >= this.config.maxCacheSize) {
            this.evictOldestCacheEntry();
        }

        const entry: AttackRangeCacheEntry = {
            key,
            result,
            timestamp: Date.now(),
            accessCount: 1,
            lastAccessed: Date.now()
        };

        this.attackRangeCache.set(key, entry);
        this.performanceMetrics.cacheSize = this.attackRangeCache.size;
    }

    /**
     * Generate cache key for attack range calculation
     */
    private generateAttackRangeCacheKey(attacker: Unit, weapon: Weapon, mapData?: MapData): string {
        // Handle null/undefined inputs
        if (!attacker || !weapon) {
            return 'invalid_key';
        }

        const attackerKey = `${attacker.id}_${attacker.position?.x || 0}_${attacker.position?.y || 0}`;
        const weaponKey = `${weapon.id}_${weapon.range}_${weapon.type}`;
        const mapKey = mapData ? `${mapData.width}_${mapData.height}` : 'no_map';

        return `${attackerKey}_${weaponKey}_${mapKey}`;
    }

    /**
     * Check if cache entry is still valid
     */
    private isCacheEntryValid(entry: AttackRangeCacheEntry): boolean {
        const age = Date.now() - entry.timestamp;
        return age < this.config.cacheEntryTTL;
    }

    /**
     * Evict oldest cache entry based on LRU policy
     */
    private evictOldestCacheEntry(): void {
        let oldestKey: string | null = null;
        let oldestTime = Date.now();

        for (const [key, entry] of this.attackRangeCache) {
            if (entry.lastAccessed < oldestTime) {
                oldestTime = entry.lastAccessed;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.attackRangeCache.delete(oldestKey);
        }
    }

    /**
     * Update cache hit rate metric
     */
    private updateCacheHitRate(hit: boolean): void {
        this.performanceMetrics.totalCalculations++;

        if (hit) {
            const totalHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalCalculations - 1) + 1;
            this.performanceMetrics.cacheHitRate = totalHits / this.performanceMetrics.totalCalculations;
        } else {
            const totalHits = this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalCalculations - 1);
            this.performanceMetrics.cacheHitRate = totalHits / this.performanceMetrics.totalCalculations;
        }
    }

    /**
     * Get object from pool
     */
    public acquireObject<T>(poolName: string): T | null {
        const pool = this.objectPools.get(poolName);
        return pool ? pool.acquire() : null;
    }

    /**
     * Return object to pool
     */
    public releaseObject(poolName: string, obj: any): void {
        const pool = this.objectPools.get(poolName);
        if (pool) {
            pool.release(obj);
        }
    }

    /**
     * Clear all caches and pools
     */
    public clearAll(): void {
        this.attackRangeCache.clear();

        for (const pool of this.objectPools.values()) {
            pool.clear();
        }

        this.calculationTimes.length = 0;

        this.performanceMetrics = {
            cacheHitRate: 0,
            cacheSize: 0,
            objectPoolUtilization: 0,
            memoryUsage: 0,
            averageCalculationTime: 0,
            totalCalculations: 0,
            lastCleanupTime: Date.now()
        };
    }

    /**
     * Perform cleanup of expired cache entries and unused objects
     */
    public cleanup(): void {
        const now = Date.now();

        // Clean up expired cache entries
        for (const [key, entry] of this.attackRangeCache) {
            if (!this.isCacheEntryValid(entry)) {
                this.attackRangeCache.delete(key);
            }
        }

        // Update metrics
        this.performanceMetrics.cacheSize = this.attackRangeCache.size;
        this.performanceMetrics.lastCleanupTime = now;

        // Calculate average calculation time
        if (this.calculationTimes.length > 0) {
            const sum = this.calculationTimes.reduce((a, b) => a + b, 0);
            this.performanceMetrics.averageCalculationTime = sum / this.calculationTimes.length;
        }

        // Calculate object pool utilization
        let totalUtilization = 0;
        let poolCount = 0;

        for (const pool of this.objectPools.values()) {
            totalUtilization += pool.getUtilization();
            poolCount++;
        }

        this.performanceMetrics.objectPoolUtilization = poolCount > 0 ? totalUtilization / poolCount : 0;

        // Check memory usage (if available)
        if (typeof process !== 'undefined' && process.memoryUsage) {
            const memUsage = process.memoryUsage();
            this.performanceMetrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // Convert to MB

            if (this.performanceMetrics.memoryUsage > this.config.memoryWarningThreshold) {
                console.warn(`[BattlePerformanceManager] Memory usage warning: ${this.performanceMetrics.memoryUsage.toFixed(2)}MB`);
            }
        }
    }

    /**
     * Start automatic cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }

        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupInterval);
    }

    /**
     * Stop cleanup timer
     */
    public stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Get current performance metrics
     */
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Update configuration
     */
    public updateConfig(config: Partial<PerformanceConfig>): void {
        this.config = { ...this.config, ...config };

        // Restart cleanup timer if interval changed
        if (config.cleanupInterval !== undefined) {
            this.startCleanupTimer();
        }
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        size: number;
        hitRate: number;
        totalCalculations: number;
        averageCalculationTime: number;
    } {
        return {
            size: this.attackRangeCache.size,
            hitRate: this.performanceMetrics.cacheHitRate,
            totalCalculations: this.performanceMetrics.totalCalculations,
            averageCalculationTime: this.performanceMetrics.averageCalculationTime
        };
    }

    /**
     * Get object pool statistics
     */
    public getPoolStats(): Map<string, { size: number; utilization: number }> {
        const stats = new Map();

        for (const [name, pool] of this.objectPools) {
            stats.set(name, {
                size: pool.size(),
                utilization: pool.getUtilization()
            });
        }

        return stats;
    }

    /**
     * Force garbage collection if available
     */
    public forceGarbageCollection(): void {
        if (typeof global !== 'undefined' && global.gc) {
            global.gc();
        }
    }

    /**
     * Destroy the performance manager and clean up resources
     */
    public destroy(): void {
        this.stopCleanupTimer();
        this.clearAll();
        this.objectPools.clear();
    }
}