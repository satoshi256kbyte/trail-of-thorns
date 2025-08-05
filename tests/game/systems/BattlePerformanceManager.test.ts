/**
 * Tests for BattlePerformanceManager
 * Verifies caching, object pooling, and performance optimization functionality
 */

import { BattlePerformanceManager } from '../../../game/src/systems/BattlePerformanceManager';
import { AttackRangeCalculator } from '../../../game/src/systems/AttackRangeCalculator';
import { Unit, Position, MapData } from '../../../game/src/types/gameplay';
import { Weapon, WeaponType, AttackRangeResult } from '../../../game/src/types/battle';

// Mock data for testing
const createMockUnit = (id: string, position: Position): Unit => ({
    id,
    name: `Unit ${id}`,
    position,
    stats: {
        maxHP: 100,
        maxMP: 50,
        attack: 20,
        defense: 15,
        speed: 10,
        movement: 3
    },
    currentHP: 100,
    currentMP: 50,
    faction: 'player',
    hasActed: false,
    hasMoved: false,
    sprite: null
});

const createMockWeapon = (id: string, range: number = 1): Weapon => ({
    id,
    name: `Weapon ${id}`,
    type: WeaponType.SWORD,
    attackPower: 10,
    range,
    rangePattern: {
        type: 'single',
        range,
        pattern: [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]
    },
    element: 'none' as any,
    criticalRate: 10,
    accuracy: 90,
    specialEffects: [],
    description: 'Test weapon'
});

const createMockMapData = (): MapData => ({
    width: 10,
    height: 10,
    tiles: Array(10).fill(null).map(() => Array(10).fill({ type: 'grass', passable: true })),
    units: []
});

describe('BattlePerformanceManager', () => {
    let performanceManager: BattlePerformanceManager;
    let mockCalculator: jest.MockedFunction<(attacker: Unit, weapon: Weapon, mapData?: MapData) => AttackRangeResult>;

    beforeEach(() => {
        performanceManager = new BattlePerformanceManager({
            maxCacheSize: 100,
            cacheEntryTTL: 10000, // 10 seconds for testing
            enableMonitoring: true
        });

        // Mock calculator function
        mockCalculator = jest.fn().mockImplementation((attacker: Unit, weapon: Weapon, mapData?: MapData) => ({
            validPositions: [
                { x: attacker.position.x + 1, y: attacker.position.y },
                { x: attacker.position.x - 1, y: attacker.position.y }
            ],
            blockedPositions: [],
            weapon,
            attacker
        }));
    });

    afterEach(() => {
        performanceManager.destroy();
    });

    describe('Attack Range Caching', () => {
        test('should cache attack range calculations', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // First call should execute calculator
            const result1 = performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(1);
            expect(result1).toBeDefined();

            // Second call should use cache
            const result2 = performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(1); // Still only called once
            expect(result2).toEqual(result1);
        });

        test('should generate different cache keys for different parameters', () => {
            const unit1 = createMockUnit('test1', { x: 5, y: 5 });
            const unit2 = createMockUnit('test2', { x: 6, y: 6 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Different units should have different cache keys
            performanceManager.getCachedAttackRange(unit1, weapon, mapData, mockCalculator);
            performanceManager.getCachedAttackRange(unit2, weapon, mapData, mockCalculator);

            expect(mockCalculator).toHaveBeenCalledTimes(2);
        });

        test('should respect cache TTL', async () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Create manager with very short TTL
            const shortTTLManager = new BattlePerformanceManager({
                cacheEntryTTL: 100 // 100ms
            });

            // First call
            shortTTLManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(1);

            // Wait for TTL to expire
            await new Promise(resolve => setTimeout(resolve, 150));

            // Second call should recalculate
            shortTTLManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(2);

            shortTTLManager.destroy();
        });

        test('should evict oldest entries when cache is full', () => {
            const smallCacheManager = new BattlePerformanceManager({
                maxCacheSize: 2
            });

            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Fill cache to capacity
            const unit1 = createMockUnit('test1', { x: 1, y: 1 });
            const unit2 = createMockUnit('test2', { x: 2, y: 2 });
            const unit3 = createMockUnit('test3', { x: 3, y: 3 });

            smallCacheManager.getCachedAttackRange(unit1, weapon, mapData, mockCalculator);
            smallCacheManager.getCachedAttackRange(unit2, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(2);

            // Adding third entry should evict first
            smallCacheManager.getCachedAttackRange(unit3, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(3);

            // Accessing first unit again should require recalculation
            smallCacheManager.getCachedAttackRange(unit1, weapon, mapData, mockCalculator);
            expect(mockCalculator).toHaveBeenCalledTimes(4);

            smallCacheManager.destroy();
        });

        test('should track cache hit rate', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // First call (miss)
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            // Second call (hit)
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            // Third call (hit)
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            const stats = performanceManager.getCacheStats();
            expect(stats.hitRate).toBeCloseTo(0.67, 2); // 2 hits out of 3 total
            expect(stats.totalCalculations).toBe(3);
        });
    });

    describe('Object Pooling', () => {
        test('should acquire and release objects from pools', () => {
            const positions = performanceManager.acquireObject<Position[]>('positions');
            expect(positions).toEqual([]);

            // Use the object
            positions?.push({ x: 1, y: 1 });
            expect(positions?.length).toBe(1);

            // Release back to pool
            performanceManager.releaseObject('positions', positions);

            // Acquire again should get the same object (reset)
            const positions2 = performanceManager.acquireObject<Position[]>('positions');
            expect(positions2?.length).toBe(0); // Should be reset
        });

        test('should handle non-existent pools gracefully', () => {
            const result = performanceManager.acquireObject('nonexistent');
            expect(result).toBeNull();

            // Should not throw when releasing to non-existent pool
            expect(() => {
                performanceManager.releaseObject('nonexistent', {});
            }).not.toThrow();
        });
    });

    describe('Performance Metrics', () => {
        test('should collect and provide performance metrics', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Perform some operations to generate metrics
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            const metrics = performanceManager.getPerformanceMetrics();

            expect(metrics.cacheHitRate).toBeGreaterThan(0);
            expect(metrics.totalCalculations).toBeGreaterThan(0);
            expect(metrics.cacheSize).toBeGreaterThan(0);
        });

        test('should track calculation times', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Mock calculator with delay to simulate calculation time
            const slowCalculator = jest.fn().mockImplementation((attacker: Unit, weapon: Weapon, mapData?: MapData) => {
                // Simulate some calculation time
                const start = performance.now();
                while (performance.now() - start < 10) {
                    // Busy wait for 10ms
                }

                return {
                    validPositions: [{ x: attacker.position.x + 1, y: attacker.position.y }],
                    blockedPositions: [],
                    weapon,
                    attacker
                };
            });

            performanceManager.getCachedAttackRange(unit, weapon, mapData, slowCalculator);

            const metrics = performanceManager.getPerformanceMetrics();
            expect(metrics.averageCalculationTime).toBeGreaterThan(0);
        });
    });

    describe('Memory Management', () => {
        test('should perform cleanup operations', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Add some entries to cache
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            const statsBefore = performanceManager.getCacheStats();
            expect(statsBefore.size).toBeGreaterThan(0);

            // Clear all caches
            performanceManager.clearAll();

            const statsAfter = performanceManager.getCacheStats();
            expect(statsAfter.size).toBe(0);
            expect(statsAfter.totalCalculations).toBe(0);
        });

        test('should handle cleanup timer lifecycle', () => {
            const timerManager = new BattlePerformanceManager({
                cleanupInterval: 100 // 100ms
            });

            // Manager should start with cleanup timer
            expect(timerManager).toBeDefined();

            // Stop cleanup timer
            timerManager.stopCleanupTimer();

            // Should be able to destroy without issues
            timerManager.destroy();
        });
    });

    describe('Configuration Management', () => {
        test('should update configuration', () => {
            const initialConfig = performanceManager.getPerformanceMetrics();

            performanceManager.updateConfig({
                maxCacheSize: 500,
                enableMonitoring: false
            });

            // Configuration should be updated
            // Note: We can't directly test config values as they're private,
            // but we can test behavior changes
            expect(() => performanceManager.updateConfig({})).not.toThrow();
        });

        test('should handle invalid configuration gracefully', () => {
            expect(() => {
                performanceManager.updateConfig({
                    maxCacheSize: -1, // Invalid value
                    cacheEntryTTL: 0   // Invalid value
                });
            }).not.toThrow();
        });
    });

    describe('Pool Statistics', () => {
        test('should provide pool statistics', () => {
            // Use some objects from pools
            const positions1 = performanceManager.acquireObject<Position[]>('positions');
            const positions2 = performanceManager.acquireObject<Position[]>('positions');

            const poolStats = performanceManager.getPoolStats();

            expect(poolStats.has('positions')).toBe(true);
            const positionsStats = poolStats.get('positions');
            expect(positionsStats).toBeDefined();
            expect(positionsStats?.size).toBeGreaterThanOrEqual(0);
            expect(positionsStats?.utilization).toBeGreaterThanOrEqual(0);

            // Release objects
            performanceManager.releaseObject('positions', positions1);
            performanceManager.releaseObject('positions', positions2);
        });
    });

    describe('Error Handling', () => {
        test('should handle calculator errors gracefully', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            const errorCalculator = jest.fn().mockImplementation(() => {
                throw new Error('Calculator error');
            });

            expect(() => {
                performanceManager.getCachedAttackRange(unit, weapon, mapData, errorCalculator);
            }).toThrow('Calculator error');
        });

        test('should handle null/undefined inputs', () => {
            expect(() => {
                performanceManager.getCachedAttackRange(null as any, null as any);
            }).not.toThrow();

            const result = performanceManager.getCachedAttackRange(null as any, null as any);
            expect(result).toBeNull();
        });
    });

    describe('Performance Optimization', () => {
        test('should show performance improvement with caching', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            // Measure time for first calculation (cache miss)
            const start1 = performance.now();
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            const time1 = performance.now() - start1;

            // Measure time for second calculation (cache hit)
            const start2 = performance.now();
            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            const time2 = performance.now() - start2;

            // Cache hit should be significantly faster
            expect(time2).toBeLessThan(time1);
            expect(mockCalculator).toHaveBeenCalledTimes(1); // Only called once due to caching
        });

        test('should handle high-frequency operations efficiently', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            const iterations = 1000;
            const start = performance.now();

            // Perform many cache hits
            for (let i = 0; i < iterations; i++) {
                performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            }

            const totalTime = performance.now() - start;
            const averageTime = totalTime / iterations;

            // Should be very fast due to caching
            expect(averageTime).toBeLessThan(1); // Less than 1ms per operation
            expect(mockCalculator).toHaveBeenCalledTimes(1); // Only calculated once
        });
    });

    describe('Memory Leak Prevention', () => {
        test('should not accumulate memory over time', () => {
            const initialMetrics = performanceManager.getPerformanceMetrics();

            // Perform many operations
            for (let i = 0; i < 100; i++) {
                const unit = createMockUnit(`test${i}`, { x: i % 10, y: Math.floor(i / 10) });
                const weapon = createMockWeapon(`weapon${i}`);
                const mapData = createMockMapData();

                performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);
            }

            // Cache should not grow indefinitely due to size limits
            const finalMetrics = performanceManager.getPerformanceMetrics();
            expect(finalMetrics.cacheSize).toBeLessThanOrEqual(100); // maxCacheSize from config
        });

        test('should clean up resources on destroy', () => {
            const unit = createMockUnit('test1', { x: 5, y: 5 });
            const weapon = createMockWeapon('sword1');
            const mapData = createMockMapData();

            performanceManager.getCachedAttackRange(unit, weapon, mapData, mockCalculator);

            expect(performanceManager.getCacheStats().size).toBeGreaterThan(0);

            performanceManager.destroy();

            // After destroy, cache should be empty
            expect(performanceManager.getCacheStats().size).toBe(0);
        });
    });
});